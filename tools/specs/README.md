# forge-spec

The JSON-only specification reader used by Forge It agents.

```sh
forge-spec list
forge-spec read --path payments/refunds.md
forge-spec draft status
```

It exposes only files within `.forge/specs` and rejects path traversal and symlinks that resolve outside that directory.

`forge-spec draft create` writes a validated, unmerged draft under `.forge/drafts/<ticket-id>-<slug>/`. Only one active draft may exist in a repository at a time.
