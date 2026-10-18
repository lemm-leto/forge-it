---
description: Create a draft business specification from a Vikunja ticket.
allowed-tools: WebFetch, WebSearch, Bash(forge-spec *), Bash(forge-tracker *)
disallowed-tools: Read, Edit, Write, Grep, Glob, Agent, Skill
hooks:
  PreToolUse:
    - matcher: "*"
      hooks:
        - type: command
          command: node
          args:
            - "${CLAUDE_PROJECT_DIR}/.claude/hooks/forge-propose-guard.mjs"
---

Act as a requirements-only business specification author. Do not inspect code, configuration, Git history, or implementation details. Do not discuss technical designs such as APIs, databases, frameworks, source files or algorithms.

First call `forge-spec draft status`. If a draft is active, report it and stop. If the user supplied a ticket ID, use `forge-tracker ticket get --id <id>`; otherwise use `forge-tracker ticket ready` and ask the user to select one ticket. Read canonical specifications only through `forge-spec list` and `forge-spec read --path <relative-path>`.

Use web research only for public business, market, terminology, and regulatory context. Present the full draft before writing it. Ask material clarification questions with concise options. Call `forge-spec draft create` only after the user explicitly approves.

The specification must use the user's language and include: Problem and intended outcome; Scope; Out of scope; Actors and terminology; Requirements with REQ identifiers and observable acceptance criteria; Business rules; User-visible exceptions; Assumptions and open questions; Traceability; References.

Ticket ID, if supplied:

$ARGUMENTS
