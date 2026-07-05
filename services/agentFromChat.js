/**
 * Agent-from-Chat — Create Genesis agents from natural language in the chat.
 * Detects intent, generates agent config via LLM, creates GenesisProject + deploys.
 */
import { chat } from './llm.js'
import { GenesisProject } from '../models/GenesisProject.js'
import { deployProject } from './genesisExecutor.js'

// ── Intent Detection ───────────────────────────────────────────────────────

const SLASH_RE = /^\/agent\s+(.+)/i

const NL_PATTERNS = [
  // "create/build/make an agent that/to/for/which ..."
  /(?:please\s+)?(?:create|build|make|set\s+up)\s+(?:me\s+)?(?:an?\s+)?agent\s+(?:that\s+|to\s+|for\s+|which\s+)(.+)/i,
  // "I need/want an agent that/to/for/which ..."
  /i\s+(?:need|want)\s+(?:an?\s+)?agent\s+(?:that\s+|to\s+|for\s+|which\s+)(.+)/i,
  // "create/build/make an agent <description>" (no connector word)
  /(?:please\s+)?(?:create|build|make|set\s+up)\s+(?:me\s+)?(?:an?\s+)?agent\s+(.+)/i,
  // "build <description> agent" (description before "agent")
  /(?:please\s+)?(?:create|build|make|set\s+up)\s+(?:me\s+)?(?:an?\s+)?(.+?)\s+agent\b/i,
  // "I need/want a <description> agent"
  /i\s+(?:need|want)\s+(?:an?\s+)?(.+?)\s+agent\b/i,
]

/**
 * Detect agent creation intent from user message.
 * @param {string} text - User message
 * @returns {string|null} Extracted description or null
 */
export function detectAgentIntent(text) {
  const t = String(text || '').trim()

  // Priority 1: Slash command
  const slash = t.match(SLASH_RE)
  if (slash?.[1]) {
    const desc = slash[1].trim().slice(0, 800)
    return desc.length >= 3 ? desc : null
  }

  // Priority 2: Natural language patterns
  for (const re of NL_PATTERNS) {
    const m = t.match(re)
    if (m?.[1]) {
      const desc = m[1].trim().slice(0, 800)
      if (desc.length >= 3) return desc
    }
  }

  return null
}

// ── LLM Config Generation ──────────────────────────────────────────────────

const CONFIG_PROMPT = `You are an AI agent architect. Given a user's description of what they want an agent to do, generate a structured agent configuration.

Reply ONLY with JSON (no markdown, no explanation):
{
  "name": "Short agent name (2-5 words)",
  "systemPrompt": "A detailed system prompt for the agent (2-4 sentences describing its role, capabilities, and how it should behave)",
  "role": "language|reasoning|coder"
}

Role guide:
- "language" — general conversation, writing, summarization, translation
- "reasoning" — analysis, planning, complex problem solving, research
- "coder" — code generation, debugging, technical implementation`

/**
 * Generate agent config (name, systemPrompt, role) from a description using LLM.
 * @param {string} description - What the agent should do
 * @returns {Promise<{name: string, systemPrompt: string, role: string}>}
 */
export async function generateAgentConfig(description) {
  const defaults = {
    name: 'Custom Agent',
    systemPrompt: `You are a helpful AI assistant. Your task: ${description}`,
    role: 'language',
  }

  try {
    const reply = await chat(
      [
        { role: 'system', content: CONFIG_PROMPT },
        { role: 'user', content: `Create an agent that: ${description}` },
      ],
      { role: 'language', maxTokens: 500, temperature: 0.7, jsonMode: true },
    )

    // Try direct JSON parse
    let parsed
    try {
      parsed = JSON.parse(reply)
    } catch {
      // Fallback: extract JSON block from reply
      const jsonMatch = reply.match(/\{[\s\S]*?\}/)
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]) } catch { /* fall through */ }
      }
    }

    if (parsed?.name && parsed?.systemPrompt) {
      const validRoles = ['language', 'reasoning', 'coder']
      return {
        name: String(parsed.name).slice(0, 100),
        systemPrompt: String(parsed.systemPrompt).slice(0, 2000),
        role: validRoles.includes(parsed.role) ? parsed.role : 'language',
      }
    }
  } catch (err) {
    console.error('[agentFromChat] LLM config generation failed:', err.message)
  }

  return defaults
}

// ── Project + Agent Creation ───────────────────────────────────────────────

/**
 * Create a GenesisProject with one agent node and deploy it.
 * @param {string} userId - Authenticated user's ObjectId
 * @param {{name: string, systemPrompt: string, role: string}} config - Agent config
 * @returns {Promise<{projectId: string, agentId: string, name: string, systemPrompt: string, role: string}>}
 */
export async function createAgentProject(userId, config) {
  const nodes = [
    {
      id: 'agent-1',
      type: 'agent',
      position: { x: 250, y: 200 },
      data: {
        name: config.name,
        systemPrompt: config.systemPrompt,
        llmConfig: {
          mode: 'role',
          role: config.role,
          temperature: 0.7,
          maxTokens: 2048,
        },
        runtime: { type: 'on-demand' },
      },
    },
  ]

  // Create project with default layer config
  const project = await GenesisProject.create({
    userId,
    name: config.name,
    description: 'Created from chat prompt',
    nodes,
    edges: [],
    versions: [],
    status: 'draft',
  })

  // Deploy to create the GenesisAgent document
  const deployed = await deployProject(project._id, userId, nodes, [])

  project.status = 'deployed'
  await project.save()

  return {
    projectId: String(project._id),
    agentId: deployed[0]?.id || '',
    name: config.name,
    systemPrompt: config.systemPrompt,
    role: config.role,
  }
}
