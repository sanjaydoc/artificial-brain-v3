import { useState } from 'react'
import { Search, Brain, Wrench, Radio, ChevronDown, ChevronRight, Layers } from 'lucide-react'

interface SidebarProps {
  onOpenTemplates: () => void
}

const TOOL_CATEGORIES: { label: string; tools: { name: string; desc: string }[] }[] = [
  { label: 'File', tools: [
    { name: 'read_file', desc: 'Read file contents' }, { name: 'read_file_lines', desc: 'Read line range' },
    { name: 'write_file', desc: 'Write/overwrite file' }, { name: 'create_file', desc: 'Create new file' },
    { name: 'append_file', desc: 'Append to file' }, { name: 'edit_file', desc: 'Find & replace' },
    { name: 'delete_file', desc: 'Delete a file' },
  ]},
  { label: 'Folder', tools: [
    { name: 'create_folder', desc: 'Create directory' }, { name: 'delete_folder', desc: 'Delete directory' },
    { name: 'read_folder', desc: 'List with depth' }, { name: 'list_directory', desc: 'List entries' },
  ]},
  { label: 'Move/Copy', tools: [
    { name: 'move_file', desc: 'Move/rename file' }, { name: 'move_folder', desc: 'Move/rename folder' },
    { name: 'copy_file', desc: 'Copy a file' },
  ]},
  { label: 'Search', tools: [{ name: 'search_code', desc: 'Regex search files' }] },
  { label: 'Archive', tools: [
    { name: 'zip_folder', desc: 'Compress to ZIP' }, { name: 'unzip_file', desc: 'Extract ZIP' },
  ]},
  { label: 'Git', tools: [
    { name: 'git_status', desc: 'Git status' }, { name: 'git_diff', desc: 'Git diff' },
    { name: 'git_commit', desc: 'Stage & commit' },
  ]},
  { label: 'Scripts', tools: [
    { name: 'run_command', desc: 'Shell command (10s)' }, { name: 'bash', desc: 'Shell with cwd (30s)' },
    { name: 'pip_install', desc: 'Install Python pkg' }, { name: 'run_python', desc: 'Execute Python' },
  ]},
  { label: 'System', tools: [
    { name: 'get_system_info', desc: 'OS/CPU/RAM info' }, { name: 'list_processes', desc: 'Running processes' },
    { name: 'kill_process', desc: 'Kill by PID/name' }, { name: 'get_env_var', desc: 'Read env var' },
  ]},
  { label: 'Network', tools: [
    { name: 'http_get', desc: 'HTTP GET' }, { name: 'http_post', desc: 'HTTP POST' },
    { name: 'download_file', desc: 'Download from URL' },
  ]},
  { label: 'Desktop', tools: [
    { name: 'take_screenshot', desc: 'Capture screen' }, { name: 'read_clipboard', desc: 'Read clipboard' },
    { name: 'write_clipboard', desc: 'Write clipboard' },
  ]},
  { label: 'Web', tools: [
    { name: 'search_web', desc: 'DuckDuckGo search' }, { name: 'scrape_web', desc: 'Extract text from URL' },
  ]},
  { label: 'Meta', tools: [
    { name: 'list', desc: 'List all tools' }, { name: 'undo', desc: 'Reverse last action' },
    { name: 'undo_history', desc: 'Show undo stack' },
  ]},
  { label: 'Git+', tools: [
    { name: 'git_log', desc: 'View commit history' },
    { name: 'git_add', desc: 'Stage files for commit' },
    { name: 'git_branch', desc: 'Create/list/delete branches' },
    { name: 'git_checkout', desc: 'Switch branches' },
    { name: 'git_merge', desc: 'Merge branches' },
    { name: 'git_push', desc: 'Push to remote' },
    { name: 'git_pull', desc: 'Pull from remote' },
    { name: 'git_clone', desc: 'Clone a repository' },
  ]},
  { label: 'Database', tools: [
    { name: 'query_sql', desc: 'Execute SQL query' },
    { name: 'describe_schema', desc: 'List tables & columns' },
    { name: 'create_table', desc: 'Create database table' },
    { name: 'insert_rows', desc: 'Insert data rows' },
    { name: 'run_migration', desc: 'Run SQL migration' },
  ]},
  { label: 'Browser', tools: [
    { name: 'browser_open', desc: 'Open URL & extract content' },
    { name: 'browser_click', desc: 'Click page element' },
    { name: 'browser_type_text', desc: 'Type into input field' },
    { name: 'browser_navigate', desc: 'Navigate pages' },
    { name: 'browser_extract', desc: 'Extract structured data' },
  ]},
  { label: 'Document', tools: [
    { name: 'parse_pdf', desc: 'Extract text from PDF' },
    { name: 'ocr_image', desc: 'OCR text from image' },
    { name: 'convert_to_markdown', desc: 'Convert doc to markdown' },
    { name: 'extract_table', desc: 'Extract tables to CSV/JSON' },
    { name: 'summarize_text', desc: 'Smart text summarization' },
  ]},
  { label: 'Transform', tools: [
    { name: 'csv_to_json', desc: 'CSV to JSON array' },
    { name: 'json_to_csv', desc: 'JSON array to CSV' },
    { name: 'yaml_parse', desc: 'YAML ↔ JSON conversion' },
    { name: 'xml_parse', desc: 'XML to JSON conversion' },
    { name: 'validate_json', desc: 'Validate JSON schema' },
  ]},
  { label: 'Messaging', tools: [
    { name: 'send_email', desc: 'Send email via SMTP' },
    { name: 'send_slack_message', desc: 'Post to Slack channel' },
    { name: 'send_webhook', desc: 'Send webhook payload' },
    { name: 'send_notification', desc: 'Desktop notification' },
  ]},
  { label: 'Memory', tools: [
    { name: 'vector_store_upsert', desc: 'Store text with embeddings' },
    { name: 'vector_search', desc: 'Semantic similarity search' },
    { name: 'create_embedding', desc: 'Generate text embedding' },
    { name: 'memory_save', desc: 'Save persistent memory' },
    { name: 'memory_recall', desc: 'Recall saved memories' },
  ]},
  { label: 'Docker', tools: [
    { name: 'docker_run', desc: 'Run container' },
    { name: 'docker_build', desc: 'Build Docker image' },
    { name: 'docker_list', desc: 'List containers' },
    { name: 'docker_stop', desc: 'Stop/remove container' },
  ]},
  { label: 'Testing', tools: [
    { name: 'run_tests', desc: 'Execute test suite' },
    { name: 'lint_code', desc: 'Run linter on files' },
    { name: 'format_code', desc: 'Auto-format code' },
    { name: 'check_types', desc: 'Run type checker' },
    { name: 'run_benchmark', desc: 'Performance benchmark' },
  ]},
  { label: 'Security', tools: [
    { name: 'scan_secrets', desc: 'Scan for leaked secrets' },
    { name: 'scan_vulnerabilities', desc: 'Dependency audit' },
    { name: 'hash_string', desc: 'Cryptographic hash' },
  ]},
  { label: 'Image', tools: [
    { name: 'resize_image', desc: 'Resize image dimensions' },
    { name: 'convert_image', desc: 'Convert image format' },
    { name: 'describe_image', desc: 'Get image metadata' },
    { name: 'generate_image', desc: 'Generate placeholder image' },
  ]},
  { label: 'Schedule', tools: [
    { name: 'set_timer', desc: 'Set delayed action' },
    { name: 'cron_schedule', desc: 'Create recurring job' },
    { name: 'cron_list', desc: 'List scheduled jobs' },
  ]},
  { label: 'API', tools: [
    { name: 'graphql_query', desc: 'GraphQL query/mutation' },
    { name: 'call_api', desc: 'Configurable HTTP request' },
    { name: 'parse_url', desc: 'Parse URL components' },
    { name: 'base64_encode', desc: 'Base64 encode/decode' },
  ]},
  { label: 'Math', tools: [
    { name: 'evaluate_expression', desc: 'Safe math evaluation' },
    { name: 'regex_match', desc: 'Regex pattern matching' },
  ]},
  { label: 'Business', tools: [
    { name: 'generate_pdf', desc: 'Markdown/HTML to PDF' },
    { name: 'google_calendar_api', desc: 'Google Calendar events' },
    { name: 'hubspot_api', desc: 'HubSpot CRM operations' },
    { name: 'salesforce_api', desc: 'Salesforce CRM queries' },
    { name: 'stripe_api', desc: 'Stripe payments/invoices' },
    { name: 'chart_generate', desc: 'Generate charts as PNG' },
    { name: 'quickbooks_api', desc: 'QuickBooks accounting' },
    { name: 'twilio_sms', desc: 'Send SMS messages' },
    { name: 'sentiment_analysis', desc: 'Text sentiment scoring' },
    { name: 'transcribe_audio', desc: 'Audio/video to text' },
    { name: 'shopify_api', desc: 'Shopify store CRUD' },
    { name: 'jira_api', desc: 'Jira issues & projects' },
    { name: 'google_sheets_api', desc: 'Sheets read/write' },
    { name: 'social_media_post', desc: 'Post to social platforms' },
    { name: 'calendly_api', desc: 'Calendly scheduling' },
    { name: 'asana_api', desc: 'Asana tasks & projects' },
    { name: 'zoom_api', desc: 'Zoom meetings' },
    { name: 'clearbit_enrichment', desc: 'Lead/company enrichment' },
    { name: 'docusign_api', desc: 'E-signatures' },
    { name: 'okta_api', desc: 'User provisioning' },
    { name: 'text_to_speech', desc: 'Text to audio file' },
    { name: 'google_analytics_api', desc: 'GA4 reports' },
    { name: 'search_console_api', desc: 'Search Console data' },
    { name: 'wordpress_publish', desc: 'WordPress posts' },
    { name: 'buffer_api', desc: 'Schedule social posts' },
    { name: 'twitter_search_api', desc: 'Search tweets' },
    { name: 'reddit_api', desc: 'Reddit search/monitor' },
    { name: 'trustpilot_api', desc: 'Business reviews' },
    { name: 'mailchimp_api', desc: 'Email campaigns' },
    { name: 'sendgrid_api', desc: 'Transactional email' },
    { name: 'linkedin_company_api', desc: 'LinkedIn companies' },
    { name: 'crunchbase_api', desc: 'Company funding data' },
    { name: 'glassdoor_api', desc: 'Company reviews' },
    { name: 'zoominfo_api', desc: 'B2B intelligence' },
    { name: 'pipedrive_api', desc: 'Pipedrive CRM' },
    { name: 'mixpanel_api', desc: 'Product analytics' },
    { name: 'amplitude_api', desc: 'User analytics' },
    { name: 'intercom_api', desc: 'Customer messaging' },
    { name: 'greenhouse_api', desc: 'ATS candidates' },
    { name: 'lever_api', desc: 'ATS opportunities' },
    { name: 'notion_api', desc: 'Notion pages & DBs' },
    { name: 'servicenow_api', desc: 'ITSM tickets' },
    { name: 'semrush_api', desc: 'SEO analytics' },
    { name: 'expensify_api', desc: 'Expense reports' },
    { name: 'erp_api', desc: 'ERP connector' },
  ]},
]

