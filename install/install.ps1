param(
  [ValidateSet("opencode", "claude-code")]
  [string]$Target
)

if (-not $Target) {
  Write-Host ""
  Write-Host "Which platform should Forge It be installed for?"
  Write-Host ""
  Write-Host "1. OpenCode"
  Write-Host "2. Claude Code"
  Write-Host ""
  $choice = Read-Host "Enter a number"
  if ($choice -eq "1") { $Target = "opencode" }
  elseif ($choice -eq "2") { $Target = "claude-code" }
  else { Write-Error '{"error":{"code":"TARGET_INVALID","message":"Enter 1 for OpenCode or 2 for Claude Code"}}'; exit 1 }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error '{"error":{"code":"NODE_REQUIRED","message":"Node.js 22+ and npm are required"}}'
  exit 1
}

$package = if ($env:FORGE_IT_PACKAGE) { $env:FORGE_IT_PACKAGE } else { "@forge-it/installer" }
npm install --global $package
forge-it install --target $Target
