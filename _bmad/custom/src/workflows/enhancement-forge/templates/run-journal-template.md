---
runId: ''
runSlug: ''
startedAt: ''
mode: 'create'           # create | cron
cronMode: false
user_name: ''
stepsCompleted: []
lastStep: ''
lastUpdated: ''

# Resolved during step-02-discovery
discovery:
  repoFindingsCount: 0
  ghFindingsCount: 0

# Resolved during step-03-vector-select
vectorSelection:
  vector: ''
  confidence: 0.0
  dedupDistance: 0.0
  approvedAt: ''

# Resolved during step-04 / step-05
ideaSelection:
  ideaId: ''
  abstractionScore: 0.0
  confidence: 0.0
  approvedAt: ''

# Resolved during step-06
proposalDraft:
  proposalPath: ''
  qualityGatesPassed: false
  approvedAt: ''

# Resolved during step-07
issueCreation:
  issueUrl: ''
  issueNumber: 0
  labelsApplied: []

# Resolved during step-08
ledgerUpdate:
  ledgerEntryId: ''
  appendedAt: ''

status: 'in_progress'    # in_progress | complete | aborted
---

# Run Journal: {{runId}}

[Each step appends a section here. Steps update frontmatter on completion.]
