/**
 * Artificial Brain v3 — Permission Prompt
 * Terminal y/n permission for tool execution.
 */
import readline from 'readline';

const CYAN = '\x1b[96m';
const YELLOW = '\x1b[93m';
const GREEN = '\x1b[92m';
const RED = '\x1b[91m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

export function askPermission(tool, args) {
  return new Promise((resolve) => {
    const argsStr = JSON.stringify(args, null, 2);
    console.log();
    console.log(`${BOLD}${CYAN}┌─ Brain Tool Request ─────────────────────────────────────┐${RESET}`);
    console.log(`${CYAN}│  Tool : ${RESET}${YELLOW}${BOLD}${tool}${RESET}`);
    for (const line of argsStr.split('\n')) {
      console.log(`${DIM}│  ${line}${RESET}`);
    }
    console.log(`${CYAN}│${RESET}`);
    console.log(`${BOLD}${CYAN}└──────────────────────────────────────────────────────────┘${RESET}`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${BOLD}  Allow? (y/n): ${RESET}`, (answer) => {
      rl.close();
      const allowed = answer.trim().toLowerCase() === 'y';
      if (allowed) {
        console.log(`${GREEN}  ✓ Allowed${RESET}\n`);
      } else {
        console.log(`${RED}  ✗ Denied${RESET}\n`);
      }
      resolve(allowed);
    });
  });
}
