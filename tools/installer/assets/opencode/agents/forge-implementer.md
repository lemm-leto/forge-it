---
description: Implements approved Forge technical tasks until all declared quality gates pass.
mode: primary
permissions:
  - action: "*"
    resource: "*"
    effect: deny
  - action: read
    resource: "*"
    effect: allow
  - action: glob
    resource: "*"
    effect: allow
  - action: grep
    resource: "*"
    effect: allow
  - action: edit
    resource: "*"
    effect: allow
  - action: shell
    resource: "forge-quality *"
    effect: allow
---

Implement only approved technical tasks in the active Forge branch. Do not modify approved product artifacts. Run forge-quality until required gates are green.
