import { useState } from 'react'
import {
  FileText, Folder, ArrowRightLeft, Search, Archive, GitBranch,
  Terminal, Cpu, Globe, Monitor, Code2, List,
  Database, Chrome, FileType, ArrowLeftRight, Mail, Brain,
  Container, TestTube, Shield, Image, Clock, Plug, Calculator, Briefcase,
} from 'lucide-react'

interface Tool {
  name: string
  description: string
  args: string
}

interface Category {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  tools: Tool[]
}

const CATEGORIES: Category[] = [
  { id: 'file', label: 'File', icon: <FileText className="w-4 h-4" />, color: '#3b82f6', tools: [
    { name: 'read_file', description: 'Read file contents (up to 8KB)', args: 'path' },
    { name: 'read_file_lines', description: 'Read specific line range', args: 'path, start, end' },
    { name: 'write_file', description: 'Write or overwrite a file', args: 'path, content' },
    { name: 'create_file', description: 'Create a new file', args: 'path, content' },
    { name: 'append_file', description: 'Append content to a file', args: 'path, content' },
    { name: 'edit_file', description: 'Find and replace text', args: 'path, old_text, new_text' },
    { name: 'delete_file', description: 'Delete a file (backs up for undo)', args: 'path' },
  ]},
  { id: 'folder', label: 'Folder', icon: <Folder className="w-4 h-4" />, color: '#8b5cf6', tools: [
    { name: 'create_folder', description: 'Create directory (recursive)', args: 'path' },
    { name: 'delete_folder', description: 'Delete directory and contents', args: 'path' },
    { name: 'read_folder', description: 'List folder with depth', args: 'path, depth' },
    { name: 'list_directory', description: 'List immediate entries', args: 'path' },
  ]},
  { id: 'move', label: 'Move / Copy', icon: <ArrowRightLeft className="w-4 h-4" />, color: '#06b6d4', tools: [
    { name: 'move_file', description: 'Move or rename a file', args: 'src, dst' },
    { name: 'move_folder', description: 'Move or rename a folder', args: 'src, dst' },
    { name: 'copy_file', description: 'Copy a file', args: 'src, dst' },
  ]},
  { id: 'search', label: 'Search', icon: <Search className="w-4 h-4" />, color: '#14b8a6', tools: [
    { name: 'search_code', description: 'Regex search across files', args: 'pattern, glob, base' },
  ]},
  { id: 'archive', label: 'Archive', icon: <Archive className="w-4 h-4" />, color: '#f59e0b', tools: [
    { name: 'zip_folder', description: 'Compress folder to ZIP', args: 'src, dst' },
    { name: 'unzip_file', description: 'Extract a ZIP file', args: 'src, dst' },
  ]},
  { id: 'git', label: 'Git', icon: <GitBranch className="w-4 h-4" />, color: '#f97316', tools: [
    { name: 'git_status', description: 'Run git status', args: 'cwd' },
    { name: 'git_diff', description: 'Run git diff', args: 'cwd' },
    { name: 'git_commit', description: 'Stage all and commit', args: 'message, cwd' },
    { name: 'git_log', description: 'Show commit history', args: 'cwd, limit' },
    { name: 'git_add', description: 'Stage files', args: 'files, cwd' },
    { name: 'git_branch', description: 'List/create/delete branches', args: 'name, delete, cwd' },
    { name: 'git_checkout', description: 'Switch or create branches', args: 'branch, create, cwd' },
    { name: 'git_merge', description: 'Merge branch into current', args: 'branch, cwd' },
    { name: 'git_push', description: 'Push to remote', args: 'remote, branch, cwd' },
    { name: 'git_pull', description: 'Pull from remote', args: 'remote, branch, cwd' },
    { name: 'git_clone', description: 'Clone a repository', args: 'url, dst, cwd' },
  ]},
  { id: 'scripts', label: 'Scripts', icon: <Terminal className="w-4 h-4" />, color: '#ef4444', tools: [
    { name: 'run_command', description: 'Shell command (10s timeout)', args: 'command, timeout' },
    { name: 'bash', description: 'Shell with working directory (30s)', args: 'command, timeout, cwd' },
    { name: 'pip_install', description: 'Install Python package', args: 'package' },
    { name: 'run_python', description: 'Execute Python script', args: 'code, timeout' },
  ]},
  { id: 'system', label: 'System', icon: <Cpu className="w-4 h-4" />, color: '#16a34a', tools: [
    { name: 'get_system_info', description: 'OS, CPU, RAM, uptime info', args: '(none)' },
    { name: 'list_processes', description: 'List running processes', args: 'limit' },
    { name: 'kill_process', description: 'Kill process by PID or name', args: 'pid, name' },
    { name: 'get_env_var', description: 'Read environment variable', args: 'name' },
  ]},
  { id: 'network', label: 'Network', icon: <Globe className="w-4 h-4" />, color: '#2563eb', tools: [
    { name: 'http_get', description: 'HTTP GET request', args: 'url, headers, timeout' },
    { name: 'http_post', description: 'HTTP POST with JSON body', args: 'url, data, headers, timeout' },
    { name: 'download_file', description: 'Download file from URL', args: 'url, dst' },
  ]},
  { id: 'desktop', label: 'Desktop', icon: <Monitor className="w-4 h-4" />, color: '#7c3aed', tools: [
    { name: 'take_screenshot', description: 'Capture screen to PNG', args: 'dst' },
    { name: 'read_clipboard', description: 'Read clipboard text', args: '(none)' },
    { name: 'write_clipboard', description: 'Write to clipboard', args: 'text' },
  ]},
  { id: 'web', label: 'Web', icon: <Code2 className="w-4 h-4" />, color: '#ec4899', tools: [
    { name: 'search_web', description: 'DuckDuckGo search', args: 'query, limit' },
    { name: 'scrape_web', description: 'Fetch URL and extract text', args: 'url' },
  ]},
  { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" />, color: '#0d9488', tools: [
    { name: 'query_sql', description: 'Execute SQL query (SQLite)', args: 'query, database, type' },
    { name: 'describe_schema', description: 'Show database schema', args: 'database, type' },
    { name: 'create_table', description: 'Create table', args: 'database, sql, type' },
    { name: 'insert_rows', description: 'Insert data rows', args: 'database, sql, type' },
    { name: 'run_migration', description: 'Run SQL migration file', args: 'database, file, type' },
  ]},
  { id: 'browser', label: 'Browser', icon: <Chrome className="w-4 h-4" />, color: '#ea580c', tools: [
    { name: 'browser_open', description: 'Open URL and extract content', args: 'url' },
    { name: 'browser_click', description: 'Click page element', args: 'selector, url' },
    { name: 'browser_type_text', description: 'Type into input field', args: 'selector, text, url' },
    { name: 'browser_navigate', description: 'Navigate pages', args: 'url, action' },
    { name: 'browser_extract', description: 'Extract structured data', args: 'url, selector' },
  ]},
  { id: 'document', label: 'Document', icon: <FileType className="w-4 h-4" />, color: '#be185d', tools: [
    { name: 'parse_pdf', description: 'Extract text from PDF', args: 'path' },
    { name: 'ocr_image', description: 'OCR image to text', args: 'path' },
    { name: 'convert_to_markdown', description: 'Convert to markdown', args: 'path' },
    { name: 'extract_table', description: 'Extract tables to CSV/JSON', args: 'path, format' },
    { name: 'summarize_text', description: 'Smart text summarization', args: 'text, max_length' },
    { name: 'generate_pdf', description: 'Markdown/HTML to PDF', args: 'content, dst, format, title' },
    { name: 'chart_generate', description: 'Generate charts as PNG', args: 'type, labels, datasets, title, dst' },
  ]},
  { id: 'transform', label: 'Transform', icon: <ArrowLeftRight className="w-4 h-4" />, color: '#4f46e5', tools: [
    { name: 'csv_to_json', description: 'CSV to JSON array', args: 'input, path' },
    { name: 'json_to_csv', description: 'JSON array to CSV', args: 'input, path' },
    { name: 'yaml_parse', description: 'YAML ↔ JSON conversion', args: 'input, path, reverse' },
    { name: 'xml_parse', description: 'XML to JSON', args: 'input, path' },
    { name: 'validate_json', description: 'Validate JSON schema', args: 'input, schema' },
    { name: 'sentiment_analysis', description: 'Text sentiment scoring', args: 'text' },
  ]},
  { id: 'messaging', label: 'Messaging', icon: <Mail className="w-4 h-4" />, color: '#0891b2', tools: [
    { name: 'send_email', description: 'Send email via SMTP', args: 'to, subject, body, smtp_host, ...' },
    { name: 'send_slack_message', description: 'Post to Slack webhook', args: 'webhook_url, text, channel' },
    { name: 'send_webhook', description: 'Send HTTP webhook', args: 'url, data, method, headers' },
    { name: 'send_notification', description: 'Desktop notification', args: 'title, message' },
    { name: 'twilio_sms', description: 'Send SMS via Twilio', args: 'to, body, from' },
    { name: 'sendgrid_api', description: 'Send email via SendGrid', args: 'to, from, subject, html' },
    { name: 'social_media_post', description: 'Post to Twitter/LinkedIn/Facebook', args: 'platform, text, image_url' },
    { name: 'text_to_speech', description: 'Convert text to audio', args: 'text, voice, dst, provider' },
    { name: 'transcribe_audio', description: 'Audio/video to text', args: 'path, provider' },
  ]},
  { id: 'memory', label: 'Memory', icon: <Brain className="w-4 h-4" />, color: '#7c3aed', tools: [
    { name: 'vector_store_upsert', description: 'Store text with embeddings', args: 'key, text, tags, store' },
    { name: 'vector_search', description: 'Semantic similarity search', args: 'query, store, limit' },
    { name: 'create_embedding', description: 'Generate text embedding', args: 'text' },
    { name: 'memory_save', description: 'Save persistent memory', args: 'key, value, tags' },
    { name: 'memory_recall', description: 'Recall saved memories', args: 'key, tag, query' },
  ]},
  { id: 'docker', label: 'Docker', icon: <Container className="w-4 h-4" />, color: '#2563eb', tools: [
    { name: 'docker_run', description: 'Run container', args: 'image, ports, volumes, env, name' },
    { name: 'docker_build', description: 'Build Docker image', args: 'path, tag, file' },
    { name: 'docker_list', description: 'List containers', args: 'all' },
    { name: 'docker_stop', description: 'Stop/remove container', args: 'container, remove' },
  ]},
  { id: 'testing', label: 'Testing', icon: <TestTube className="w-4 h-4" />, color: '#16a34a', tools: [
    { name: 'run_tests', description: 'Execute test suite', args: 'command, cwd, framework' },
    { name: 'lint_code', description: 'Run linter on files', args: 'path, cwd' },
    { name: 'format_code', description: 'Auto-format code', args: 'path, cwd' },
    { name: 'check_types', description: 'Run type checker', args: 'cwd' },
    { name: 'run_benchmark', description: 'Performance benchmark', args: 'command, iterations, cwd' },
  ]},
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" />, color: '#dc2626', tools: [
    { name: 'scan_secrets', description: 'Scan for leaked secrets', args: 'path, patterns' },
    { name: 'scan_vulnerabilities', description: 'Dependency audit', args: 'cwd' },
    { name: 'hash_string', description: 'Cryptographic hash', args: 'input, algorithm' },
  ]},
  { id: 'image', label: 'Image', icon: <Image className="w-4 h-4" />, color: '#c026d3', tools: [
    { name: 'resize_image', description: 'Resize image dimensions', args: 'path, width, height, dst' },
    { name: 'convert_image', description: 'Convert image format', args: 'path, format, dst' },
    { name: 'describe_image', description: 'Get image metadata', args: 'path' },
    { name: 'generate_image', description: 'Generate placeholder image', args: 'prompt, dst, width, height' },
  ]},
  { id: 'schedule', label: 'Schedule', icon: <Clock className="w-4 h-4" />, color: '#0d9488', tools: [
    { name: 'set_timer', description: 'Set delayed action', args: 'seconds, label' },
    { name: 'cron_schedule', description: 'Create recurring job', args: 'expression, command, label' },
    { name: 'cron_list', description: 'List scheduled jobs', args: '(none)' },
  ]},
  { id: 'api', label: 'API', icon: <Plug className="w-4 h-4" />, color: '#6366f1', tools: [
    { name: 'graphql_query', description: 'GraphQL query/mutation', args: 'url, query, variables, headers' },
    { name: 'call_api', description: 'Configurable HTTP request', args: 'url, method, headers, body, auth' },
    { name: 'parse_url', description: 'Parse URL components', args: 'url' },
    { name: 'base64_encode', description: 'Base64 encode/decode', args: 'input, decode, file' },
  ]},
  { id: 'math', label: 'Math', icon: <Calculator className="w-4 h-4" />, color: '#059669', tools: [
    { name: 'evaluate_expression', description: 'Safe math evaluation', args: 'expression' },
    { name: 'regex_match', description: 'Regex pattern matching', args: 'text, pattern, flags' },
  ]},
  { id: 'business', label: 'Business APIs', icon: <Briefcase className="w-4 h-4" />, color: '#b45309', tools: [
    { name: 'google_calendar_api', description: 'Google Calendar events', args: 'action, calendarId, event, eventId' },
    { name: 'hubspot_api', description: 'HubSpot CRM CRUD', args: 'action, resource, data, id, query' },
    { name: 'salesforce_api', description: 'Salesforce CRM queries', args: 'action, sobject, soql, id, data' },
    { name: 'stripe_api', description: 'Stripe payments/invoices', args: 'action, resource, id, data' },
    { name: 'quickbooks_api', description: 'QuickBooks accounting', args: 'action, resource, query, id' },
    { name: 'shopify_api', description: 'Shopify store CRUD', args: 'action, resource, id, data' },
    { name: 'jira_api', description: 'Jira issues & projects', args: 'action, project, issueKey, data, jql' },
    { name: 'google_sheets_api', description: 'Sheets read/write', args: 'action, spreadsheetId, range, values' },
    { name: 'calendly_api', description: 'Calendly scheduling', args: 'action, resource, id' },
    { name: 'asana_api', description: 'Asana tasks & projects', args: 'action, resource, project, id, data' },
    { name: 'zoom_api', description: 'Zoom meetings', args: 'action, resource, id, data' },
    { name: 'clearbit_enrichment', description: 'Lead/company enrichment', args: 'email, domain, type' },
    { name: 'docusign_api', description: 'E-signatures', args: 'action, envelopeId, data' },
    { name: 'okta_api', description: 'User provisioning', args: 'action, resource, id, data' },
    { name: 'notion_api', description: 'Notion pages & databases', args: 'action, query, pageId, databaseId' },
    { name: 'pipedrive_api', description: 'Pipedrive CRM', args: 'action, resource, id, data' },
    { name: 'intercom_api', description: 'Customer messaging', args: 'action, resource, id, data' },
    { name: 'mailchimp_api', description: 'Email campaigns', args: 'action, resource, id, data' },
    { name: 'servicenow_api', description: 'ITSM tickets', args: 'action, table, id, data, query' },
    { name: 'wordpress_publish', description: 'WordPress posts', args: 'action, title, content, status' },
    { name: 'google_analytics_api', description: 'GA4 reports', args: 'property, startDate, endDate, metrics' },
    { name: 'search_console_api', description: 'Search Console data', args: 'siteUrl, startDate, endDate, query' },
    { name: 'semrush_api', description: 'SEO analytics', args: 'type, domain, keyword' },
    { name: 'buffer_api', description: 'Schedule social posts', args: 'action, text, profile_ids' },
    { name: 'twitter_search_api', description: 'Search tweets', args: 'query, limit, type' },
    { name: 'reddit_api', description: 'Reddit search/monitor', args: 'action, subreddit, query, sort' },
    { name: 'trustpilot_api', description: 'Business reviews', args: 'action, businessUnitId' },
    { name: 'linkedin_company_api', description: 'LinkedIn companies', args: 'action, companyId, query' },
    { name: 'crunchbase_api', description: 'Company funding data', args: 'query, type' },
    { name: 'glassdoor_api', description: 'Company reviews', args: 'query, type' },
    { name: 'zoominfo_api', description: 'B2B intelligence', args: 'action, type, query' },
    { name: 'mixpanel_api', description: 'Product analytics', args: 'action, from_date, to_date, event' },
    { name: 'amplitude_api', description: 'User analytics', args: 'action, start, end' },
    { name: 'greenhouse_api', description: 'ATS candidates', args: 'action, resource, id' },
    { name: 'lever_api', description: 'ATS opportunities', args: 'action, resource, id' },
    { name: 'expensify_api', description: 'Expense reports', args: 'action, type, data' },
    { name: 'erp_api', description: 'ERP connector (SAP/NetSuite)', args: 'action, system, endpoint, method, data' },
  ]},
  { id: 'meta', label: 'Meta', icon: <List className="w-4 h-4" />, color: '#6b7280', tools: [
    { name: 'list', description: 'List all available tools', args: '(none)' },
    { name: 'undo', description: 'Reverse last file operation', args: '(none)' },
    { name: 'undo_history', description: 'Show undo stack (last 20)', args: '(none)' },
  ]},
]

