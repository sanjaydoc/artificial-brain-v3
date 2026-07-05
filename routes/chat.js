// Artificial Brain v3 — Chat routes (main agent loop + tool routing)
import { Router } from 'express';
import os from 'os';
import { sendToolCall } from '../services/agentBridge.js';
import { optionalAuth } from '../middleware/auth.js';
import { detectAgentIntent, generateAgentConfig, createAgentProject } from '../services/agentFromChat.js';

const router = Router();

let broca = null;
let wernicke = null;

export function setBrainModules(modules) {
  broca = modules.broca;
  wernicke = modules.wernicke;
}

// ── Chat history (in-memory) ────────────────────────────────────────────────
const chatHistory = [];
const MAX_HISTORY = 100;

// ── Tool extraction from LLM replies ────────────────────────────────────────
function extractJsonBlock(text, startIdx) {
  // Extract a balanced JSON object starting at startIdx (must point to '{')
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(startIdx, i + 1); }
  }
  return null;
}

function extractToolCalls(reply) {
  const calls = [];
  const marker = /TOOL:\s*/g;
  let match;
  while ((match = marker.exec(reply))) {
    const jsonStart = match.index + match[0].length;
    if (reply[jsonStart] !== '{') continue;
    const block = extractJsonBlock(reply, jsonStart);
    if (!block) continue;
    try {
      const parsed = JSON.parse(block);
      if (parsed.tool) calls.push(parsed);
    } catch {
      // Try sanitizing common LLM quirks
      try {
        const sanitized = block
          .replace(/\\(?!["\\/bfnrt])/g, '\\\\')
          .replace(/\n/g, '\\n');
        const parsed = JSON.parse(sanitized);
        if (parsed.tool) calls.push(parsed);
      } catch {}
    }
  }
  return calls;
}

function stripToolCalls(reply) {
  // Remove all TOOL: {...} blocks (with balanced braces)
  let result = reply;
  const marker = /TOOL:\s*/g;
  let match;
  const ranges = [];
  while ((match = marker.exec(reply))) {
    const jsonStart = match.index + match[0].length;
    if (reply[jsonStart] !== '{') continue;
    const block = extractJsonBlock(reply, jsonStart);
    if (block) ranges.push([match.index, jsonStart + block.length]);
  }
  // Remove ranges in reverse order
  for (let i = ranges.length - 1; i >= 0; i--) {
    result = result.slice(0, ranges[i][0]) + result.slice(ranges[i][1]);
  }
  return result.trim();
}

// ── Conversational guard ────────────────────────────────────────────────────
const CONVERSATIONAL_PATTERNS = /^(hi|hello|hey|yo|sup|good morning|good evening|what'?s? your name|who are you|how are you|thank|thanks|yes|no|ok|okay|sure|bye|goodbye|i am \w+|my name is \w+)$/i;

function isConversational(msg) {
  const words = msg.trim().split(/\s+/);
  return words.length <= 5 && CONVERSATIONAL_PATTERNS.test(msg.trim());
}

// ── Main chat endpoint ──────────────────────────────────────────────────────
router.post('/', optionalAuth, async (req, res) => {
  const { message, token } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  // Store user message
  chatHistory.push({ role: 'user', content: message, ts: Date.now() });
  if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

  try {
    // ── Agent creation intent detection ──────────────────────────────────
    const agentDescription = detectAgentIntent(message);
    if (agentDescription) {
      const config = await generateAgentConfig(agentDescription);

      let createdAgent = null;
      let reply;

      if (req.auth?.userId) {
        createdAgent = await createAgentProject(req.auth.userId, config);
        reply = `I've created a Genesis agent called "${config.name}" and saved it to your account. You can run it now or open it in the Genesis canvas to customize it.`;
      } else {
        reply = `I've designed an agent called "${config.name}" for you. Sign up or log in to save it — it will be automatically saved to your account.\n\nSystem prompt: ${config.systemPrompt}`;
        createdAgent = { preview: true, name: config.name, systemPrompt: config.systemPrompt, role: config.role };
      }

      chatHistory.push({ role: 'assistant', content: reply, ts: Date.now() });
      if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

      return res.json({ ok: true, reply, createdAgent, toolCalls: [], toolResults: [] });
    }

    // Inject working directory context so the LLM uses correct paths
    const workdir = req.app.locals.currentWorkdir || '';
    const homeDir = os.homedir().replace(/\\/g, '/');
    const pathContext = workdir
      ? `\n[CONTEXT: The user's working directory is "${workdir}". Use this as the base path for any file/folder operations unless the user specifies an absolute path.]`
      : `\n[CONTEXT: The user's home directory is "${homeDir}". Use this as the base path for any file/folder operations unless the user specifies an absolute path.]`;
    const enrichedMessage = message + pathContext;

    // Get LLM reply from Broca
    const reply = await broca.llmChat(enrichedMessage);

    // Guard: strip tool calls from conversational messages
    let finalReply = reply;
    const toolCalls = extractToolCalls(reply);

    if (isConversational(message) && toolCalls.length > 0) {
      finalReply = stripToolCalls(reply) || reply;
    }

    // Execute tool calls via agent if connected (deduplicate identical calls)
    const toolResults = [];
    if (!isConversational(message) && toolCalls.length > 0) {
      const seen = new Set();
      const uniqueCalls = toolCalls.filter(tc => {
        const key = JSON.stringify(tc);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      for (const tc of uniqueCalls) {
        const result = await sendToolCall(tc.tool, tc.args || {}, true, token || '');
        toolResults.push({ tool: tc.tool, result });
      }
      // Clean reply text (remove TOOL: blocks)
      finalReply = stripToolCalls(reply) || reply;
      // Build friendly result messages
      if (toolResults.length > 0) {
        const summaries = toolResults.map(tr => {
          const r = tr.result || {};
          const toolName = tr.tool.replace(/_/g, ' ');
          if (r.ok) {
            // Friendly messages per tool type
            if (tr.tool === 'create_folder') return `Folder created successfully at ${r.path || ''}`.trim();
            if (tr.tool === 'create_file' || tr.tool === 'write_file') return `File created successfully at ${r.path || ''} (${r.bytes || 0} bytes)`.trim();
            if (tr.tool === 'delete_file') return `File deleted successfully: ${r.path || ''}`.trim();
            if (tr.tool === 'delete_folder') return `Folder deleted successfully: ${r.path || ''}`.trim();
            if (tr.tool === 'read_file') return `File contents:\n${r.content || ''}`;
            if (tr.tool === 'move_file' || tr.tool === 'move_folder') return `Moved ${r.src || ''} to ${r.dst || ''}`.trim();
            if (tr.tool === 'copy_file') return `Copied ${r.src || ''} to ${r.dst || ''}`.trim();
            if (tr.tool === 'append_file') return `Appended ${r.appended_bytes || 0} bytes to ${r.path || ''}`.trim();
            if (tr.tool === 'edit_file') return `File edited successfully: ${r.path || ''}`.trim();
            if (tr.tool === 'list_directory' || tr.tool === 'read_folder') {
              const entries = (r.entries || []).slice(0, 20).map(e => `  ${e.type === 'dir' ? '📁' : '📄'} ${e.name || e.path}`).join('\n');
              return `${r.path || ''} (${r.count || 0} items):\n${entries}`;
            }
            if (tr.tool === 'bash' || tr.tool === 'run_command') return r.stdout || 'Command executed successfully';
            if (tr.tool === 'git_status' || tr.tool === 'git_diff') return r.stdout || 'No output';
            if (tr.tool === 'git_commit') return r.commit || 'Committed';
            if (tr.tool === 'search_code') return `Found ${r.count || 0} matches:\n${(r.matches || []).slice(0, 10).map(m => `  ${m.file}:${m.line} — ${m.content}`).join('\n')}`;
            if (tr.tool === 'search_web') return `Search results:\n${(r.results || []).map(s => `  ${s.title} — ${s.url}`).join('\n')}`;
            if (tr.tool === 'get_system_info') return `OS: ${r.os}, CPU: ${r.cpu_model} (${r.cpu_count} cores), RAM: ${r.ram_used_mb}/${r.ram_total_mb} MB (${r.ram_percent}%)`;
            if (tr.tool === 'take_screenshot') return `Screenshot saved to ${r.path || ''}`;
            if (tr.tool === 'download_file') return `Downloaded ${r.bytes || 0} bytes to ${r.path || ''}`;
            if (tr.tool === 'list') return r.table || 'Tool list unavailable';
            return `${toolName} completed successfully`;
          }
          return `Failed to ${toolName}: ${r.error || 'unknown error'}`;
        });
        finalReply = summaries.join('\n\n');
      }
    }

    // Store assistant reply
    chatHistory.push({ role: 'assistant', content: finalReply, ts: Date.now() });
    if (chatHistory.length > MAX_HISTORY) chatHistory.shift();

    res.json({
      ok: true,
      reply: finalReply,
      toolCalls: isConversational(message) ? [] : toolCalls,
      toolResults,
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

router.get('/history', (req, res) => {
  res.json({ messages: chatHistory, count: chatHistory.length });
});

router.delete('/history', (req, res) => {
  chatHistory.length = 0;
  if (broca) broca.clearChatHistory();
  res.json({ ok: true });
});

// ── Input parsing via Wernicke ──────────────────────────────────────────────
router.post('/input', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const result = await wernicke.parse(text);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

export default router;