function onDragStart(event: React.DragEvent, nodeType: string, data: Record<string, unknown>) {
  event.dataTransfer.setData('application/reactflow-type', nodeType)
  event.dataTransfer.setData('application/reactflow-data', JSON.stringify(data))
  event.dataTransfer.effectAllowed = 'move'
}

export function Sidebar({ onOpenTemplates }: SidebarProps) {
  const [search, setSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())

  const toggleCat = (label: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  const lowerSearch = search.toLowerCase()

  return (
    <div className="w-[240px] border-r border-border bg-card flex flex-col overflow-hidden shrink-0">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full rounded-lg border border-border bg-input pl-8 pr-3 py-2 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Agents */}
        <div>
          <p className="text-sm font-kanit font-semibold mb-2">Agents</p>
          <div
            draggable
            onDragStart={e => onDragStart(e, 'agent', { name: 'New Agent', systemPrompt: '', llmConfig: { mode: 'simple', temperature: 0.7, maxTokens: 2048 } })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-grab hover:border-blue-400/40 transition-all mb-1.5"
          >
            <div className="w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20 grid place-items-center">
              <Brain className="w-3 h-3 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">+ New Agent</p>
              <p className="text-[9px] text-muted-foreground">Drag to canvas</p>
            </div>
          </div>
          <button onClick={onOpenTemplates} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-primary hover:bg-accent transition-colors w-full">
            <Layers className="w-3 h-3" /> From Template
          </button>
        </div>

        {/* Tools */}
        <div>
          <p className="text-sm font-kanit font-semibold mb-2">
            Tools ({TOOL_CATEGORIES.reduce((s, c) => s + c.tools.length, 0)})
          </p>
          {TOOL_CATEGORIES.map(cat => {
            const filtered = lowerSearch
              ? cat.tools.filter(t => t.name.includes(lowerSearch) || t.desc.toLowerCase().includes(lowerSearch) || cat.label.toLowerCase().includes(lowerSearch))
              : cat.tools
            if (filtered.length === 0) return null
            const isOpen = expandedCats.has(cat.label)

            return (
              <div key={cat.label} className="mb-1">
                <button onClick={() => toggleCat(cat.label)}
                  className="flex items-center gap-2 w-full px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  <span className="font-semibold">{cat.label}</span>
                  <span className="ml-auto text-[9px] opacity-60">{filtered.length}</span>
                </button>
                {isOpen && (
                  <div className="ml-2 mt-1 space-y-1">
                    {filtered.map(tool => (
                      <div
                        key={tool.name}
                        draggable
                        onDragStart={e => onDragStart(e, 'tool', { toolName: tool.name, description: tool.desc, category: cat.label })}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border cursor-grab hover:border-teal-400/40 transition-all text-[10px]"
                      >
                        <Wrench className="w-3 h-3 text-teal-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-mono font-semibold text-foreground truncate">{tool.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bus */}
        <div>
          <p className="text-sm font-kanit font-semibold mb-2">Bus</p>
          <div
            draggable
            onDragStart={e => onDragStart(e, 'bus', { name: 'Event Bus', topics: [] })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card cursor-grab hover:border-amber-400/40 transition-all"
          >
            <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 grid place-items-center">
              <Radio className="w-3 h-3 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">+ New Bus</p>
              <p className="text-[9px] text-muted-foreground">Drag to canvas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