const TOTAL = CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0)

export default function Commands() {
  const [filter, setFilter] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [view, setView] = useState<'grid' | 'compact'>('grid')

  const lowerFilter = filter.toLowerCase()
  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    tools: cat.tools.filter(t =>
      t.name.toLowerCase().includes(lowerFilter) ||
      t.description.toLowerCase().includes(lowerFilter) ||
      cat.label.toLowerCase().includes(lowerFilter)
    ),
  })).filter(cat =>
    (activeCategory ? cat.id === activeCategory : true) && cat.tools.length > 0
  )

  const visibleCount = filtered.reduce((sum, c) => sum + c.tools.length, 0)

  return (
    <div className="flex gap-0" style={{ height: 'calc(100vh - 2.5rem)' }}>
      {/* Sidebar — categories */}
      <div className="w-[200px] shrink-0 border-r border-border bg-card/50 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-border">
          <p className="text-[0.6rem] font-bold uppercase tracking-wider text-primary/70 mb-1">Brain Agent v3.1.0</p>
          <p className="text-2xl font-bold text-foreground font-kanit">{TOTAL} <span className="text-sm font-normal text-muted-foreground">tools</span></p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          <button
            onClick={() => setActiveCategory(null)}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors ${
              !activeCategory ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <span>All Tools</span>
            <span className="text-[0.6rem] opacity-70">{TOTAL}</span>
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                activeCategory === cat.id ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span style={{ color: activeCategory === cat.id ? cat.color : undefined }}>{cat.icon}</span>
              <span className="flex-1 text-left truncate">{cat.label}</span>
              <span className="text-[0.6rem] opacity-50 shrink-0">{cat.tools.length}</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <p className="text-[0.6rem] text-muted-foreground leading-relaxed">
            {CATEGORIES.length} categories<br />
            Connected via WebSocket
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar: search + view toggle */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0 bg-card/30">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder={`Search ${activeCategory ? filtered[0]?.label || '' : 'all'} tools...`}
              className="w-full rounded-lg border border-border bg-input pl-9 pr-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          {filter && (
            <span className="text-[0.6rem] text-muted-foreground shrink-0">
              {visibleCount} result{visibleCount !== 1 ? 's' : ''}
            </span>
          )}
          <div className="ml-auto flex gap-1 shrink-0">
            <button onClick={() => setView('grid')}
              className={`p-1.5 rounded-md border text-xs transition-colors ${view === 'grid' ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}
              title="Grid view">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
            <button onClick={() => setView('compact')}
              className={`p-1.5 rounded-md border text-xs transition-colors ${view === 'compact' ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}
              title="Compact view">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="6" width="12" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><rect x="1" y="10" width="12" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
          </div>
        </div>

        {/* Tools content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">No tools found</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map(cat => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">
                    <div className="w-6 h-6 rounded-md grid place-items-center border"
                      style={{ background: `${cat.color}12`, borderColor: `${cat.color}25`, color: cat.color }}>
                      {cat.icon}
                    </div>
                    <h2 className="text-sm font-bold text-foreground">{cat.label}</h2>
                    <span className="text-[0.6rem] text-muted-foreground font-mono">{cat.tools.length}</span>
                    <div className="flex-1 h-px bg-border ml-2" />
                  </div>

                  {view === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {cat.tools.map(tool => (
                        <div key={tool.name}
                          className="rounded-lg border border-border p-3 hover:border-primary/25 transition-all group">
                          <div className="flex items-center gap-2 mb-1.5">
                            <code className="text-[11px] font-bold font-mono px-1.5 py-0.5 rounded"
                              style={{ background: `${cat.color}10`, color: cat.color }}>
                              {tool.name}
                            </code>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{tool.description}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground/60 font-semibold">args</span>
                            <span className="text-[0.6rem] text-foreground/70 font-mono">{tool.args}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground w-[180px]">Tool</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Description</th>
                            <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground w-[220px]">Arguments</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cat.tools.map((tool, i) => (
                            <tr key={tool.name} className={`border-b border-border/50 hover:bg-accent/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                              <td className="px-3 py-1.5">
                                <code className="text-[11px] font-bold font-mono" style={{ color: cat.color }}>{tool.name}</code>
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground">{tool.description}</td>
                              <td className="px-3 py-1.5 font-mono text-foreground/60">{tool.args}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// End of component
