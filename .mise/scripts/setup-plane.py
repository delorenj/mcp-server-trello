#!/usr/bin/env python3
"""Creates a Plane project in the 33god workspace and writes .plane.json"""
import json
import os
import re
import sys
import urllib.request
import urllib.error

DATA_FILE = ".project.json"
PLANE_API = "https://plane.delo.sh/api/v1"
WORKSPACE = "33god"


def write_plane_json(workspace, project_id, identifier):
    with open(".plane.json", "w") as f:
        json.dump(
            {"workspace": workspace, "project_id": project_id, "project_identifier": identifier},
            f,
            indent=2,
        )
        f.write("\n")


def find_existing_project(name, api_key):
    """Fetch projects from workspace and return the one matching name."""
    req = urllib.request.Request(
        f"{PLANE_API}/workspaces/{WORKSPACE}/projects/",
        headers={"X-API-Key": api_key, "Content-Type": "application/json", "User-Agent": "CommonProject/1.0", "Accept": "application/json"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            projects = json.loads(resp.read())
            if isinstance(projects, dict):
                projects = projects.get("results", [])
            for p in projects:
                if p.get("name") == name:
                    return {"id": p["id"], "identifier": p["identifier"]}
    except Exception as e:
        print(f"  Failed to list projects: {e}")
    return None


def main():
    with open(DATA_FILE) as f:
        data = json.load(f)

    name = data["project_name"]
    desc = data.get("project_description", "")

    # Derive identifier: first 4 alphanumeric chars, uppercased
    identifier = re.sub(r"[^A-Za-z0-9]", "", name)[:4].upper()
    if len(identifier) < 2:
        identifier += "XX"

    api_key = os.environ.get("PLANE_33GOD_API_KEY", "")
    if not api_key:
        print("WARNING: PLANE_33GOD_API_KEY not set. Writing placeholder .plane.json")
        print("  Set the key and re-run: mise run setup")
        write_plane_json(WORKSPACE, "PLACEHOLDER", identifier)
        return

    payload = json.dumps({"name": name, "description": desc, "identifier": identifier, "network": 2}).encode()

    req = urllib.request.Request(
        f"{PLANE_API}/workspaces/{WORKSPACE}/projects/",
        data=payload,
        headers={"X-API-Key": api_key, "Content-Type": "application/json", "User-Agent": "CommonProject/1.0", "Accept": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = json.loads(resp.read())
            project_id = body.get("id", "PLACEHOLDER")
            actual_ident = body.get("identifier", identifier)
            write_plane_json(WORKSPACE, project_id, actual_ident)
            print(f"Plane project created: {actual_ident} ({project_id})")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print(f"Project '{name}' already exists in Plane. Fetching existing project...")
            existing = find_existing_project(name, api_key)
            if existing:
                write_plane_json(WORKSPACE, existing["id"], existing["identifier"])
                print(f"Plane project found: {existing['identifier']} ({existing['id']})")
            else:
                print("WARNING: Could not find existing project. Writing placeholder .plane.json")
                write_plane_json(WORKSPACE, "PLACEHOLDER", identifier)
        else:
            print(f"WARNING: Plane API returned {e.code}. Writing placeholder .plane.json")
            try:
                print(f"  Response: {e.read().decode()}")
            except Exception:
                pass
            write_plane_json(WORKSPACE, "PLACEHOLDER", identifier)
    except Exception as e:
        print(f"WARNING: Plane API request failed: {e}. Writing placeholder .plane.json")
        write_plane_json(WORKSPACE, "PLACEHOLDER", identifier)


if __name__ == "__main__":
    main()
