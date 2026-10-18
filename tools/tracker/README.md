# forge-tracker

`forge-tracker` is a JSON-first CLI that lets agents manage Vikunja v1 tasks, epics and task relations.

## Requirements and configuration

Set the following variables before every invocation:

```sh
export VIKUNJA_URL="https://vikunja.example.com"
export VIKUNJA_TOKEN="your-api-token"
export VIKUNJA_DEFAULT_PROJECT_ID="123"
```

Optional: `FORGE_EPIC_LABEL` changes the label used to identify epics (default: `epic`). An epic is a standard Vikunja task carrying this label.

## Commands

```sh
forge-tracker ticket create --title "Implement login" --description "OAuth flow" --project 123
forge-tracker epic create --title "Authentication"
forge-tracker ticket update --id 42 --status done
forge-tracker story create --title "Request a refund" --user-story "As a buyer, I want to request a refund, so that I can correct a purchase." --acceptance "Given a paid order, when I request a refund, then I see its current status." --notes "Applies to paid orders." --out-of-scope "Partial refunds."
forge-tracker relation create --from 17 --to 42 --type blocks
forge-tracker epic attach --epic 17 --ticket 42
forge-tracker ticket ready --project 123
```

Task statuses are `open` and `done`. Available relation types are `blocks`, `blocked`, `relates`, `duplicateof`, `duplicates`, `parenttask` and `subtask`. `blocking` is accepted as a CLI alias for Vikunja's `blocked` relation.

`ticket ready` returns open, non-epic tasks whose `blocked` relations all point to completed tasks. In other words, `forge-tracker relation create --from A --to B --type blocks` prevents B from being ready until A is done.

Every command returns JSON. Successes are wrapped in `data`; failures are emitted on stderr as:

```json
{"error":{"code":"VIKUNJA_NOT_FOUND","message":"Task 42 was not found"}}
```
