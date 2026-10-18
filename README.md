# forge-it

Portable, guarded delivery workflows for OpenCode and Claude Code. Forge It turns an existing Vikunja ticket into an approved specification, design, technical plan, tests, implementation, canonical specs and a Git commit.

## Tools

- `forge-tracker` — JSON-first Vikunja tickets, epics, relations and ready-ticket selection.
- `forge-spec` — safe access to canonical specs and active draft lifecycle.
- `forge-design` — validated product-design artifacts.
- `forge-prototype` — self-contained local HTML prototypes.
- `forge-architecture` — technical plans and implementation-task breakdowns.
- `forge-testing` — test-plan and red/green baseline state.
- `forge-quality` — declarative, extensible quality gates.
- `forge-pipeline` — per-ticket Git branch setup.
- `forge-merge` — canonical spec merge and draft archival.
- `forge-it` — installer for one selected coding harness.

See [AGENT_WORKFLOW.md](./AGENT_WORKFLOW.md) for the complete workflow.

## Install Forge It

After publishing this repository, install Forge It in another repository with:

```sh
curl -fsSL https://raw.githubusercontent.com/<owner>/forge-it/main/install/install.sh | sh
```

The installer asks in English whether to configure OpenCode or Claude Code, then installs only that adapter plus the Forge CLI packages.

For automation:

```sh
curl -fsSL https://raw.githubusercontent.com/<owner>/forge-it/main/install/install.sh \
  | sh -s -- --target opencode
```

Supported targets are `opencode` and `claude-code`.

Set Vikunja credentials before ticket work:

```sh
export VIKUNJA_URL="https://vikunja.example.com"
export VIKUNJA_TOKEN="..."
export VIKUNJA_DEFAULT_PROJECT_ID="123"
```

## Workflow

### Business analysis

```text
/forge:analyze <feature request>
```

Creates business stories and, when needed, an epic. This is separate from delivery work.

### Delivery from an existing ticket

```text
/forge:ship [ticket-id]
```

Without a ticket ID, Forge It lists ready-for-development Vikunja tickets and asks the user to choose one.

The intended sequence is:

```text
forge:propose
  → requirements-only draft specification

forge:design
  → product design and optional prototype

forge:architect
  → technical plan and implementation-task breakdown

forge:test
  → test plan, quality gates and failing tests

forge:implement
  → implementation until quality gates are green

forge-quality run
  → all declared quality gates

forge:merge
  → canonical specs and archived draft

git commit
  → atomic feature commit; push is never automatic
```

Delivery stages require a Git repository. Forge creates or switches to a branch named `forge/<ticket-id>-<slug>` and refuses to start from a dirty working tree.

## Drafts and guardrails

One active draft is allowed at a time:

```text
.forge/drafts/<ticket-id>-<slug>/
  spec.md
  design/
  architecture/
  testing/
  quality/
```

An unmerged draft blocks a new delivery pipeline. Product-facing agents cannot read code or edit arbitrary files. Architecture, test and implementation stages receive progressively broader, stage-specific permissions. Quality gates are declared in `testing/quality-gates.yaml`; `forge-quality` runs only validated package-script gates.

## Development

```sh
npm install --legacy-peer-deps
npm run typecheck
npm test
npm run build
```
