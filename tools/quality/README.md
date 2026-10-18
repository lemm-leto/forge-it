# forge-quality

Discovers package-script quality checks and runs only approved declarative gates from the active draft.

```sh
forge-quality discover
forge-quality gates init
forge-quality gates add --id integration-tests --manager npm --script test:integration
forge-quality run
```
