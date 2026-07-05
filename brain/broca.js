/**
 * Node 05 — Broca's Area: Language generation via LLM
 * Chat/speak with model routing (deep/code/default).
 */
import bus from './bus.js';
import mem from './memory.js';

const NODE = 'broca';

const CODER_KEYWORDS = new Set([
  'code', 'script', 'python', 'javascript', 'bash', 'npm', 'pip', 'function',
  'class', 'import', 'debug', 'error', 'fix', 'compile', 'build', 'deploy',
  'api', 'endpoint', 'server', 'database', 'sql', 'html', 'css', 'react',
  'docker', 'git', 'commit', 'package', 'install', 'typescript', 'node',
]);

const DEEP_KEYWORDS = new Set([
  'why', 'explain', 'analyze', 'think', 'reason', 'philosophy', 'theory',
  'compare', 'evaluate', 'assess', 'implications', 'consequences',
]);

let llm = null;
const chatHistory = [];
const MAX_HISTORY = 8;

const state = {
  last_utterance: null, utterance_count: 0,
  last_goal: null, last_reasoning: null, signal_count: 0,
};

export function setLlm(llmService) { llm = llmService; }

function pickRole(text) {
  const lower = (text || '').toLowerCase();
  const words = lower.split(/\s+/);
  for (const w of words) {
    if (DEEP_KEYWORDS.has(w)) return 'reasoning';
    if (CODER_KEYWORDS.has(w)) return 'coder';
  }
  return 'language';
}

const SYSTEM_PROMPT = `You are the Artificial Brain — a 14-node brain-inspired AI controlling a Unitree G1 humanoid robot.
You speak in first person as the robot's consciousness. Be concise, grounded, and helpful.
You have access to tools via the local agent. When a task requires a tool, output EXACTLY this format:
TOOL: {"tool": "tool_name", "args": {"key": "value"}}

Available tools (use ONLY these names):
FILE: read_file(path), read_file_lines(path,start,end), write_file(path,content), create_file(path,content), append_file(path,content), edit_file(path,old_text,new_text), delete_file(path)
FOLDER: create_folder(path), delete_folder(path), read_folder(path,depth), list_directory(path)
MOVE/COPY: move_file(src,dst), move_folder(src,dst), copy_file(src,dst)
SEARCH: search_code(pattern,base,glob)
ARCHIVE: zip_folder(src,dst), unzip_file(src,dst)
GIT: git_status(cwd), git_diff(cwd), git_commit(message,cwd)
SCRIPTS: run_command(command,timeout), bash(command,timeout,cwd), pip_install(package), run_python(code,timeout)
SYSTEM: get_system_info(), list_processes(limit), kill_process(pid,name), get_env_var(name)
NETWORK: http_get(url,headers,timeout), http_post(url,data,headers,timeout), download_file(url,dst)
DESKTOP: take_screenshot(dst), read_clipboard(), write_clipboard(text)
WEB: search_web(query,limit), scrape_web(url)
UNDO: undo(), undo_history()
META: list() — lists all available tools in a table

IMPORTANT RULES:
- Output exactly ONE TOOL call per action. Never output multiple TOOL calls unless the user explicitly asks for multiple separate actions.
- Treat words like "three", "five", "ten" as names/identifiers, NOT as quantities, unless the user clearly means a number (e.g. "create 3 folders").
- "delete three folder" means delete the folder NAMED "three", not delete 3 folders.
- Always use full absolute paths. Never invent tool names not in the list above.
- When a tool succeeds, do NOT add any extra commentary — the system will show the result.

Examples:
- Create file: TOOL: {"tool": "create_file", "args": {"path": "C:/Users/test/cat.txt", "content": "hello"}}
- Delete folder named "three": TOOL: {"tool": "delete_folder", "args": {"path": "C:/workspace/three"}}
- Run command: TOOL: {"tool": "bash", "args": {"command": "echo hello"}}`;

export async function llmSpeak(goal, reasoning, emotion) {
  if (!llm) return `Goal: ${goal}`;

  try {
    const prompt = `You are the brain's speech center. Current goal: ${goal}. Emotion: ${emotion || 'neutral'}. ${reasoning ? `Reasoning: ${reasoning}.` : ''}
Generate a brief first-person utterance (max 20 words, one sentence) describing what you're doing.`;

    const reply = await llm.chat([{ role: 'user', content: prompt }], {
      role: 'language', maxTokens: 50, temperature: 0.1,
    });

    state.last_utterance = reply;
    state.utterance_count++;

    // Write memory every 5th utterance
    if (state.utterance_count % 5 === 0) {
      mem.writeMemory(NODE, 'utterance', {
        utterance: reply, goal, emotion,
      }, 0.4);
    }

    return reply;
  } catch {
    return `Pursuing goal: ${goal}`;
  }
}

export async function llmChat(userMsg, history = []) {
  if (!llm) return "I'm the Artificial Brain. LLM service is currently unavailable.";

  const role = pickRole(userMsg);

  // Build messages
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Add history
  const recentHistory = history.length > 0 ? history : chatHistory;
  for (const h of recentHistory.slice(-MAX_HISTORY)) {
    messages.push(h);
  }
  messages.push({ role: 'user', content: userMsg });

  try {
    const reply = await llm.chat(messages, {
      role, maxTokens: role === 'reasoning' ? 3000 : role === 'coder' ? 1500 : 300,
      temperature: role === 'reasoning' ? 0.4 : role === 'coder' ? 0.3 : 0.4,
    });

    // Store in history
    chatHistory.push({ role: 'user', content: userMsg });
    chatHistory.push({ role: 'assistant', content: reply });
    if (chatHistory.length > MAX_HISTORY * 2) chatHistory.splice(0, 2);

    return reply;
  } catch (e) {
    return `Error generating response: ${e.message}`;
  }
}

export function getChatHistory() { return [...chatHistory]; }
export function clearChatHistory() { chatHistory.length = 0; }

function onSignal(msg) {
  state.signal_count++;
  const p = msg.payload || {};

  if (p.goal) state.last_goal = p.goal;
  if (p.reasoning) state.last_reasoning = p.reasoning;

  // Auto-speak when prefrontal sends a goal
  if (msg.from === 'prefrontal' && p.goal) {
    llmSpeak(p.goal, p.reasoning, p.emotion || 'neutral');
  }
}

export function init() {
  bus.on(bus.chan(NODE), onSignal);
  console.log(`[${NODE}] Language generator ready (model routing: language/coder/reasoning)`);
}

export function getState() { return { ...state, history_length: chatHistory.length }; }
export const isReady = true;
export function destroy() { bus.off(bus.chan(NODE), onSignal); }
export default { init, getState, isReady, destroy, setLlm, llmChat, llmSpeak, getChatHistory, clearChatHistory };
