# forge-it

Installs the Forge It business analyst for exactly one target harness.

```sh
forge-it install --target opencode
forge-it install --target claude-code
```

Both variants install the `forge-spec`, `forge-tracker`, `forge-design`, `forge-prototype` and `forge-architecture` CLIs. They provide `/forge:analyze` for feature-request analysis, `/forge:propose` for ticket-to-draft specification work, `/forge:design` for design/prototype approval, and `/forge:architect` for technical planning without tracker-ticket creation.
