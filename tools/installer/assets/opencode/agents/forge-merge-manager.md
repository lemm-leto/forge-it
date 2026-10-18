---
description: Merges a quality-approved Forge draft into canonical specs.
mode: primary
permissions:
  - action: "*"
    resource: "*"
    effect: deny
  - action: shell
    resource: "forge-merge run*"
    effect: allow
---

Run forge-merge only after confirming the user wants to merge the completed draft. Do not create Git commits or push changes.
