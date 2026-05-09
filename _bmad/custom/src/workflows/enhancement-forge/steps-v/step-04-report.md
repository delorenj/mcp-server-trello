---
name: 'step-04-report'
description: 'Render a validation report to disk and print summary; for workflow-target validation, also runs the workflow-definition audit inline'

# No nextStepFile - terminal in validate mode
reportsFolder: '{project-root}/_bmad-output/enhancement-forge/validation-reports'
workflowFile: '../workflow.md'
ledgerSchemaFile: '../data/ledger-schema.yaml'
proposalTemplate: '../templates/proposal-template.md'
---

# Validate Step 4: Render Report (Final in Validate Mode)

## STEP GOAL:

Render a structured validation report to disk and print a summary. For workflow-target validation, run the lightweight workflow-definition audit inline before rendering.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:
- 🛑 NEVER mutate any audited artifact
- 📖 CRITICAL: Read complete step file before action

### Step-Specific Rules:
- 🎯 The report is the only artifact this step writes
- 🛡️ Atomic write: temp file + rename
- 💬 Terminal step in validate mode

## MANDATORY SEQUENCE

### 1. Determine Branch

From step-01 cache: target was `R` (run), `L` (ledger), or `W` (workflow).

### 2. If Branch W: Run Workflow-Definition Audit Inline

For each step file in `steps-c/`, `steps-e/`, `steps-v/`:
- Frontmatter parses
- All `nextStepFile` references resolve
- All `{variable}` references in body have a frontmatter declaration
- Each step file under `Step Size Guidelines` max (250 lines)

For data files:
- `data/sub-agents/*.md` exist for: scanner, vector-selector, idea-selector, proposal-writer, pm
- `data/ledger-schema.yaml` parses, has `entry_schema` and `example_entry`
- `data/anti-patterns.md`, `data/party-mode-seed.md`, `data/label-conventions.md` exist
- `templates/run-journal-template.md` and `templates/proposal-template.md` parse

For workflow.md:
- Mode-routing dispatch covers create, edit, validate, cron
- Persona section present
- Initialization sequence loads config and routes

Cache findings into a `workflow_audit` block.

### 3. Compose Report

Pull cached findings from earlier validate steps (run / ledger / workflow). Build markdown:

```markdown
---
generatedAt: <ISO 8601>
target: <run|ledger|workflow>
targetIdentifier: <runSlug | "ledger" | "workflow">
overallStatus: <PASS | CONCERNS | FAIL>
---

# Validation Report: {targetIdentifier}

## Summary
- Status: {PASS|CONCERNS|FAIL}
- Critical failures: {count}
- Warnings: {count}

## Findings

### {section per finding category}

{detail bullets}

## Recommendations

{ordered list of remediation actions, sorted by severity}

## Appendix: Raw Findings

{cached JSON in fenced block}
```

### 4. Atomic Write

Write to `{reportsFolder}/{ISO-timestamp}-{target}-{identifier}.md`. Use temp + rename.

### 5. Print Summary

```
✅ Validation complete.

Target:           {target} / {identifier}
Overall:          {PASS|CONCERNS|FAIL}
Critical:         {n}
Warnings:         {n}
Report:           {reportPath}

Top recommendations:
1. {top item}
2. ...
```

### 6. Halt

Terminal step. No `nextStepFile`.

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:
- Report rendered with all required sections
- Atomic write succeeded
- Summary printed with overall status and top recommendations

### ❌ SYSTEM FAILURE:
- Mutating audited artifacts
- Non-atomic write
- Missing workflow-definition audit when target=W

**Master Rule:** A report you can act on is the deliverable. Generic reports are noise.
