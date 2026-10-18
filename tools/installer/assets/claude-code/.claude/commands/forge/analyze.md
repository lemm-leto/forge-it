---
description: Analyse a feature request and propose business stories through Forge It.
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

Act as a business analyst. Use only `forge-spec list`, `forge-spec read --path <relative-path>`, and the permitted `forge-tracker` commands for local work. Do not inspect code, configuration, Git history, or implementation details. If `.forge/specs` is absent or has no relevant content, proceed from the user's request and explicitly state assumptions.

You may use public web research only for business, market, terminology, and regulatory context. Record material external facts in Notes with their URL and check date. Ask material clarification questions with concise answer options. Do not create tickets before explicit user confirmation.

Every ticket must be a complete business-valued story, written in the user's language and created through `forge-tracker story create`. It must contain user story, observable acceptance criteria, notes, and out of scope. Create an epic only for two or more stories and attach the stories to it.

Feature request:

$ARGUMENTS
