/**
 * Genesis Agent Executor — Agentic Loop with Real Tool Execution
 * Runs an agent: builds messages with tool instructions, calls LLM,
 * parses TOOL: markers, checks permissions & guardrails, routes tools
 * through the local agent bridge, feeds results back, and loops.
 */
import { chat } from './llm.js'
import { sendToolCall } from './agentBridge.js'
import { GenesisAgent } from '../models/GenesisAgent.js'
import { GenesisRun } from '../models/GenesisRun.js'
import { GenesisApproval } from '../models/GenesisApproval.js'
import { GenesisProject } from '../models/GenesisProject.js'
import { findRelevant } from './genesisKnowledge.js'
import { GenesisSettings } from '../models/GenesisSettings.js'

// ── Cached global API keys ──────────────────────────────────────────────────
let _globalKeys = {}

export async function loadGlobalKeys(userId) {
  try {
    const doc = await GenesisSettings.findOne({ key: 'api_keys', userId })
    if (doc?.value) _globalKeys = doc.value
  } catch {}
}

export function getGlobalKeys() { return _globalKeys }

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_CONCURRENT = 3
const MAX_TOOL_LOOPS = 10
const APPROVAL_POLL_INTERVAL = 2000
const APPROVAL_TIMEOUT = 120000

// ── In-memory queue for orchestrator priority ───────────────────────────────
const runQueue = []
let running = 0

// ── In-memory rate limiter per agent ────────────────────────────────────────
const rateBuckets = new Map() // agentId → { count, resetAt }

// ── Sensitive tool tiers ────────────────────────────────────────────────────
const DESTRUCTIVE_TOOLS = new Set([
  'delete_file', 'delete_folder', 'kill_process',
  'git_branch', // when deleting
])
const WRITE_TOOLS = new Set([
  'write_file', 'create_file', 'append_file', 'edit_file',
  'move_file', 'move_folder', 'git_commit',
  'insert_rows', 'create_table', 'run_migration',
  'send_email', 'send_slack_message',
  'git_push', 'git_merge', 'cron_schedule',
  'hubspot_api', 'salesforce_api', 'stripe_api', 'quickbooks_api',
  'twilio_sms', 'google_calendar_api',
])
const EXECUTE_TOOLS = new Set([
  'run_command', 'bash', 'run_python', 'pip_install',
  'docker_run', 'docker_build', 'docker_stop',
  'run_tests', 'lint_code', 'format_code', 'check_types',
])

function getSensitivityTier(toolName) {
  if (DESTRUCTIVE_TOOLS.has(toolName)) return 'destructive'
  if (EXECUTE_TOOLS.has(toolName)) return 'execute'
  if (WRITE_TOOLS.has(toolName)) return 'write'
  return 'read'
}

// ── Tool call extraction (balanced-brace JSON parser) ───────────────────────
function extractJsonBlock(text, startIdx) {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) return text.slice(startIdx, i + 1) }
  }
  return null
}

