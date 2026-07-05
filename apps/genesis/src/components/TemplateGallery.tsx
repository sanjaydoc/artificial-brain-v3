import { X, Brain, MessageSquare, BarChart3, Code2, Mail, Search, ShoppingCart, Shield, BookOpen, Headphones, TrendingUp, Users, DollarSign, FileText, Building, GraduationCap, Heart, Truck, Scale, Briefcase, ClipboardList, PieChart, Megaphone, Target, Receipt, UserPlus, Calendar, Globe, Package, Home, Gavel, Landmark, ShieldCheck, Lightbulb, Zap, Coins, Layers, Bot, Workflow } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  systemPrompt: string
  llmConfig: { mode: string; temperature: number; maxTokens: number; role?: string }
  runtime: { type: string }
  suggestedTools: string[]
}

const TEMPLATES: Template[] = [
  {
    id: 'customer-service',
    name: 'Customer Service Bot',
    description: 'Handles live chat, resolves complaints, processes refunds, escalates when needed',
    icon: <Headphones className="w-5 h-5" />,
    color: '#3b82f6',
    systemPrompt: 'You are a helpful customer service agent. Be empathetic, resolve issues efficiently, and escalate to a human when the issue is beyond your capabilities. Always confirm the customer\'s issue before taking action.',
    llmConfig: { mode: 'simple', temperature: 0.3, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['http_post', 'http_get', 'search_web', 'read_file'],
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Analyzes data, generates reports, creates summaries from files and APIs',
    icon: <BarChart3 className="w-5 h-5" />,
    color: '#16a34a',
    systemPrompt: 'You are a data analyst agent. Analyze data from files and APIs, identify patterns and trends, and produce clear summaries with actionable insights. Use tables and structured formats in your output.',
    llmConfig: { mode: 'role', temperature: 0.2, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['read_file', 'write_file', 'http_get', 'run_python', 'search_code'],
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code changes, finds bugs, suggests improvements, checks style',
    icon: <Code2 className="w-5 h-5" />,
    color: '#8b5cf6',
    systemPrompt: 'You are a senior code reviewer. Review code for bugs, security vulnerabilities, performance issues, and style consistency. Be specific about what to fix and why. Provide corrected code snippets.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 4096, role: 'coder' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['read_file', 'search_code', 'git_diff', 'git_status'],
  },
  {
    id: 'email-summarizer',
    name: 'Email Summarizer',
    description: 'Reads emails/messages, extracts key points, drafts responses',
    icon: <Mail className="w-5 h-5" />,
    color: '#f59e0b',
    systemPrompt: 'You are an email assistant. Summarize incoming emails into bullet points, identify action items, flag urgent messages, and draft concise professional responses when asked.',
    llmConfig: { mode: 'simple', temperature: 0.4, maxTokens: 2048 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['http_get', 'http_post', 'read_file', 'write_file'],
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Searches the web, reads papers, compiles findings into structured reports',
    icon: <Search className="w-5 h-5" />,
    color: '#06b6d4',
    systemPrompt: 'You are a research agent. Search the web for information on a given topic, read and analyze sources, cross-reference findings, and compile a structured research report with citations.',
    llmConfig: { mode: 'role', temperature: 0.5, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['search_web', 'scrape_web', 'http_get', 'write_file'],
  },
  {
    id: 'sales-assistant',
    name: 'Sales Assistant',
    description: 'Qualifies leads, answers product questions, generates quotes',
    icon: <ShoppingCart className="w-5 h-5" />,
    color: '#ec4899',
    systemPrompt: 'You are a sales assistant. Help qualify leads by asking relevant questions, answer product inquiries accurately, and generate price quotes. Be professional, persuasive but not pushy.',
    llmConfig: { mode: 'simple', temperature: 0.5, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['http_get', 'http_post', 'read_file', 'search_web'],
  },
  {
    id: 'security-monitor',
    name: 'Security Monitor',
    description: 'Monitors logs for anomalies, flags suspicious activity, generates alerts',
    icon: <Shield className="w-5 h-5" />,
    color: '#ef4444',
    systemPrompt: 'You are a security monitoring agent. Analyze system logs and events for anomalies, suspicious patterns, and potential security threats. Generate clear alerts with severity levels and recommended actions.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['read_file', 'search_code', 'http_get', 'list_processes', 'get_system_info'],
  },
  {
    id: 'documentation-writer',
    name: 'Documentation Writer',
    description: 'Reads code, generates docs, keeps README and API docs up to date',
    icon: <BookOpen className="w-5 h-5" />,
    color: '#14b8a6',
    systemPrompt: 'You are a documentation writer. Read source code and generate clear, accurate documentation. Write README files, API docs, and inline comments. Keep documentation concise and developer-friendly.',
    llmConfig: { mode: 'role', temperature: 0.3, maxTokens: 4096, role: 'coder' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['read_file', 'write_file', 'search_code', 'read_folder', 'git_status'],
  },
  {
    id: 'chatbot',
    name: 'General Chatbot',
    description: 'Conversational AI for general questions, brainstorming, and creative tasks',
    icon: <MessageSquare className="w-5 h-5" />,
    color: '#7c3aed',
    systemPrompt: 'You are a helpful, friendly AI assistant. Answer questions clearly, help brainstorm ideas, and assist with creative tasks. Be conversational but concise.',
    llmConfig: { mode: 'simple', temperature: 0.7, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['search_web', 'scrape_web', 'http_get'],
  },
  {
    id: 'devops-agent',
    name: 'DevOps Agent',
    description: 'Monitors systems, runs health checks, restarts services, deploys code',
    icon: <Brain className="w-5 h-5" />,
    color: '#f97316',
    systemPrompt: 'You are a DevOps automation agent. Monitor system health, run diagnostic commands, restart failed services, and assist with deployments. Always verify before taking destructive actions.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 2048, role: 'coder' },
    runtime: { type: 'always-on' },
    suggestedTools: ['bash', 'run_command', 'get_system_info', 'list_processes', 'http_get', 'read_file'],
  },

  // ─── MARKETING & CONTENT (6) ─────────────────────────────────────────
  {
    id: 'seo-content-strategist',
    name: 'SEO Content Strategist',
    description: 'Researches keywords, analyzes competitor rankings, generates SEO-optimized content',
    icon: <TrendingUp className="w-5 h-5" />,
    color: '#0ea5e9',
    systemPrompt: 'You are an SEO content strategist agent. Research high-value keywords, analyze competitor rankings and content gaps, audit pages for on-page SEO issues (title tags, meta descriptions, heading hierarchy, internal linking), and generate SEO-optimized blog posts and landing page copy. Output structured reports with keyword clusters and content recommendations.',
    llmConfig: { mode: 'role', temperature: 0.3, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['search_web', 'scrape_web', 'http_get', 'write_file', 'summarize_text', 'csv_to_json'],
  },
  {
    id: 'social-media-manager',
    name: 'Social Media Manager',
    description: 'Drafts platform-specific posts, schedules content, monitors engagement',
    icon: <Megaphone className="w-5 h-5" />,
    color: '#e11d48',
    systemPrompt: 'You are a social media management agent. Draft platform-specific content (Twitter/X, LinkedIn, Instagram captions) tailored to brand voice. Build weekly content calendars, suggest optimal posting times, monitor engagement metrics, and draft engagement responses. Adapt tone per platform. Use tools to research trends and schedule posts via webhooks.',
    llmConfig: { mode: 'simple', temperature: 0.7, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['search_web', 'scrape_web', 'http_post', 'call_api', 'generate_image', 'resize_image', 'cron_schedule', 'send_webhook'],
  },
  {
    id: 'brand-reputation-monitor',
    name: 'Brand Reputation Monitor',
    description: 'Monitors mentions across social/news/reviews, classifies sentiment, alerts on PR risks',
    icon: <ShieldCheck className="w-5 h-5" />,
    color: '#6366f1',
    systemPrompt: 'You are a brand reputation monitoring agent. Continuously monitor social media mentions, news outlets, and review sites for brand references. Classify sentiment (positive/negative/neutral), track trends over time, and immediately alert the team to emerging PR risks or viral negative mentions. Store findings in memory for trend analysis. Deliver daily/weekly reputation summaries.',
    llmConfig: { mode: 'role', temperature: 0.2, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['search_web', 'scrape_web', 'http_get', 'send_slack_message', 'send_email', 'send_notification', 'cron_schedule', 'vector_store_upsert', 'vector_search'],
  },
  {
    id: 'email-campaign-builder',
    name: 'Email Campaign Builder',
    description: 'Generates drip sequences, A/B tests subject lines, segments audiences',
    icon: <Zap className="w-5 h-5" />,
    color: '#f59e0b',
    systemPrompt: 'You are an email marketing agent. Design multi-step drip campaigns, write compelling subject lines with A/B test variations, segment audiences based on behavior and demographics, and structure campaign data for import into email platforms. Follow email deliverability best practices and CAN-SPAM compliance. Output campaign structures as structured CSV/JSON data.',
    llmConfig: { mode: 'simple', temperature: 0.6, maxTokens: 4096 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['send_email', 'write_file', 'read_file', 'csv_to_json', 'json_to_csv', 'http_post', 'call_api', 'query_sql'],
  },
  {
    id: 'competitor-intel',
    name: 'Competitor Intelligence Analyst',
    description: 'Tracks competitor pricing, product launches, job postings, delivers weekly briefings',
    icon: <Target className="w-5 h-5" />,
    color: '#dc2626',
    systemPrompt: 'You are a competitive intelligence agent. Track competitor websites, pricing pages, product launches, press releases, and job postings for strategic signals. Compile weekly intelligence briefings with actionable insights and market positioning analysis. Use browser tools to extract dynamic content and store findings for trend analysis.',
    llmConfig: { mode: 'role', temperature: 0.3, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['search_web', 'scrape_web', 'http_get', 'browser_open', 'browser_navigate', 'browser_extract', 'summarize_text', 'write_file', 'send_email', 'cron_schedule', 'vector_store_upsert'],
  },
  {
    id: 'content-repurposer',
    name: 'Content Repurposer',
    description: 'Transforms long-form content into blog posts, tweets, newsletters, video scripts',
    icon: <Layers className="w-5 h-5" />,
    color: '#a855f7',
    systemPrompt: 'You are a content repurposing agent. Take long-form content (articles, whitepapers, reports) and transform it into multiple formats: blog posts, tweet threads, LinkedIn posts, email newsletters, and video scripts. Preserve key insights while adapting tone and length for each platform. Use summarization for condensing and image generation for visual assets.',
    llmConfig: { mode: 'simple', temperature: 0.6, maxTokens: 4096 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['download_file', 'summarize_text', 'write_file', 'generate_image', 'resize_image', 'convert_to_markdown', 'http_get'],
  },

  // ─── SALES & CRM (5) ────────────────────────────────────────────────
  {
    id: 'lead-qualification',
    name: 'Lead Qualification Agent',
    description: 'Scores inbound leads by firmographic data + engagement, routes to right rep',
    icon: <PieChart className="w-5 h-5" />,
    color: '#0d9488',
    systemPrompt: 'You are a lead qualification agent. Score inbound leads by analyzing firmographic data (company size, industry, revenue), engagement signals (email opens, page visits), and ideal customer profile fit. Assign numerical scores, prioritize for sales outreach, route to the right rep, and explain scoring rationale. Use APIs and databases to enrich lead data.',
    llmConfig: { mode: 'role', temperature: 0.2, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['http_get', 'http_post', 'call_api', 'query_sql', 'scrape_web', 'search_web', 'send_email', 'send_slack_message', 'send_webhook', 'csv_to_json'],
  },
  {
    id: 'proposal-quote-generator',
    name: 'Proposal & Quote Generator',
    description: 'Auto-generates customized sales proposals and pricing from templates + deal data',
    icon: <FileText className="w-5 h-5" />,
    color: '#7c3aed',
    systemPrompt: 'You are a proposal generation agent. Create customized sales proposals, statements of work, and pricing packages by combining deal-specific data with approved templates. Include executive summaries, scope breakdowns, timelines, and pricing tables. Output in markdown format ready for PDF conversion. Ensure all proposals follow company formatting standards.',
    llmConfig: { mode: 'simple', temperature: 0.4, maxTokens: 4096 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['read_file', 'write_file', 'query_sql', 'http_get', 'call_api', 'convert_to_markdown', 'send_email', 'csv_to_json'],
  },
  {
    id: 'crm-hygiene',
    name: 'CRM Hygiene Agent',
    description: 'Audits CRM for duplicates, missing fields, stale deals; auto-cleans records',
    icon: <Workflow className="w-5 h-5" />,
    color: '#ea580c',
    systemPrompt: 'You are a CRM data hygiene agent. Periodically audit CRM data for duplicate contacts, missing required fields, stale deals past expected close dates, and inconsistent formatting (phone numbers, addresses, company names). Auto-clean records where possible, flag anomalies for human review, and generate data quality reports with improvement metrics.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['query_sql', 'http_get', 'http_post', 'call_api', 'send_notification', 'cron_schedule', 'regex_match', 'csv_to_json', 'validate_json'],
  },
  {
    id: 'customer-onboarding',
    name: 'Customer Onboarding Agent',
    description: 'Guides new customers through setup — welcome emails, kickoff calls, milestone tracking',
    icon: <UserPlus className="w-5 h-5" />,
    color: '#2563eb',
    systemPrompt: 'You are a customer onboarding agent. Guide new customers through a structured onboarding flow: send welcome email sequences, assign setup tasks, schedule kickoff calls, track completion milestones, and escalate when onboarding stalls. Personalize the experience based on customer tier and use case. Report on onboarding completion rates.',
    llmConfig: { mode: 'simple', temperature: 0.4, maxTokens: 2048 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['send_email', 'send_slack_message', 'send_webhook', 'http_post', 'call_api', 'query_sql', 'insert_rows', 'cron_schedule', 'set_timer'],
  },
  {
    id: 'churn-prediction',
    name: 'Churn Prediction Agent',
    description: 'Analyzes usage patterns + support tickets to flag at-risk accounts, triggers retention flows',
    icon: <Users className="w-5 h-5" />,
    color: '#be185d',
    systemPrompt: 'You are a churn prediction agent. Analyze customer usage patterns, support ticket frequency, billing history, and engagement decay to identify accounts at risk of churning. Assign churn risk scores, trigger proactive retention workflows (discount offers, check-in calls, feature demos), and alert account managers. Track prediction accuracy over time.',
    llmConfig: { mode: 'role', temperature: 0.2, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['query_sql', 'http_get', 'call_api', 'send_email', 'send_slack_message', 'send_notification', 'cron_schedule', 'evaluate_expression', 'csv_to_json', 'vector_search'],
  },

  // ─── FINANCE & ACCOUNTING (4) ───────────────────────────────────────
  {
    id: 'invoice-processor',
    name: 'Invoice Processing Agent',
    description: 'Extracts data from invoices (PDF/image), matches to POs, flags discrepancies, queues for payment',
    icon: <Receipt className="w-5 h-5" />,
    color: '#15803d',
    systemPrompt: 'You are an invoice processing agent. Extract key fields from invoices (vendor, amount, line items, dates, PO numbers) using PDF parsing and OCR. Match against purchase orders in the database, flag discrepancies in pricing or quantities, and route for appropriate approval. Maintain an audit trail of all actions. Handle PDF, image, and structured invoice formats.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['parse_pdf', 'ocr_image', 'extract_table', 'query_sql', 'insert_rows', 'http_post', 'send_email', 'send_notification', 'validate_json', 'regex_match'],
  },
  {
    id: 'expense-auditor',
    name: 'Expense Report Auditor',
    description: 'Reviews expenses for policy violations, duplicate receipts, suspicious patterns',
    icon: <Coins className="w-5 h-5" />,
    color: '#b45309',
    systemPrompt: 'You are an expense audit agent. Review employee expense reports against company policy, detect duplicate submissions, flag out-of-policy spending (over per-diem limits, unapproved categories, weekend expenses without justification), and identify suspicious patterns. Calculate totals and variances. Generate audit reports with violation details and recommended actions.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['parse_pdf', 'ocr_image', 'extract_table', 'query_sql', 'send_email', 'send_notification', 'evaluate_expression', 'regex_match', 'validate_json'],
  },
  {
    id: 'financial-reporter',
    name: 'Financial Report Generator',
    description: 'Queries accounting DB, calculates KPIs (revenue, margins, runway), produces formatted reports',
    icon: <DollarSign className="w-5 h-5" />,
    color: '#047857',
    systemPrompt: 'You are a financial reporting agent. Query accounting databases to generate P&L summaries, cash flow statements, budget-vs-actual analyses, and KPI dashboards (revenue, margins, burn rate, runway). Highlight significant variances, trends, and areas requiring management attention. Use Python for complex calculations. Present data in tables and structured markdown.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['query_sql', 'describe_schema', 'evaluate_expression', 'csv_to_json', 'json_to_csv', 'write_file', 'convert_to_markdown', 'send_email', 'summarize_text', 'cron_schedule'],
  },
  {
    id: 'accounts-receivable',
    name: 'Accounts Receivable Collector',
    description: 'Tracks overdue invoices, sends escalating payment reminders, alerts finance team',
    icon: <Landmark className="w-5 h-5" />,
    color: '#1d4ed8',
    systemPrompt: 'You are an accounts receivable collection agent. Track overdue invoices from the database, send progressively escalating payment reminders on a schedule (friendly → firm → final notice), log customer responses, and alert the finance team when accounts hit critical thresholds (30/60/90 days). Calculate interest and late fees. Generate aging reports.',
    llmConfig: { mode: 'simple', temperature: 0.3, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['query_sql', 'send_email', 'send_notification', 'send_slack_message', 'cron_schedule', 'set_timer', 'http_post', 'call_api', 'evaluate_expression', 'insert_rows'],
  },

  // ─── HR & RECRUITING (4) ────────────────────────────────────────────
  {
    id: 'resume-screener',
    name: 'Resume Screening Agent',
    description: 'Parses resumes, scores candidates against job requirements, produces ranked shortlist',
    icon: <ClipboardList className="w-5 h-5" />,
    color: '#9333ea',
    systemPrompt: 'You are a resume screening agent. Parse incoming resumes (PDF/image) to extract skills, experience, education, and certifications. Score candidates against job requirement criteria using weighted rubrics. Rank applicants and surface top matches with reasoning. Store embeddings for similarity search across candidate pools. Never discriminate based on protected characteristics.',
    llmConfig: { mode: 'role', temperature: 0.2, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['parse_pdf', 'ocr_image', 'extract_table', 'summarize_text', 'vector_store_upsert', 'vector_search', 'create_embedding', 'query_sql', 'insert_rows', 'send_email', 'regex_match'],
  },
  {
    id: 'employee-onboarding',
    name: 'Employee Onboarding Coordinator',
    description: 'Provisions accounts, assigns training, schedules orientation, tracks completion',
    icon: <Briefcase className="w-5 h-5" />,
    color: '#059669',
    systemPrompt: 'You are an employee onboarding coordinator agent. Automate the complete new-hire workflow: send welcome emails, trigger account provisioning requests via APIs, assign training modules, schedule orientation sessions, distribute day-1 checklists, and track completion across departments. Ensure nothing falls through the cracks during the first 90 days.',
    llmConfig: { mode: 'simple', temperature: 0.3, maxTokens: 2048 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['send_email', 'send_slack_message', 'http_post', 'call_api', 'query_sql', 'insert_rows', 'cron_schedule', 'set_timer', 'write_file'],
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes & Action Items',
    description: 'Processes meeting transcripts, generates summaries, extracts action items with owners',
    icon: <Bot className="w-5 h-5" />,
    color: '#4f46e5',
    systemPrompt: 'You are a meeting notes agent. Process meeting transcripts or recordings to generate structured summaries with key decisions, discussion points, and extracted action items (each with an owner and deadline). Distribute notes to all attendees via email or Slack. Use regex to identify action patterns ("will do", "by Friday", "assigned to"). Format output in clean markdown.',
    llmConfig: { mode: 'simple', temperature: 0.3, maxTokens: 4096 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['summarize_text', 'read_file', 'write_file', 'send_email', 'send_slack_message', 'convert_to_markdown', 'regex_match'],
  },
  {
    id: 'pulse-survey',
    name: 'Employee Pulse Survey Agent',
    description: 'Distributes satisfaction surveys, aggregates anonymized results, identifies trends',
    icon: <Calendar className="w-5 h-5" />,
    color: '#0891b2',
    systemPrompt: 'You are an employee pulse survey agent. Distribute periodic satisfaction surveys via email or Slack, aggregate anonymized results into the database, calculate department-level engagement scores, identify sentiment trends over time, and generate actionable insights for HR leadership. Flag sudden drops in satisfaction. Schedule recurring survey cycles.',
    llmConfig: { mode: 'role', temperature: 0.3, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['send_email', 'send_slack_message', 'query_sql', 'insert_rows', 'write_file', 'csv_to_json', 'summarize_text', 'cron_schedule', 'evaluate_expression'],
  },

  // ─── OPERATIONS & LOGISTICS (4) ─────────────────────────────────────
  {
    id: 'inventory-management',
    name: 'Inventory Management Agent',
    description: 'Monitors stock levels, predicts demand, triggers reorder alerts, creates purchase orders',
    icon: <Package className="w-5 h-5" />,
    color: '#ca8a04',
    systemPrompt: 'You are an inventory management agent. Monitor stock levels across all warehouse locations in real time via database queries and API calls. Trigger reorder alerts when inventory drops below safety thresholds, forecast demand based on historical patterns, suggest optimal reorder quantities, and auto-generate purchase orders. Flag slow-moving inventory and stockout risks.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 2048, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['query_sql', 'insert_rows', 'http_get', 'http_post', 'call_api', 'send_email', 'send_notification', 'send_webhook', 'cron_schedule', 'evaluate_expression', 'csv_to_json'],
  },
  {
    id: 'vendor-evaluation',
    name: 'Vendor Evaluation Agent',
    description: 'Analyzes supplier performance, compares against SLA benchmarks, produces scorecards',
    icon: <Building className="w-5 h-5" />,
    color: '#475569',
    systemPrompt: 'You are a vendor evaluation agent. Collect and analyze supplier performance data — delivery times, quality scores, pricing trends, responsiveness — compare against SLA benchmarks, and produce quarterly vendor scorecards. Research vendors online for additional context. Flag underperformers and recommend corrective actions or vendor switches.',
    llmConfig: { mode: 'role', temperature: 0.2, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['query_sql', 'describe_schema', 'http_get', 'scrape_web', 'parse_pdf', 'extract_table', 'summarize_text', 'write_file', 'csv_to_json', 'evaluate_expression', 'send_email'],
  },
  {
    id: 'it-helpdesk-triager',
    name: 'IT Helpdesk Triager',
    description: 'Classifies support tickets, assigns to teams, auto-resolves known issues, escalates complex',
    icon: <Truck className="w-5 h-5" />,
    color: '#d97706',
    systemPrompt: 'You are an IT helpdesk triage agent. Classify incoming support tickets by category (access, hardware, software, network) and urgency (critical/high/medium/low). Assign to the correct team based on category. Attempt auto-resolution for known issues (password resets, VPN guides, common errors) using your knowledge base. Escalate complex problems with full context. Track resolution times.',
    llmConfig: { mode: 'simple', temperature: 0.2, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['http_get', 'http_post', 'call_api', 'send_email', 'send_slack_message', 'send_notification', 'query_sql', 'insert_rows', 'vector_search', 'memory_recall', 'summarize_text', 'run_command'],
  },
  {
    id: 'meeting-scheduler',
    name: 'Meeting Scheduler',
    description: 'Coordinates multi-participant scheduling, finds optimal times, sends invites, handles reschedules',
    icon: <Globe className="w-5 h-5" />,
    color: '#164e63',
    systemPrompt: 'You are a meeting scheduling agent. Coordinate meeting scheduling across multiple participants by checking availability via APIs, suggesting optimal time slots, sending calendar invites via email, and handling rescheduling requests. Optimize for minimal participant conflicts and time zone differences. Confirm attendance and send reminders before meetings.',
    llmConfig: { mode: 'simple', temperature: 0.2, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['send_email', 'send_slack_message', 'http_get', 'http_post', 'call_api', 'set_timer', 'cron_schedule', 'regex_match'],
  },

  // ─── LEGAL & COMPLIANCE (3) ─────────────────────────────────────────
  {
    id: 'contract-reviewer',
    name: 'Contract Review Agent',
    description: 'Analyzes contracts for risky clauses, missing terms, compliance gaps, produces redline summary',
    icon: <Scale className="w-5 h-5" />,
    color: '#334155',
    systemPrompt: 'You are a contract review agent. Analyze contracts and legal agreements to identify risky clauses (unlimited liability, auto-renewal, broad IP assignment), missing standard terms, and regulatory compliance gaps. Use vector search against your clause library for comparison. Provide clause-by-clause risk assessment with suggested redlines. Always note that final review should involve qualified legal counsel.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['parse_pdf', 'ocr_image', 'read_file', 'summarize_text', 'convert_to_markdown', 'vector_search', 'vector_store_upsert', 'create_embedding', 'write_file', 'regex_match', 'send_email'],
  },
  {
    id: 'regulatory-compliance',
    name: 'Regulatory Compliance Monitor',
    description: 'Tracks regulation changes (GDPR/SOX/HIPAA), cross-references company policies, alerts compliance',
    icon: <Gavel className="w-5 h-5" />,
    color: '#1e3a5f',
    systemPrompt: 'You are a regulatory compliance monitoring agent. Track changes in relevant regulations (GDPR, SOX, HIPAA, CCPA) by monitoring government websites, legal databases, and news sources. Cross-reference against company policies to identify compliance gaps. Alert compliance officers to required policy updates with deadlines. Store regulatory changes in vector memory for trend analysis.',
    llmConfig: { mode: 'role', temperature: 0.2, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'always-on' },
    suggestedTools: ['search_web', 'scrape_web', 'http_get', 'browser_navigate', 'browser_extract', 'summarize_text', 'vector_store_upsert', 'vector_search', 'send_email', 'send_notification', 'cron_schedule'],
  },
  {
    id: 'privacy-dsar',
    name: 'Privacy/DSAR Handler',
    description: 'Processes data subject access requests — locates data, compiles packages, redacts PII, generates response',
    icon: <ShieldCheck className="w-5 h-5" />,
    color: '#4338ca',
    systemPrompt: 'You are a privacy and DSAR handling agent. Process Data Subject Access Requests under GDPR/CCPA: locate personal data across database systems, compile data packages, redact sensitive fields using regex patterns, hash identifiers for anonymization, and generate compliant response documents within statutory deadlines. Track request status and set deadline reminders.',
    llmConfig: { mode: 'role', temperature: 0.1, maxTokens: 4096, role: 'reasoning' },
    runtime: { type: 'on-demand' },
    suggestedTools: ['query_sql', 'describe_schema', 'http_get', 'call_api', 'regex_match', 'write_file', 'send_email', 'set_timer', 'summarize_text', 'hash_string'],
  },

  // ─── INDUSTRY-SPECIFIC (4) ─────────────────────────────────────────
  {
    id: 'property-listing',
    name: 'Property Listing Agent',
    description: 'Aggregates property data, generates listing descriptions, creates market analyses',
    icon: <Home className="w-5 h-5" />,
    color: '#78716c',
    systemPrompt: 'You are a real estate listing agent. Aggregate property data from web searches and APIs, generate compelling listing descriptions, pull comparable sales for pricing recommendations, calculate investment ROI metrics (cap rate, cash-on-cash return), and match buyer criteria to available listings. Support both residential and commercial properties.',
    llmConfig: { mode: 'simple', temperature: 0.5, maxTokens: 4096 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['http_get', 'call_api', 'scrape_web', 'search_web', 'write_file', 'summarize_text', 'generate_image', 'send_email', 'csv_to_json', 'evaluate_expression'],
  },
  {
    id: 'patient-intake',
    name: 'Patient Intake Agent',
    description: 'Handles appointment scheduling, pre-visit forms, insurance verification, provider routing',
    icon: <Heart className="w-5 h-5" />,
    color: '#e11d48',
    systemPrompt: 'You are a patient intake and scheduling agent. Handle appointment scheduling, collect pre-visit intake forms, verify insurance eligibility via API calls, and route patients to the right provider based on symptoms and availability. Send appointment reminders on schedule. Always err on the side of caution and clearly state you are not a medical professional.',
    llmConfig: { mode: 'simple', temperature: 0.2, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['send_email', 'send_notification', 'http_get', 'http_post', 'call_api', 'query_sql', 'insert_rows', 'set_timer', 'cron_schedule', 'parse_pdf', 'validate_json'],
  },
  {
    id: 'course-quiz-generator',
    name: 'Course & Quiz Generator',
    description: 'Generates course outlines, lessons, quizzes, flashcards from learning objectives + source material',
    icon: <GraduationCap className="w-5 h-5" />,
    color: '#4338ca',
    systemPrompt: 'You are an educational course builder agent. Take learning objectives and source material, then generate structured course outlines, lesson content, practice quizzes with answer keys, and flashcards across multiple difficulty levels. Format for LMS upload (YAML/JSON). Support multiple formats (text, slide outlines, video scripts). Follow instructional design best practices.',
    llmConfig: { mode: 'simple', temperature: 0.5, maxTokens: 4096 },
    runtime: { type: 'on-demand' },
    suggestedTools: ['read_file', 'parse_pdf', 'summarize_text', 'convert_to_markdown', 'write_file', 'http_post', 'call_api', 'vector_search', 'create_embedding', 'validate_json', 'yaml_parse'],
  },
  {
    id: 'order-returns',
    name: 'Order & Returns Agent',
    description: 'Processes return/exchange requests, validates eligibility, issues refunds, updates inventory',
    icon: <ShoppingCart className="w-5 h-5" />,
    color: '#c026d3',
    systemPrompt: 'You are an order and returns management agent. Process customer return and exchange requests: validate eligibility against return policies using regex pattern matching, calculate refund amounts, issue refunds or store credits via API calls, generate return shipping labels, update inventory and order status in the database, and notify customers at each step.',
    llmConfig: { mode: 'simple', temperature: 0.2, maxTokens: 2048 },
    runtime: { type: 'always-on' },
    suggestedTools: ['http_get', 'http_post', 'call_api', 'query_sql', 'insert_rows', 'send_email', 'send_notification', 'send_webhook', 'validate_json', 'regex_match', 'evaluate_expression'],
  },
]

interface Props {
  onSelect: (template: Template) => void
  onClose: () => void
}

export function TemplateGallery({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-kanit font-semibold">Agent Templates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{TEMPLATES.length} pre-built agents — click to add to canvas</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => onSelect(t)}
                className="rounded-xl border border-border p-4 text-left hover:border-primary/40 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg grid place-items-center border shrink-0"
                    style={{ background: `${t.color}10`, borderColor: `${t.color}25`, color: t.color }}>
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{t.description}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        t.runtime.type === 'always-on' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {t.runtime.type === 'always-on' ? 'LIVE' : 'ON-DEMAND'}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{t.suggestedTools.length} tools</span>
                      <span className="text-[9px] text-muted-foreground">temp: {t.llmConfig.temperature}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { TEMPLATES }
export type { Template }
