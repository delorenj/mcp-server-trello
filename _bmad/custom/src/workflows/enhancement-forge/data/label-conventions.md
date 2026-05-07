# Enhancement Forge Label Conventions

Single source of truth for the label taxonomy used on GitHub issues created by the forge. The PM sub-agent reads this file to apply labels consistently.

Mirrored from the ledger schema for visibility.

---

## Label Taxonomy

### Always Applied

| Label | Purpose |
|---|---|
| `enhancement` | GitHub-standard enhancement label |
| `forge:auto` | Marks issues created by enhancement-forge (distinct from human-authored) |

### Vector Labels (one per issue)

Format: `vector:{kebab-name}`. Mirrors named vectors in `improvement-vectors.md`.

| Label | Vector |
|---|---|
| `vector:feature-parity` | Feature Parity |
| `vector:ux-ergonomics` | UX/Ergonomics |
| `vector:observability` | Observability |
| `vector:performance` | Performance |
| `vector:documentation` | Documentation |
| `vector:security` | Security |
| `vector:maintainability` | Maintainability |

If a custom vector is added to `improvement-vectors.md`, the PM derives a new label by kebab-casing the vector name. This file should be updated alongside.

### Complexity Labels (one per issue)

Effort-based, not time-based.

| Label | Meaning |
|---|---|
| `complexity:xs` | Single function or doc edit |
| `complexity:s` | Small feature, single module |
| `complexity:m` | Multi-module change, modest design |
| `complexity:l` | Cross-cutting, design-heavy |
| `complexity:xl` | Multi-issue program; should rarely come from forge (boil-the-ocean check) |

### Abstraction Labels (one per issue)

Derived from `abstractionScore` of the selected idea.

| Score Range | Label |
|---|---|
| `abstractionScore >= 0.75` | `abstraction:high` |
| `0.5 <= abstractionScore < 0.75` | `abstraction:med` |
| `abstractionScore < 0.5` | `abstraction:low` |

### Status Labels (lifecycle, mutated by external automation)

| Label | Meaning |
|---|---|
| `forge:status:proposed` | Initial state on issue creation |
| `forge:status:accepted` | Decision-to-implement: true (when human or automation accepts) |
| `forge:status:rejected` | Decision-to-implement: false; ledger entry updated |
| `forge:status:shipped` | Implementation-success: true; PR merged and deployed |
| `forge:status:abandoned` | Aborted post-creation; rare |

The lifecycle labels are NOT applied by the PM at creation (except `forge:status:proposed`). They are added later by automation that watches issue closure and PR merges and updates the ledger's two-axis tracking fields.

---

## Label Application Order (by PM)

1. `enhancement`
2. `forge:auto`
3. `vector:{kebab}`
4. `complexity:{tier}`
5. `abstraction:{level}`
6. `forge:status:proposed`

Total: 6 labels at creation time.

---

## Rules

- 🛑 PM applies ONLY labels in this taxonomy
- 🛑 If a vector's kebab label is missing here, PM returns a `warnings` field and the workflow halts before creation
- 🛡️ Automation that mutates `forge:status:*` labels MUST update the corresponding ledger entry's `decisionToImplement` / `implementationSuccess` fields atomically
