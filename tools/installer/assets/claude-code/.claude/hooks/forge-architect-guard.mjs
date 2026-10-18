import process from "node:process";

const input = JSON.parse(await new Promise((resolve) => { let data = ""; process.stdin.setEncoding("utf8"); process.stdin.on("data", (chunk) => { data += chunk; }); process.stdin.on("end", () => resolve(data)); }));
const tool = input.tool_name;
const path = String(input.tool_input?.file_path ?? input.tool_input?.path ?? "");
const command = String(input.tool_input?.command ?? "").trim();
const sensitive = /(?:^|[\\/])(?:\.env(?:\..*)?|\.git|.*(?:credential|secret|id_rsa).*)(?:[\\/]|$)/i.test(path);
const safeCli = /^(?:forge-spec draft (?:status|read)|forge-design status|forge-architecture (?:status|create-plan|approve-plan|create-tasks|approve-tasks))(?:\s|$)/u.test(command) && !/[;|&`$<>\n]/u.test(command);
const allowed = ["Read", "Grep", "Glob", "WebFetch", "WebSearch", "AskUserQuestion"].includes(tool) && !sensitive || ((tool === "Bash" || tool === "PowerShell") && safeCli);
if (!allowed) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "Forge architect is read-only and may use only approved Forge planning commands." } }));
