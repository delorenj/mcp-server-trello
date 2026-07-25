#!/usr/bin/env python3
"""Emit a local BloodBank-style CloudEvents envelope (provider-agnostic).

Dependency-free. Appends JSONL locally so the sentinel engine records an
event trail even when NATS/BloodBank is offline. Identical envelope shape to the
Hermes gateway; see .scripts/sentinel/docs/bloodbank-events.md.
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import sys
import uuid
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_field(raw: str) -> tuple[str, str]:
    if "=" not in raw:
        raise argparse.ArgumentTypeError("--field values must use key=value")
    key, value = raw.split("=", 1)
    if not key:
        raise argparse.ArgumentTypeError("--field key cannot be empty")
    return key, value


def load_data(args: argparse.Namespace) -> dict:
    data: dict[str, object] = {}
    for key, value in args.field or []:
        data[key] = value
    if args.data_json:
        loaded = json.loads(args.data_json)
        if not isinstance(loaded, dict):
            raise SystemExit("--data-json must be a JSON object")
        data.update(loaded)
    elif not sys.stdin.isatty():
        raw = sys.stdin.read().strip()
        if raw:
            loaded = json.loads(raw)
            if not isinstance(loaded, dict):
                raise SystemExit("stdin JSON must be an object")
            data.update(loaded)
    return data


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("event_type")
    parser.add_argument("--root", default=os.getcwd())
    parser.add_argument("--field", action="append", type=parse_field, default=[])
    parser.add_argument("--data-json")
    parser.add_argument("--source")
    parser.add_argument("--producer", default=os.environ.get("BLOODBANK_PRODUCER", "local-script:sentinel"))
    parser.add_argument("--service", default=os.environ.get("BLOODBANK_SERVICE", "hermes-sentinel"))
    parser.add_argument("--actor-id", default=os.environ.get("BLOODBANK_ACTOR_ID", os.environ.get("USER", "local-agent")))
    parser.add_argument("--actor-cli", default=os.environ.get("BLOODBANK_ACTOR_CLI", "script"))
    parser.add_argument("--correlation-id", default=os.environ.get("BLOODBANK_CORRELATION_ID"))
    parser.add_argument("--causation-id", default=os.environ.get("BLOODBANK_CAUSATION_ID"))
    parser.add_argument("--kind", default="event")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    root = pathlib.Path(args.root).resolve()
    log_path = pathlib.Path(
        os.environ.get(
            "BLOODBANK_EVENTS_LOG",
            root / "_bmad-output" / "implementation-artifacts" / "bloodbank-events.jsonl",
        )
    )
    if not log_path.is_absolute():
        log_path = root / log_path

    source = args.source or "repo://sentinel/bin/emit-event.py"
    event = {
        "specversion": "1.0",
        "type": args.event_type,
        "id": str(uuid.uuid4()),
        "source": source,
        "time": now_iso(),
        "datacontenttype": "application/json",
        "kind": args.kind,
        "producer": args.producer,
        "service": args.service,
        "actor": {"type": "agent", "agent_id": args.actor_id, "cli": args.actor_cli},
        "data": load_data(args),
        "correlation_id": args.correlation_id or str(uuid.uuid4()),
        "causation_id": args.causation_id,
    }

    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, sort_keys=True) + "\n")

    if not args.quiet:
        print(json.dumps(event, indent=2, sort_keys=True))
        print(f"Appended: {log_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
