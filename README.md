# forge-it

Portable tooling for agent workflows. It includes `forge-tracker` for Vikunja, `forge-spec` for safe specification access, and a business analyst agent for OpenCode or Claude Code.

## Tools

- `forge-tracker` — create, update and relate Vikunja tasks; list tasks ready for development.
- `forge-spec` — JSON-only access to `.forge/specs`.
- `forge-it` — installs the business analyst for one selected harness.

See [`tools/tracker/README.md`](./tools/tracker/README.md) for setup and command documentation.

## Install Forge It

After publishing this repository, install the tracker CLI in another repository with:

```sh
curl -fsSL https://raw.githubusercontent.com/<owner>/forge-it/main/install/install.sh | sh
```

The installer asks in English whether to install the OpenCode or Claude Code variant, then installs only that adapter plus the required CLIs. Set `VIKUNJA_URL`, `VIKUNJA_TOKEN` and `VIKUNJA_DEFAULT_PROJECT_ID` before creating tickets.
