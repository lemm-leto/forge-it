import process from "node:process";

const input = JSON.parse(await new Promise((resolve) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => resolve(data));
}));

const tool = input.tool_name;
const command = input.tool_input?.command?.trim() ?? "";
const safeCli = /^(?:forge-spec (?:list|read --path \S+|draft (?:status|read|create))(?:\s|$)|forge-tracker (?:story create|epic create|epic attach|ticket ready|ticket get)(?:\s|$)|forge-design (?:status|create|approve)(?:\s|$)|forge-prototype (?:status|create|approve)(?:\s|$))/u;
const hasShellExpansion = /[;|&`$<>\n]/u.test(command);
const allowed = ["WebFetch", "WebSearch", "AskUserQuestion"].includes(tool)
  || ((tool === "Bash" || tool === "PowerShell") && !hasShellExpansion && safeCli.test(command));

if (!allowed) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Forge business analyst may use only approved Forge CLI commands, web research, and user questions.",
    },
  }));
}