function extractToolCalls(reply) {
  const calls = []
  const marker = /TOOL:\s*/g
  let match
  while ((match = marker.exec(reply))) {
    const jsonStart = match.index + match[0].length
    if (reply[jsonStart] !== '{') continue
    const block = extractJsonBlock(reply, jsonStart)
    if (!block) continue
    try {
      const parsed = JSON.parse(block)
      if (parsed.tool) calls.push(parsed)
    } catch {
      try {
        const sanitized = block
          .replace(/\\(?!["\\/bfnrt])/g, '\\\\')
          .replace(/\n/g, '\\n')
        const parsed = JSON.parse(sanitized)
        if (parsed.tool) calls.push(parsed)
      } catch {}
    }
  }
  return calls
}

function stripToolCalls(reply) {
  let result = reply
  const marker = /TOOL:\s*/g
  let match
  const ranges = []
  while ((match = marker.exec(reply))) {
    const jsonStart = match.index + match[0].length
    if (reply[jsonStart] !== '{') continue
    const block = extractJsonBlock(reply, jsonStart)
    if (block) ranges.push([match.index, jsonStart + block.length])
  }
  for (let i = ranges.length - 1; i >= 0; i--) {
    result = result.slice(0, ranges[i][0]) + result.slice(ranges[i][1])
  }
  return result.trim()
}

// ── Tool system prompt builder ──────────────────────────────────────────────
const TOOL_CATALOG = {
  // File tools
  read_file:       { cat: 'FILE',       sig: 'read_file(path)' },
  read_file_lines: { cat: 'FILE',       sig: 'read_file_lines(path,start,end)' },
  write_file:      { cat: 'FILE',       sig: 'write_file(path,content)' },
  create_file:     { cat: 'FILE',       sig: 'create_file(path,content)' },
  append_file:     { cat: 'FILE',       sig: 'append_file(path,content)' },
  edit_file:       { cat: 'FILE',       sig: 'edit_file(path,old_text,new_text)' },
  delete_file:     { cat: 'FILE',       sig: 'delete_file(path)' },
  // Folder tools
  create_folder:   { cat: 'FOLDER',     sig: 'create_folder(path)' },
  delete_folder:   { cat: 'FOLDER',     sig: 'delete_folder(path)' },
  read_folder:     { cat: 'FOLDER',     sig: 'read_folder(path,depth)' },
  list_directory:  { cat: 'FOLDER',     sig: 'list_directory(path)' },
  // Move/Copy
  move_file:       { cat: 'MOVE/COPY',  sig: 'move_file(src,dst)' },
  move_folder:     { cat: 'MOVE/COPY',  sig: 'move_folder(src,dst)' },
  copy_file:       { cat: 'MOVE/COPY',  sig: 'copy_file(src,dst)' },
  // Search
  search_code:     { cat: 'SEARCH',     sig: 'search_code(pattern,base,glob)' },
  // Archive
  zip_folder:      { cat: 'ARCHIVE',    sig: 'zip_folder(src,dst)' },
  unzip_file:      { cat: 'ARCHIVE',    sig: 'unzip_file(src,dst)' },
  // Git
  git_status:      { cat: 'GIT',        sig: 'git_status(cwd)' },
  git_diff:        { cat: 'GIT',        sig: 'git_diff(cwd)' },
  git_commit:      { cat: 'GIT',        sig: 'git_commit(message,cwd)' },
  git_log:         { cat: 'GIT',        sig: 'git_log(cwd,limit)' },
  git_add:         { cat: 'GIT',        sig: 'git_add(files,cwd)' },
  // Scripts
  run_command:     { cat: 'SCRIPTS',    sig: 'run_command(command,timeout)' },
  bash:            { cat: 'SCRIPTS',    sig: 'bash(command,timeout,cwd)' },
  pip_install:     { cat: 'SCRIPTS',    sig: 'pip_install(package)' },
  run_python:      { cat: 'SCRIPTS',    sig: 'run_python(code,timeout)' },
  // System
  get_system_info: { cat: 'SYSTEM',     sig: 'get_system_info()' },
  list_processes:  { cat: 'SYSTEM',     sig: 'list_processes(limit)' },
  kill_process:    { cat: 'SYSTEM',     sig: 'kill_process(pid,name)' },
  get_env_var:     { cat: 'SYSTEM',     sig: 'get_env_var(name)' },
  // Network
  http_get:        { cat: 'NETWORK',    sig: 'http_get(url,headers,timeout)' },
  http_post:       { cat: 'NETWORK',    sig: 'http_post(url,data,headers,timeout)' },
  download_file:   { cat: 'NETWORK',    sig: 'download_file(url,dst)' },
  // Desktop
  take_screenshot: { cat: 'DESKTOP',    sig: 'take_screenshot(dst)' },
  read_clipboard:  { cat: 'DESKTOP',    sig: 'read_clipboard()' },
  write_clipboard: { cat: 'DESKTOP',    sig: 'write_clipboard(text)' },
  // Web
  search_web:      { cat: 'WEB',        sig: 'search_web(query,limit)' },
  scrape_web:      { cat: 'WEB',        sig: 'scrape_web(url)' },
  // Undo
  undo:            { cat: 'UNDO',       sig: 'undo()' },
  undo_history:    { cat: 'UNDO',       sig: 'undo_history()' },
  // Git Advanced
  git_branch:          { cat: 'GIT+',       sig: 'git_branch(name,delete,cwd)' },
  git_checkout:        { cat: 'GIT+',       sig: 'git_checkout(branch,create,cwd)' },
  git_merge:           { cat: 'GIT+',       sig: 'git_merge(branch,cwd)' },
  git_push:            { cat: 'GIT+',       sig: 'git_push(remote,branch,cwd)' },
  git_pull:            { cat: 'GIT+',       sig: 'git_pull(remote,branch,cwd)' },
  git_clone:           { cat: 'GIT+',       sig: 'git_clone(url,dst,cwd)' },
  // Database
  query_sql:           { cat: 'DATABASE',   sig: 'query_sql(query,database,type)' },
  describe_schema:     { cat: 'DATABASE',   sig: 'describe_schema(database,type)' },
  create_table:        { cat: 'DATABASE',   sig: 'create_table(database,sql,type)' },
  insert_rows:         { cat: 'DATABASE',   sig: 'insert_rows(database,sql,type)' },
  run_migration:       { cat: 'DATABASE',   sig: 'run_migration(database,file,type)' },
  // Browser
  browser_open:        { cat: 'BROWSER',    sig: 'browser_open(url)' },
  browser_click:       { cat: 'BROWSER',    sig: 'browser_click(selector,url)' },
  browser_type_text:   { cat: 'BROWSER',    sig: 'browser_type_text(selector,text,url)' },
  browser_navigate:    { cat: 'BROWSER',    sig: 'browser_navigate(url,action)' },
  browser_extract:     { cat: 'BROWSER',    sig: 'browser_extract(url,selector)' },
  // Document
  parse_pdf:           { cat: 'DOCUMENT',   sig: 'parse_pdf(path)' },
  ocr_image:           { cat: 'DOCUMENT',   sig: 'ocr_image(path)' },
  convert_to_markdown: { cat: 'DOCUMENT',   sig: 'convert_to_markdown(path)' },
  extract_table:       { cat: 'DOCUMENT',   sig: 'extract_table(path,format)' },
  summarize_text:      { cat: 'DOCUMENT',   sig: 'summarize_text(text,max_length)' },
  // Transform
  csv_to_json:         { cat: 'TRANSFORM',  sig: 'csv_to_json(input,path)' },
  json_to_csv:         { cat: 'TRANSFORM',  sig: 'json_to_csv(input,path)' },
  yaml_parse:          { cat: 'TRANSFORM',  sig: 'yaml_parse(input,path,reverse)' },
  xml_parse:           { cat: 'TRANSFORM',  sig: 'xml_parse(input,path)' },
  validate_json:       { cat: 'TRANSFORM',  sig: 'validate_json(input,schema)' },
  // Messaging
  send_email:          { cat: 'MESSAGING',  sig: 'send_email(to,subject,body,smtp_host,smtp_port,smtp_user,smtp_pass)' },
  send_slack_message:  { cat: 'MESSAGING',  sig: 'send_slack_message(webhook_url,text,channel)' },
  send_webhook:        { cat: 'MESSAGING',  sig: 'send_webhook(url,data,method,headers)' },
  send_notification:   { cat: 'MESSAGING',  sig: 'send_notification(title,message)' },
  // Memory
  vector_store_upsert: { cat: 'MEMORY',     sig: 'vector_store_upsert(key,text,tags,store)' },
  vector_search:       { cat: 'MEMORY',     sig: 'vector_search(query,store,limit)' },
  create_embedding:    { cat: 'MEMORY',     sig: 'create_embedding(text)' },
  memory_save:         { cat: 'MEMORY',     sig: 'memory_save(key,value,tags)' },
  memory_recall:       { cat: 'MEMORY',     sig: 'memory_recall(key,tag,query)' },
  // Docker
  docker_run:          { cat: 'DOCKER',     sig: 'docker_run(image,ports,volumes,env,name,detach,command)' },
  docker_build:        { cat: 'DOCKER',     sig: 'docker_build(path,tag,file)' },
  docker_list:         { cat: 'DOCKER',     sig: 'docker_list(all)' },
  docker_stop:         { cat: 'DOCKER',     sig: 'docker_stop(container,remove)' },
  // Testing
  run_tests:           { cat: 'TESTING',    sig: 'run_tests(command,cwd,framework)' },
  lint_code:           { cat: 'TESTING',    sig: 'lint_code(path,cwd)' },
  format_code:         { cat: 'TESTING',    sig: 'format_code(path,cwd)' },
  check_types:         { cat: 'TESTING',    sig: 'check_types(cwd)' },
  run_benchmark:       { cat: 'TESTING',    sig: 'run_benchmark(command,iterations,cwd)' },
  // Security
  scan_secrets:        { cat: 'SECURITY',   sig: 'scan_secrets(path,patterns)' },
  scan_vulnerabilities:{ cat: 'SECURITY',   sig: 'scan_vulnerabilities(cwd)' },
  hash_string:         { cat: 'SECURITY',   sig: 'hash_string(input,algorithm)' },
  // Image
  resize_image:        { cat: 'IMAGE',      sig: 'resize_image(path,width,height,dst)' },
  convert_image:       { cat: 'IMAGE',      sig: 'convert_image(path,format,dst)' },
  describe_image:      { cat: 'IMAGE',      sig: 'describe_image(path)' },
  generate_image:      { cat: 'IMAGE',      sig: 'generate_image(prompt,dst,width,height)' },
  // Schedule
  set_timer:           { cat: 'SCHEDULE',   sig: 'set_timer(seconds,label)' },
  cron_schedule:       { cat: 'SCHEDULE',   sig: 'cron_schedule(expression,command,label)' },
  cron_list:           { cat: 'SCHEDULE',   sig: 'cron_list()' },
  // API
  graphql_query:       { cat: 'API',        sig: 'graphql_query(url,query,variables,headers)' },
  call_api:            { cat: 'API',        sig: 'call_api(url,method,headers,body,auth)' },
  parse_url:           { cat: 'API',        sig: 'parse_url(url)' },
  base64_encode:       { cat: 'API',        sig: 'base64_encode(input,decode,file)' },
  // Math
  evaluate_expression: { cat: 'MATH',       sig: 'evaluate_expression(expression)' },
  regex_match:         { cat: 'MATH',       sig: 'regex_match(text,pattern,flags)' },
  // Business (High-Priority)
  generate_pdf:        { cat: 'BUSINESS',   sig: 'generate_pdf(content,dst,format,title)' },
  google_calendar_api: { cat: 'BUSINESS',   sig: 'google_calendar_api(action,calendarId,event,eventId,timeMin,timeMax)' },
  hubspot_api:         { cat: 'BUSINESS',   sig: 'hubspot_api(action,resource,data,id,query,limit)' },
  salesforce_api:      { cat: 'BUSINESS',   sig: 'salesforce_api(action,sobject,soql,id,data)' },
  stripe_api:          { cat: 'BUSINESS',   sig: 'stripe_api(action,resource,id,data,limit)' },
  chart_generate:      { cat: 'BUSINESS',   sig: 'chart_generate(type,labels,datasets,title,dst,width,height)' },
  quickbooks_api:      { cat: 'BUSINESS',   sig: 'quickbooks_api(action,resource,query,id,data)' },
  twilio_sms:          { cat: 'BUSINESS',   sig: 'twilio_sms(to,body,from)' },
  sentiment_analysis:  { cat: 'BUSINESS',   sig: 'sentiment_analysis(text)' },
  // Business API Tools (36 additional)
  transcribe_audio:    { cat: 'BUSINESS',   sig: 'transcribe_audio(path,provider,api_key)' },
  shopify_api:         { cat: 'BUSINESS',   sig: 'shopify_api(action,resource,id,data,query,limit)' },
  jira_api:            { cat: 'BUSINESS',   sig: 'jira_api(action,project,issueKey,data,jql,limit)' },
  google_sheets_api:   { cat: 'BUSINESS',   sig: 'google_sheets_api(action,spreadsheetId,range,values,data)' },
  social_media_post:   { cat: 'BUSINESS',   sig: 'social_media_post(platform,text,image_url,access_token)' },
  calendly_api:        { cat: 'BUSINESS',   sig: 'calendly_api(action,resource,id,limit)' },
  asana_api:           { cat: 'BUSINESS',   sig: 'asana_api(action,resource,project,id,data,limit)' },
  zoom_api:            { cat: 'BUSINESS',   sig: 'zoom_api(action,resource,id,data)' },
  clearbit_enrichment: { cat: 'BUSINESS',   sig: 'clearbit_enrichment(email,domain,type)' },
  docusign_api:        { cat: 'BUSINESS',   sig: 'docusign_api(action,envelopeId,data,template)' },
  okta_api:            { cat: 'BUSINESS',   sig: 'okta_api(action,resource,id,data,query)' },
  text_to_speech:      { cat: 'BUSINESS',   sig: 'text_to_speech(text,voice,dst,provider)' },
  google_analytics_api:{ cat: 'BUSINESS',   sig: 'google_analytics_api(property,startDate,endDate,metrics,dimensions)' },
  search_console_api:  { cat: 'BUSINESS',   sig: 'search_console_api(siteUrl,startDate,endDate,query,limit)' },
  wordpress_publish:   { cat: 'BUSINESS',   sig: 'wordpress_publish(action,title,content,status,postId,site_url)' },
  buffer_api:          { cat: 'BUSINESS',   sig: 'buffer_api(action,text,profile_ids,scheduled_at)' },
  twitter_search_api:  { cat: 'BUSINESS',   sig: 'twitter_search_api(query,limit,type)' },
  reddit_api:          { cat: 'BUSINESS',   sig: 'reddit_api(action,subreddit,query,sort,limit)' },
  trustpilot_api:      { cat: 'BUSINESS',   sig: 'trustpilot_api(action,businessUnitId,limit)' },
  mailchimp_api:       { cat: 'BUSINESS',   sig: 'mailchimp_api(action,resource,id,data,limit)' },
  sendgrid_api:        { cat: 'BUSINESS',   sig: 'sendgrid_api(action,to,from,subject,html,text)' },
  linkedin_company_api:{ cat: 'BUSINESS',   sig: 'linkedin_company_api(action,companyId,query)' },
  crunchbase_api:      { cat: 'BUSINESS',   sig: 'crunchbase_api(query,type,limit)' },
  glassdoor_api:       { cat: 'BUSINESS',   sig: 'glassdoor_api(query,type,limit)' },
  zoominfo_api:        { cat: 'BUSINESS',   sig: 'zoominfo_api(action,type,query,limit)' },
  pipedrive_api:       { cat: 'BUSINESS',   sig: 'pipedrive_api(action,resource,id,data,limit)' },
  mixpanel_api:        { cat: 'BUSINESS',   sig: 'mixpanel_api(action,from_date,to_date,event,limit)' },
  amplitude_api:       { cat: 'BUSINESS',   sig: 'amplitude_api(action,start,end,limit)' },
  intercom_api:        { cat: 'BUSINESS',   sig: 'intercom_api(action,resource,id,data,query,limit)' },
  greenhouse_api:      { cat: 'BUSINESS',   sig: 'greenhouse_api(action,resource,id,limit)' },
  lever_api:           { cat: 'BUSINESS',   sig: 'lever_api(action,resource,id,limit)' },
  notion_api:          { cat: 'BUSINESS',   sig: 'notion_api(action,query,pageId,databaseId,data)' },
  servicenow_api:      { cat: 'BUSINESS',   sig: 'servicenow_api(action,table,id,data,query,limit)' },
  semrush_api:         { cat: 'BUSINESS',   sig: 'semrush_api(type,domain,keyword,database)' },
  expensify_api:       { cat: 'BUSINESS',   sig: 'expensify_api(action,type,data)' },
  erp_api:             { cat: 'BUSINESS',   sig: 'erp_api(action,system,endpoint,method,data,headers)' },
}

function buildToolSystemPrompt(toolPermissions) {
  if (!toolPermissions || toolPermissions.length === 0) return ''

  // List each tool individually with its signature
  const toolLines = []
  for (const toolName of toolPermissions) {
    const entry = TOOL_CATALOG[toolName]
    if (!entry) continue
    toolLines.push(`- ${entry.sig}`)
  }

  if (toolLines.length === 0) return ''

  return `\n\nYou have access to tools via the local agent. When a task requires a tool, output EXACTLY this format on a single line:
TOOL: {"tool": "tool_name", "args": {"key": "value"}}

Available tools (use ONLY the exact tool_name shown before the parentheses):
${toolLines.join('\n')}

IMPORTANT RULES:
- The "tool" field must be the exact function name (e.g. "list_directory", "evaluate_expression"), NOT a category name.
- Output exactly ONE TOOL call per action on a single line starting with TOOL:
- Always use full absolute paths for file/folder operations.
- Never invent tool names not in the list above.
- After a tool executes, you will receive its result. Use the result to form your final answer.
- If a tool call is denied (permission or guardrail), do NOT retry it — explain what happened instead.

Example: TOOL: {"tool": "list_directory", "args": {"path": "C:/Users/example"}}`
}

// ── Permission checking ─────────────────────────────────────────────────────
function checkToolPermission(toolName, agent, project) {
  // 1. Must be in agent's canvas-wired tool list
  if (!agent.toolPermissions || !agent.toolPermissions.includes(toolName)) {
    return { allowed: false, reason: `Tool "${toolName}" is not connected to this agent on the canvas` }
  }

  // 2. Must not be in project's blocked list
  const blocked = project?.layerConfig?.tools?.blockedTools || []
  if (blocked.includes(toolName)) {
    return { allowed: false, reason: `Tool "${toolName}" is blocked by project settings` }
  }

  return { allowed: true, reason: '' }
}

// ── Guardrail checking ──────────────────────────────────────────────────────
function needsApproval(toolName, project) {
  const guardrails = project?.layerConfig?.guardrails || {}

  // autoApprove bypasses all guardrail checks
  if (guardrails.autoApprove) return false

  const sensitivity = guardrails.sensitivity || 'medium'
  const tier = getSensitivityTier(toolName)

  // Check governance rules first — explicit rules override defaults
  const rules = guardrails.governanceRules || []
  for (const rule of rules) {
    if (rule.action === toolName || rule.action === tier || rule.action === '*') {
      return rule.requires === 'human_approval'
    }
  }

  // Default tier-based logic
  if (tier === 'destructive') return true
  if (tier === 'execute' && (sensitivity === 'medium' || sensitivity === 'high')) return true
  if (tier === 'write' && sensitivity === 'high') return true

  return false
}

async function waitForApproval(approvalId) {
  const deadline = Date.now() + APPROVAL_TIMEOUT
  while (Date.now() < deadline) {
    const approval = await GenesisApproval.findById(approvalId).lean()
    if (!approval) return 'denied'
    if (approval.status === 'approved') return 'approved'
    if (approval.status === 'denied') return 'denied'
    await new Promise(r => setTimeout(r, APPROVAL_POLL_INTERVAL))
  }
  return 'timeout'
}

// ── Rate limiting ───────────────────────────────────────────────────────────
function checkRateLimit(agentId, maxCallsPerMin) {
  if (!maxCallsPerMin || maxCallsPerMin <= 0) return true

  const now = Date.now()
  let bucket = rateBuckets.get(agentId)

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60000 }
    rateBuckets.set(agentId, bucket)
  }

  if (bucket.count >= maxCallsPerMin) return false

  bucket.count++
  return true
}

// ── Main executor ───────────────────────────────────────────────────────────

/**
 * Execute an agent run with full tool loop.
 * @param {string} agentId - GenesisAgent _id
 * @param {string} input - user message or trigger payload
 * @param {string} trigger - 'manual' | 'api' | 'schedule' | 'event'
 * @param {string} token - agent bridge token for WebSocket routing
 * @returns {Promise<object>} The completed GenesisRun document
 */
export async function executeAgent(agentId, input, trigger = 'manual', token = '') {
  const agent = await GenesisAgent.findById(agentId)
  if (!agent) throw new Error('Agent not found')

  // Load project for layer config
  const project = await GenesisProject.findById(agent.projectId).lean()

    // Load and merge API keys: global → agent secrets (agent overrides global)
    await loadGlobalKeys(agent.userId)
    const mergedEnv = { ..._globalKeys }
    if (agent.secrets) {
      for (const [k, v] of agent.secrets instanceof Map ? agent.secrets : Object.entries(agent.secrets || {})) {
        mergedEnv[k.toUpperCase()] = v
      }
    }

  // Create run record
  const run = await GenesisRun.create({
    agentId: agent._id,
    projectId: agent.projectId,
    userId: agent.userId,
    trigger,
    input,
    steps: [],
    status: 'running',
  })

  // Update agent status
  agent.status = 'running'
  agent.lastError = ''
  await agent.save()

  try {
    // Wait in queue if too many concurrent runs
    await waitForSlot(agent.layers?.priority || 5)

    // Build initial messages
    const messages = []

    // System prompt + tool instructions
    const toolPrompt = buildToolSystemPrompt(agent.toolPermissions)
    const systemContent = (agent.systemPrompt || 'You are a helpful assistant.') + toolPrompt
    messages.push({ role: 'system', content: systemContent })

    // RAG: retrieve relevant knowledge chunks
    if (input && input.trim().split(/\s+/).length >= 3) {
      try {
        const ragResults = await findRelevant(agent._id, input, 20)
        if (ragResults.length > 0) {
          const contextBlock = ragResults
            .map(r => `[Source: ${r.fileName}]\n${r.content}`)
            .join('\n\n---\n\n')
          messages.push({
            role: 'system',
            content: `Use the following knowledge base documents to inform your answer. If the answer is not in the documents, say so.\n\n${contextBlock}`,
          })
          run.steps.push({
            ts: new Date(),
            type: 'decision',
            data: {
              action: 'rag_retrieval',
              chunksFound: ragResults.length,
              sources: ragResults.map(r => r.fileName),
              topSimilarity: ragResults[0]?.similarity?.toFixed(3),
            },
            tokenUsage: 0,
          })
        }
      } catch (err) {
        console.error('[executor] RAG retrieval failed:', err.message)
      }
    }

    if (input) {
      messages.push({ role: 'user', content: input })
    }

    // LLM options
    const llmOpts = {
      role: 'language',
      temperature: agent.llmConfig?.temperature ?? 0.7,
      maxTokens: agent.llmConfig?.maxTokens ?? 2048,
    }
    if (agent.llmConfig?.mode === 'role' && agent.llmConfig?.role) {
      llmOpts.role = agent.llmConfig.role
    }

    // Rate limit config
    const maxCallsPerMin = agent.layers?.toolRateLimit
      || project?.layerConfig?.tools?.maxCallsPerMin
      || 30

    // ── Agentic Loop ──────────────────────────────────────────────────────
    let finalReply = ''
    let iteration = 0

    while (iteration < MAX_TOOL_LOOPS) {
      iteration++

      // Log LLM call
      run.steps.push({
        ts: new Date(),
        type: 'llm_call',
        data: {
          model: agent.llmConfig?.model || `auto (${llmOpts.role})`,
          messageCount: messages.length,
          temperature: llmOpts.temperature,
          maxTokens: llmOpts.maxTokens,
          iteration,
        },
        tokenUsage: 0,
      })

      // Call LLM
      const reply = await chat(messages, llmOpts)

      // Parse tool calls
      const toolCalls = extractToolCalls(reply)
      const cleanReply = stripToolCalls(reply)

      // No tool calls — this is the final answer
      if (toolCalls.length === 0) {
        finalReply = reply
        run.steps.push({
          ts: new Date(),
          type: 'response',
          data: { content: reply.slice(0, 2000), fullLength: reply.length, iteration },
          tokenUsage: reply.length,
        })
        break
      }

      // Add assistant reply to message history (including TOOL: markers)
      messages.push({ role: 'assistant', content: reply })

      // Process tool calls (deduplicate)
      const seen = new Set()
      const uniqueCalls = toolCalls.filter(tc => {
        const key = JSON.stringify(tc)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const toolResultMessages = []

      for (const tc of uniqueCalls) {
        const toolName = tc.tool
        const toolArgs = tc.args || {}

        // Log tool call step
        run.steps.push({
          ts: new Date(),
          type: 'tool_call',
          data: { tool: toolName, args: toolArgs, iteration },
          tokenUsage: 0,
        })

        // ── 1. Permission check ───────────────────────────────────────────
        const perm = checkToolPermission(toolName, agent, project)
        if (!perm.allowed) {
          run.steps.push({
            ts: new Date(),
            type: 'guardrail_check',
            data: { tool: toolName, permitted: false, reason: perm.reason },
            tokenUsage: 0,
          })
          toolResultMessages.push(`[Tool "${toolName}" DENIED: ${perm.reason}]`)
          continue
        }

        // ── 2. Rate limit check ───────────────────────────────────────────
        if (!checkRateLimit(String(agent._id), maxCallsPerMin)) {
          run.steps.push({
            ts: new Date(),
            type: 'guardrail_check',
            data: { tool: toolName, permitted: false, reason: `Rate limit exceeded (${maxCallsPerMin}/min)` },
            tokenUsage: 0,
          })
          toolResultMessages.push(`[Tool "${toolName}" DENIED: Rate limit exceeded (${maxCallsPerMin} calls/min)]`)
          continue
        }

        // ── 3. Guardrail / approval check ─────────────────────────────────
        if (needsApproval(toolName, project)) {
          const approval = await GenesisApproval.create({
            agentId: agent._id,
            runId: run._id,
            userId: agent.userId,
            action: `${toolName}(${JSON.stringify(toolArgs).slice(0, 200)})`,
            context: `Agent "${agent.name}" wants to execute tool "${toolName}" during run`,
            threshold: getSensitivityTier(toolName),
            status: 'pending',
          })

          run.steps.push({
            ts: new Date(),
            type: 'guardrail_check',
            data: {
              tool: toolName,
              tier: getSensitivityTier(toolName),
              approvalId: String(approval._id),
              status: 'waiting_approval',
            },
            tokenUsage: 0,
          })

          // Update agent status + save progress so UI shows waiting state
          agent.status = 'waiting_approval'
          await agent.save()
          await run.save()

          // Poll for approval decision
          const decision = await waitForApproval(approval._id)

          run.steps.push({
            ts: new Date(),
            type: 'guardrail_check',
            data: {
              tool: toolName,
              approvalId: String(approval._id),
              decision,
            },
            tokenUsage: 0,
          })

          // Restore running status
          agent.status = 'running'
          await agent.save()

          if (decision !== 'approved') {
            toolResultMessages.push(`[Tool "${toolName}" DENIED: Approval ${decision}. The action requires human approval.]`)
            continue
          }
        }

        // ── 4. Execute tool via agent bridge ──────────────────────────────
        run.steps.push({
          ts: new Date(),
          type: 'decision',
          data: { action: 'tool_dispatch', tool: toolName, args: toolArgs },
          tokenUsage: 0,
        })

        const result = await sendToolCall(toolName, toolArgs, true, token, mergedEnv)

        // Log result
        const resultSummary = typeof result === 'object'
          ? JSON.stringify(result).slice(0, 3000)
          : String(result).slice(0, 3000)

        run.steps.push({
          ts: new Date(),
          type: 'tool_result',
          data: { tool: toolName, result: resultSummary, ok: result?.ok ?? false },
          tokenUsage: 0,
        })

        // Build result message for LLM
        if (result?.ok) {
          toolResultMessages.push(`[Tool "${toolName}" result: ${resultSummary}]`)
        } else {
          toolResultMessages.push(`[Tool "${toolName}" failed: ${result?.error || 'unknown error'}]`)
        }
      }

      // Feed all tool results back to LLM as a user message
      if (toolResultMessages.length > 0) {
        messages.push({
          role: 'user',
          content: toolResultMessages.join('\n\n'),
        })
      }

      // Save progress after each iteration so UI can track live
      await run.save()
    }

    // If we exhausted iterations without a clean break, use last reply
    if (!finalReply && iteration >= MAX_TOOL_LOOPS) {
      finalReply = `(Agent reached maximum tool loop iterations: ${MAX_TOOL_LOOPS})`
      run.steps.push({
        ts: new Date(),
        type: 'decision',
        data: { action: 'max_iterations_reached', iterations: MAX_TOOL_LOOPS },
        tokenUsage: 0,
      })
    }

    // Complete the run
    run.output = finalReply
    run.status = 'completed'
    run.completedAt = new Date()
    await run.save()

    agent.status = 'idle'
    await agent.save()

    return run.toJSON()
  } catch (err) {
    run.steps.push({
      ts: new Date(),
      type: 'error',
      data: { message: err.message },
    })
    run.status = 'failed'
    run.completedAt = new Date()
    await run.save()

    agent.status = 'error'
    agent.lastError = err.message
    await agent.save()

    return run.toJSON()
  } finally {
    releaseSlot()
  }
}

/**
 * Deploy all agents in a project — creates GenesisAgent docs from canvas nodes.
 */
export async function deployProject(projectId, userId, nodes, edges) {
  const agentNodes = nodes.filter(n => n.type === 'agent')
  if (agentNodes.length === 0) throw new Error('No agents on canvas to deploy')

  const agentToolMap = {}
  for (const agentNode of agentNodes) {
    const connectedToolIds = edges
      .filter(e => e.source === agentNode.id || e.target === agentNode.id)
      .map(e => e.source === agentNode.id ? e.target : e.source)

    const toolNames = nodes
      .filter(n => n.type === 'tool' && connectedToolIds.includes(n.id))
      .map(n => n.data?.toolName)
      .filter(Boolean)

    agentToolMap[agentNode.id] = toolNames
  }

  const deployed = []
  for (const agentNode of agentNodes) {
    const data = agentNode.data || {}
    let agent = await GenesisAgent.findOne({ projectId, nodeId: agentNode.id })

    const agentData = {
      projectId,
      userId,
      nodeId: agentNode.id,
      name: data.name || data.label || 'Unnamed Agent',
      systemPrompt: data.systemPrompt || '',
      llmConfig: {
        mode: data.llmConfig?.mode || 'simple',
        role: data.llmConfig?.role || 'language',
        customUrl: data.llmConfig?.customUrl || '',
        model: data.llmConfig?.model || '',
        temperature: data.llmConfig?.temperature ?? 0.7,
        maxTokens: data.llmConfig?.maxTokens ?? 2048,
      },
      runtime: {
        type: data.runtime?.type || 'on-demand',
        schedule: data.runtime?.schedule || '',
        triggers: ['manual', 'api'],
      },
      toolPermissions: agentToolMap[agentNode.id] || [],
      status: 'idle',
      lastError: '',
    }

    if (agent) {
      Object.assign(agent, agentData)
      await agent.save()
    } else {
      agent = await GenesisAgent.create(agentData)
    }
    deployed.push(agent.toJSON())
  }

  return deployed
}

/**
 * Stop all agents in a project.
 */
export async function stopProject(projectId) {
  const result = await GenesisAgent.updateMany(
    { projectId },
    { $set: { status: 'stopped' } },
  )
  return result.modifiedCount
}

/**
 * Get all agents for a project with their status.
 */
export async function getProjectAgents(projectId) {
  const agents = await GenesisAgent.find({ projectId }).select('-secrets').lean()
  return agents.map(a => ({ ...a, id: String(a._id) }))
}

/**
 * Get recent runs for an agent.
 */
export async function getAgentRuns(agentId, limit = 20) {
  const runs = await GenesisRun.find({ agentId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
  return runs.map(r => ({ ...r, id: String(r._id) }))
}

// ── Simple priority queue ───────────────────────────────────────────────────
function waitForSlot(priority) {
  return new Promise(resolve => {
    if (running < MAX_CONCURRENT) {
      running++
      resolve()
      return
    }
    runQueue.push({ priority, resolve })
    runQueue.sort((a, b) => b.priority - a.priority)
  })
}

function releaseSlot() {
  running--
  if (runQueue.length > 0) {
    const next = runQueue.shift()
    running++
    next.resolve()
  }
}
