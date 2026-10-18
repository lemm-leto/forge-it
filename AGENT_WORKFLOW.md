# Current agent workflows

This document describes the current Forge It business-analyst and specification-author workflows.

## 1. Install for one harness

Run the installer in the target repository:

```sh
curl -fsSL https://raw.githubusercontent.com/<owner>/forge-it/main/install/install.sh | sh
```

The installer asks in English which harness to configure:

```text
Which platform should Forge It be installed for?

1. OpenCode
2. Claude Code
```

It installs one selected adapter only, plus these CLI packages:

- `forge-spec` — safe access to product specifications;
- `forge-tracker` — Vikunja ticket management;
- `forge-it` — installer command.

For non-interactive installation, pass the target explicitly:

```sh
curl -fsSL https://raw.githubusercontent.com/<owner>/forge-it/main/install/install.sh \
  | sh -s -- --target opencode
```

Valid values are `opencode` and `claude-code`.

Before creating tickets, configure Vikunja credentials:

```sh
export VIKUNJA_URL="https://vikunja.example.com"
export VIKUNJA_TOKEN="..."
export VIKUNJA_DEFAULT_PROJECT_ID="123"
```

## 2. Start an agent

### Analyse a feature request

In either supported harness, invoke:

```text
/forge:analyze Add self-service refund requests for paid orders
```

The agent acts as a business analyst. It does not design technical implementation and creates tickets only after explicit approval.

### Create a specification draft from a ticket

```text
/forge:propose 42
```

Without a ticket ID, `/forge:propose` gets ready-for-development tickets and asks the user to select one.

## 3. Gather permitted context

The agent first checks local specifications only through the CLI:

```sh
forge-spec list
forge-spec read --path payments/refunds.md
```

`forge-spec` exposes only `.forge/specs/**`. It rejects absolute paths, path traversal and symlinks that resolve outside that directory.

The absence of `.forge/specs`, or the absence of relevant documents, does not block the workflow. In that case the agent relies on the user's request and explicitly records assumptions.

The agent may use web search and web fetch for public business context, market research, terminology and regulatory requirements. It must not use local source code, configuration, Git history, `.env` files or implementation documentation.

## 4. Clarify and propose

The agent analyses the request and specifications, then asks material clarification questions with answer options.

It proposes a decomposition before writing anything to Vikunja. A user must explicitly confirm the proposal before ticket creation starts.

Each proposed story must be a complete business-valued unit and must avoid implementation details such as APIs, databases, frameworks, source files or algorithms.

## 5. Create work items

After confirmation, the agent uses only these creation commands:

```sh
forge-tracker story create \
  --title "Request a refund" \
  --user-story "As a buyer, I want to request a refund, so that I can correct a purchase." \
  --acceptance "Given a paid order, when I request a refund, then I see its current status." \
  --notes "Applies to paid orders." \
  --out-of-scope "Partial refunds."

forge-tracker epic create --title "Refund requests"
forge-tracker epic attach --epic <epic-id> --ticket <story-id>
```

`story create` rejects incomplete work items and always writes this description structure:

```md
## User story

## Acceptance criteria

## Notes

## Out of scope
```

When the approved decomposition contains two or more stories, the agent creates one epic and attaches each created story to it.

## 6. Create a specification draft

The specification author first checks for an active draft:

```sh
forge-spec draft status
```

An active, unmerged draft blocks all new draft work. Otherwise the agent gets a ticket with `forge-tracker ticket get --id <id>`, reads relevant canonical specs, asks questions, presents a complete preview and waits for approval.

After approval, the agent writes the validated requirements-only document through `forge-spec draft create`. It is stored as:

```text
.forge/drafts/<ticket-id>-<slug>/
  manifest.json
  spec.md
```

The future merge workflow will move approved material into `.forge/specs`; it is intentionally not part of the current stage.

## 7. Design and prototype approval

Start the design stage only after a draft specification exists:

```text
/forge:design
```

The design reviewer reads only the active draft through Forge CLI commands. It creates a requirements-aligned product design, asks whether a prototype is needed, and always waits for explicit approval.

```text
.forge/drafts/<ticket-id>-<slug>/
  manifest.json
  spec.md
  design/
    design.md
    prototype/
      index.html
      manifest.json
```

A prototype is expected for a new or changed user-facing screen, form, navigation, visible status or interaction flow. It is a self-contained local HTML file with mock data only: remote resources, network requests and form submissions are rejected.

```sh
forge-design status
forge-design create --content "<design markdown>"
forge-prototype create --html-base64 "<base64 local HTML>"
forge-prototype approve
```

For designs without a prototype, approval uses:

```sh
forge-design approve
```

## 8. Technical architecture and task breakdown

Start the read-only architecture stage only after the specification, product design and required prototype are approved:

```text
/forge:architect
```

The architect may inspect relevant source code, tests and non-sensitive configuration, but it cannot edit code, read `.env` files or credentials, run arbitrary shell commands, or create Vikunja tickets.

It writes only these draft artifacts:

```text
.forge/drafts/<ticket-id>-<slug>/architecture/
  technical-plan.md
  implementation-tasks.md
```

```sh
forge-architecture status
forge-architecture create-plan --content "<technical plan markdown>"
forge-architecture approve-plan
forge-architecture create-tasks --content "<task breakdown markdown>"
forge-architecture approve-tasks
```

The technical task breakdown remains in the draft. It is not copied to Vikunja at this stage.

## 9. Guardrails

### OpenCode

The installed `forge-business-analyst` agent has no direct local read, edit, discovery, Code Mode or arbitrary shell permissions. It can only use the permitted Forge CLI commands, web research and user questions.

### Claude Code

The installed `/forge:propose` command disables standard local filesystem and agent tools. Its scoped `PreToolUse` hook denies every tool call other than web research, user questions and the approved Forge CLI command prefixes.

Both adapters return the agent to the user with a summary of created epics and stories after successful ticket creation.
