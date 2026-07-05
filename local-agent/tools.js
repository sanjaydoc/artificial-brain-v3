/**
 * Artificial Brain v3 — 144 Tool Implementations
 * Pure Node.js — zero Python dependencies.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import crypto from 'crypto';
import { push, backupFile, backupFolder } from './undo.js';

const HOME = os.homedir();
const WORKSPACE = path.join(HOME, 'Desktop', 'All-projects', 'inventor-studio', 'artificial-brain-v3', 'workspace');

function safePath(raw) {
  if (!raw) return WORKSPACE;
  const p = path.resolve(raw);
  return p;
}

function ok(data = {}) { return { ok: true, ...data }; }
function fail(error) { return { ok: false, error }; }

// ── File / Folder Tools ─────────────────────────────────────────────────────

export function run_command({ command = '', timeout = 10 }) {
  if (!command.trim()) return fail('empty command');
  try {
    const stdout = execSync(command, { cwd: WORKSPACE, timeout: timeout * 1000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.slice(-4000), returncode: 0 });
  } catch (e) {
    if (e.killed) return fail(`timed out after ${timeout}s`);
    return ok({ stdout: (e.stdout || '').slice(-4000), stderr: (e.stderr || '').slice(-1000), returncode: e.status ?? 1 });
  }
}

export function bash({ command = '', timeout = 30, cwd = '' }) {
  if (!command.trim()) return fail('empty command');
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const stdout = execSync(command, { cwd: workDir, timeout: timeout * 1000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.slice(-6000), returncode: 0, cwd: workDir });
  } catch (e) {
    if (e.killed) return fail(`timed out after ${timeout}s`);
    return ok({ stdout: (e.stdout || '').slice(-6000), stderr: (e.stderr || '').slice(-2000), returncode: e.status ?? 1, cwd: workDir });
  }
}

export function read_file({ path: filePath = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    const text = fs.readFileSync(p, 'utf8');
    return ok({ path: p, content: text.slice(0, 8000), truncated: text.length > 8000 });
  } catch (e) { return fail(e.message); }
}

export function read_file_lines({ path: filePath = '', start = 1, end = 0 }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    const total = lines.length;
    const s = Math.max(0, Number(start) - 1);
    const e = Number(end) > 0 ? Number(end) : total;
    const chunk = lines.slice(s, e);
    return ok({ path: p, lines: chunk, start: Number(start), end: s + chunk.length, total });
  } catch (e) { return fail(e.message); }
}

export function write_file({ path: filePath = '', content = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    if (fs.existsSync(p)) {
      const orig = fs.readFileSync(p, 'utf8');
      push(`write_file ${path.basename(p)}`, () => fs.writeFileSync(p, orig));
    } else {
      push(`write_file ${path.basename(p)} (new)`, () => { try { fs.unlinkSync(p); } catch {} });
    }
    fs.writeFileSync(p, content);
    return ok({ path: p, bytes: content.length });
  } catch (e) { return fail(e.message); }
}

export function create_file({ path: filePath = '', content = '' }) {
  return write_file({ path: filePath, content });
}

export function append_file({ path: filePath = '', content = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const orig = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    push(`append_file ${path.basename(p)}`, () => fs.writeFileSync(p, orig));
    fs.appendFileSync(p, content);
    return ok({ path: p, appended_bytes: content.length });
  } catch (e) { return fail(e.message); }
}

export function edit_file({ path: filePath = '', old_text = '', new_text = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    const text = fs.readFileSync(p, 'utf8');
    if (old_text && !text.includes(old_text)) return fail('old_text not found in file');
    push(`edit_file ${path.basename(p)}`, () => fs.writeFileSync(p, text));
    const updated = old_text ? text.replace(old_text, new_text) : new_text;
    fs.writeFileSync(p, updated);
    return ok({ path: p });
  } catch (e) { return fail(e.message); }
}

export function delete_file({ path: filePath = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    const bk = backupFile(p);
    push(`delete_file ${path.basename(p)}`, () => fs.copyFileSync(bk, p));
    fs.unlinkSync(p);
    return ok({ path: p });
  } catch (e) { return fail(e.message); }
}

export function create_folder({ path: folderPath = '' }) {
  if (!folderPath) return fail('path required');
  const p = safePath(folderPath);
  try {
    const existed = fs.existsSync(p);
    fs.mkdirSync(p, { recursive: true });
    if (!existed) push(`create_folder ${path.basename(p)}`, () => { try { fs.rmSync(p, { recursive: true }); } catch {} });
    return ok({ path: p });
  } catch (e) { return fail(e.message); }
}

export function delete_folder({ path: folderPath = '' }) {
  if (!folderPath) return fail('path required');
  const p = safePath(folderPath);
  if (!fs.existsSync(p)) return fail('folder not found');
  try {
    const bk = backupFolder(p);
    push(`delete_folder ${path.basename(p)}`, () => fs.cpSync(bk, p, { recursive: true }));
    fs.rmSync(p, { recursive: true });
    return ok({ path: p });
  } catch (e) { return fail(e.message); }
}

export function read_folder({ path: folderPath = '', depth = 2 }) {
  const base = folderPath ? safePath(folderPath) : WORKSPACE;
  if (!fs.existsSync(base)) return fail('folder not found');
  const entries = [];
  const maxDepth = Number(depth);

  function walk(dir, d) {
    if (entries.length >= 500) return;
    let items;
    try { items = fs.readdirSync(dir).sort(); } catch { return; }
    for (const name of items) {
      if (entries.length >= 500) return;
      const full = path.join(dir, name);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      entries.push({
        path: path.relative(base, full),
        type: stat.isDirectory() ? 'dir' : 'file',
        size: stat.isFile() ? stat.size : null,
      });
      if (stat.isDirectory() && d < maxDepth) walk(full, d + 1);
    }
  }

  walk(base, 1);
  return ok({ path: base, entries, count: entries.length });
}

export function list_directory({ path: dirPath = '' }) {
  const p = dirPath ? safePath(dirPath) : WORKSPACE;
  if (!fs.existsSync(p)) return fail('path not found');
  try {
    const stat = fs.statSync(p);
    if (!stat.isDirectory()) return fail('path is not a directory');
    const entries = fs.readdirSync(p).sort().map((name) => {
      const full = path.join(p, name);
      let s;
      try { s = fs.statSync(full); } catch { return { name, type: 'unknown', size: null }; }
      return { name, type: s.isDirectory() ? 'dir' : 'file', size: s.isFile() ? s.size : null };
    });
    return ok({ path: p, entries, count: entries.length });
  } catch (e) { return fail(e.message); }
}

export function move_file({ src = '', dst = '' }) {
  if (!src || !dst) return fail('src and dst required');
  const s = safePath(src), d = safePath(dst);
  if (!fs.existsSync(s)) return fail('source not found');
  try {
    // If dst is an existing directory, move source inside it
    let finalDst = d;
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
      finalDst = path.join(d, path.basename(s));
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
    }
    push(`move_file ${path.basename(s)} -> ${path.basename(finalDst)}`, () => fs.renameSync(finalDst, s));
    fs.renameSync(s, finalDst);
    return ok({ src: s, dst: finalDst });
  } catch (e) { return fail(e.message); }
}

export function move_folder({ src = '', dst = '' }) {
  return move_file({ src, dst });
}

export function copy_file({ src = '', dst = '' }) {
  if (!src || !dst) return fail('src and dst required');
  const s = safePath(src), d = safePath(dst);
  if (!fs.existsSync(s)) return fail('source not found');
  try {
    fs.mkdirSync(path.dirname(d), { recursive: true });
    push(`copy_file -> ${path.basename(d)}`, () => { try { fs.unlinkSync(d); } catch {} });
    fs.copyFileSync(s, d);
    return ok({ src: s, dst: d });
  } catch (e) { return fail(e.message); }
}

export function search_code({ pattern = '', glob: fileGlob = '**/*', base = '.' }) {
  if (!pattern) return fail('empty pattern');
  const baseDir = safePath(base);
  const matches = [];
  const regex = new RegExp(pattern);

  function walk(dir) {
    if (matches.length >= 50) return;
    let items;
    try { items = fs.readdirSync(dir); } catch { return; }
    for (const name of items) {
      if (matches.length >= 50) return;
      const full = path.join(dir, name);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory()) {
        if (['node_modules', '.git', '__pycache__', 'venv', 'dist'].includes(name)) continue;
        walk(full);
      } else if (stat.isFile()) {
        try {
          const text = fs.readFileSync(full, 'utf8');
          const lines = text.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              matches.push({ file: full, line: i + 1, content: lines[i].trim() });
              if (matches.length >= 50) return;
            }
          }
        } catch {}
      }
    }
  }

  walk(baseDir);
  return ok({ matches, count: matches.length });
}

// ── Archive Tools ───────────────────────────────────────────────────────────

export function zip_folder({ src = '', dst = '' }) {
  if (!src) return fail('src required');
  const s = safePath(src);
  if (!fs.existsSync(s)) return fail('source not found');
  const out = dst ? safePath(dst) : s + '.zip';
  try {
    // Use tar on Unix, powershell Compress-Archive on Windows
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Compress-Archive -Path '${s}\\*' -DestinationPath '${out}' -Force"`, { timeout: 60000 });
    } else {
      execSync(`cd "${path.dirname(s)}" && zip -r "${out}" "${path.basename(s)}"`, { timeout: 60000 });
    }
    const stat = fs.statSync(out);
    return ok({ zip: out, size: stat.size });
  } catch (e) { return fail(e.message); }
}

export function unzip_file({ src = '', dst = '' }) {
  if (!src) return fail('src required');
  const s = safePath(src);
  if (!fs.existsSync(s)) return fail('zip file not found');
  const d = dst ? safePath(dst) : path.join(path.dirname(s), path.basename(s, path.extname(s)));
  try {
    fs.mkdirSync(d, { recursive: true });
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Expand-Archive -Path '${s}' -DestinationPath '${d}' -Force"`, { timeout: 60000 });
    } else {
      execSync(`unzip -o "${s}" -d "${d}"`, { timeout: 60000 });
    }
    return ok({ extracted_to: d });
  } catch (e) { return fail(e.message); }
}

// ── Git Tools ───────────────────────────────────────────────────────────────

export function git_status({ cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const stdout = execSync('git status', { cwd: workDir, timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_diff({ cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const stdout = execSync('git diff', { cwd: workDir, timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.slice(-8000), returncode: 0 });
  } catch (e) {
    return ok({ stdout: (e.stdout || '').slice(-8000), stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_commit({ message = '', cwd = '' }) {
  if (!message) return fail('message required');
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    execSync('git add -A', { cwd: workDir, timeout: 15000, encoding: 'utf8' });
    const stdout = execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: workDir, timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ commit: stdout, returncode: 0 });
  } catch (e) {
    return ok({ commit: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

// ── Git Advanced Tools ─────────────────────────────────────────────────────

export function git_log({ cwd = '', limit = 10 }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const stdout = execSync(`git log --oneline -${Number(limit)}`, { cwd: workDir, timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_add({ files = '', cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const cmd = files ? `git add ${files}` : 'git add -A';
    const stdout = execSync(cmd, { cwd: workDir, timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_branch({ name = '', delete: del = false, cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    let cmd;
    if (name && del) cmd = `git branch -d ${name}`;
    else if (name) cmd = `git branch ${name}`;
    else cmd = 'git branch --list';
    const stdout = execSync(cmd, { cwd: workDir, timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_checkout({ branch = '', create = false, cwd = '' }) {
  if (!branch) return fail('branch required');
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const cmd = create ? `git checkout -b ${branch}` : `git checkout ${branch}`;
    const stdout = execSync(cmd, { cwd: workDir, timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_merge({ branch = '', cwd = '' }) {
  if (!branch) return fail('branch required');
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const stdout = execSync(`git merge ${branch}`, { cwd: workDir, timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_push({ remote = 'origin', branch = '', cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const cmd = branch ? `git push ${remote} ${branch}` : 'git push';
    const stdout = execSync(cmd, { cwd: workDir, timeout: 60000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_pull({ remote = 'origin', branch = '', cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const cmd = branch ? `git pull ${remote} ${branch}` : 'git pull';
    const stdout = execSync(cmd, { cwd: workDir, timeout: 60000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function git_clone({ url = '', dst = '', cwd = '' }) {
  if (!url) return fail('url required');
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    const cmd = dst ? `git clone ${url} ${dst}` : `git clone ${url}`;
    const stdout = execSync(cmd, { cwd: workDir, timeout: 120000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

// ── Database & SQL Tools ───────────────────────────────────────────────────

export function query_sql({ query = '', database = '', type = 'sqlite' }) {
  if (!query) return fail('query required');
  if (!database) return fail('database path required');
  if (type !== 'sqlite') return ok({ message: `For ${type} databases, use the bash tool with the appropriate CLI client (mysql, psql, etc.)` });
  const dbPath = safePath(database);
  const tmpFile = path.join(os.tmpdir(), `brain_sql_${Date.now()}.sql`);
  try {
    fs.writeFileSync(tmpFile, query);
    const stdout = execSync(`sqlite3 "${dbPath}" < "${tmpFile}"`, { timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
    try { fs.unlinkSync(tmpFile); } catch {}
    return ok({ rows: stdout.trim(), returncode: 0 });
  } catch (e) {
    try { fs.unlinkSync(tmpFile); } catch {}
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function describe_schema({ database = '', type = 'sqlite' }) {
  if (!database) return fail('database path required');
  if (type !== 'sqlite') return ok({ message: `For ${type} databases, use the bash tool with the appropriate CLI client.` });
  const dbPath = safePath(database);
  try {
    const stdout = execSync(`sqlite3 "${dbPath}" ".schema"`, { timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
    return ok({ schema: stdout.trim(), returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function create_table({ database = '', sql = '', type = 'sqlite' }) {
  if (!sql) return fail('sql required');
  if (!database) return fail('database path required');
  if (type !== 'sqlite') return ok({ message: `For ${type} databases, use the bash tool.` });
  const dbPath = safePath(database);
  try {
    const stdout = execSync(`sqlite3 "${dbPath}" "${sql.replace(/"/g, '\\"')}"`, { timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
    return ok({ result: stdout.trim(), returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function insert_rows({ database = '', sql = '', type = 'sqlite' }) {
  if (!sql) return fail('sql required');
  if (!database) return fail('database path required');
  if (type !== 'sqlite') return ok({ message: `For ${type} databases, use the bash tool.` });
  const dbPath = safePath(database);
  const tmpFile = path.join(os.tmpdir(), `brain_insert_${Date.now()}.sql`);
  try {
    fs.writeFileSync(tmpFile, sql);
    const stdout = execSync(`sqlite3 "${dbPath}" < "${tmpFile}"`, { timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
    try { fs.unlinkSync(tmpFile); } catch {}
    return ok({ result: stdout.trim(), returncode: 0 });
  } catch (e) {
    try { fs.unlinkSync(tmpFile); } catch {}
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function run_migration({ database = '', file = '', type = 'sqlite' }) {
  if (!file) return fail('migration file required');
  if (!database) return fail('database path required');
  if (type !== 'sqlite') return ok({ message: `For ${type} databases, use the bash tool.` });
  const dbPath = safePath(database);
  const migrationPath = safePath(file);
  if (!fs.existsSync(migrationPath)) return fail('migration file not found');
  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const tmpFile = path.join(os.tmpdir(), `brain_migration_${Date.now()}.sql`);
    fs.writeFileSync(tmpFile, sql);
    const stdout = execSync(`sqlite3 "${dbPath}" < "${tmpFile}"`, { timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
    try { fs.unlinkSync(tmpFile); } catch {}
    return ok({ result: stdout.trim(), returncode: 0, migration: migrationPath });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

// ── Browser Automation Tools ───────────────────────────────────────────────

export async function browser_open({ url = '' }) {
  if (!url) return fail('url required');
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Brain Agent)' } });
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const html = await res.text();
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title';
    // Extract text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);
    return ok({ url, title, text, length: text.length });
  } catch (e) { return fail(e.message); }
}

export function browser_click({ selector = '', url = '' }) {
  return ok({
    message: 'browser_click requires a running browser automation agent. To click elements on a page, use the bash tool to run a Node.js script with Puppeteer:',
    example: `bash({ command: 'node -e "const p=require(\\'puppeteer\\');(async()=>{const b=await p.launch();const pg=await b.newPage();await pg.goto(\\'${url}\\');await pg.click(\\'${selector}\\');await b.close()})()"' })`,
    suggestion: 'Install puppeteer first: npm install puppeteer'
  });
}

export function browser_type_text({ selector = '', text = '', url = '' }) {
  return ok({
    message: 'browser_type_text requires a running browser automation agent. To type text into elements, use the bash tool to run a Node.js script with Puppeteer:',
    example: `bash({ command: 'node -e "const p=require(\\'puppeteer\\');(async()=>{const b=await p.launch();const pg=await b.newPage();await pg.goto(\\'${url}\\');await pg.type(\\'${selector}\\',\\'${text}\\');await b.close()})()"' })`,
    suggestion: 'Install puppeteer first: npm install puppeteer'
  });
}

export async function browser_navigate({ url = '', action = 'goto' }) {
  if (!url) return fail('url required');
  if (action === 'goto') {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Brain Agent)' } });
      if (!res.ok) return fail(`HTTP ${res.status}`);
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'No title';
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);
      return ok({ url, title, text, length: text.length });
    } catch (e) { return fail(e.message); }
  }
  return ok({
    message: `Action '${action}' requires a running browser agent. Use Puppeteer via the bash tool for back/forward/reload actions.`,
    suggestion: 'Install puppeteer first: npm install puppeteer'
  });
}

export async function browser_extract({ url = '', selector = '' }) {
  if (!url) return fail('url required');
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Brain Agent)' } });
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const html = await res.text();
    if (selector) {
      // Basic tag-based extraction using regex
      const tagMatch = selector.match(/^(\w+)/);
      if (tagMatch) {
        const tag = tagMatch[1];
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
        const matches = [];
        let m;
        while ((m = regex.exec(html)) && matches.length < 50) {
          matches.push(m[1].replace(/<[^>]+>/g, '').trim());
        }
        return ok({ url, selector, matches, count: matches.length });
      }
      // Class/ID based - try to find
      const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
      const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
      if (classMatch) {
        const regex = new RegExp(`class="[^"]*${classMatch[1]}[^"]*"[^>]*>([\\s\\S]*?)<\\/`, 'gi');
        const matches = [];
        let m;
        while ((m = regex.exec(html)) && matches.length < 50) {
          matches.push(m[1].replace(/<[^>]+>/g, '').trim());
        }
        return ok({ url, selector, matches, count: matches.length });
      }
      if (idMatch) {
        const regex = new RegExp(`id="${idMatch[1]}"[^>]*>([\\s\\S]*?)<\\/`, 'i');
        const m = regex.exec(html);
        return ok({ url, selector, matches: m ? [m[1].replace(/<[^>]+>/g, '').trim()] : [], count: m ? 1 : 0 });
      }
    }
    // Return full page text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);
    return ok({ url, text, length: text.length });
  } catch (e) { return fail(e.message); }
}

// ── Document Processing Tools ──────────────────────────────────────────────

export function parse_pdf({ path: filePath = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    // Try pdftotext first
    const stdout = execSync(`pdftotext "${p}" -`, { timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ path: p, text: stdout.slice(0, 8000), length: stdout.length });
  } catch {
    // Fallback: read raw and extract text between stream markers
    try {
      const buf = fs.readFileSync(p);
      const raw = buf.toString('latin1');
      const texts = [];
      const streamRegex = /stream\s*\n([\s\S]*?)\nendstream/g;
      let m;
      while ((m = streamRegex.exec(raw))) {
        const chunk = m[1].replace(/[^\x20-\x7E\n\r\t]/g, '').trim();
        if (chunk.length > 10) texts.push(chunk);
      }
      const text = texts.join('\n').slice(0, 8000);
      return ok({ path: p, text: text || 'Could not extract text. Install pdftotext (poppler-utils) for better results.', fallback: true });
    } catch (e) { return fail(e.message); }
  }
}

export function ocr_image({ path: filePath = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    const stdout = execSync(`tesseract "${p}" stdout`, { timeout: 60000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ path: p, text: stdout.trim(), length: stdout.trim().length });
  } catch (e) {
    return fail('Tesseract OCR not available. Install tesseract: https://github.com/tesseract-ocr/tesseract. Error: ' + (e.stderr || e.message));
  }
}

export function convert_to_markdown({ path: filePath = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    const text = fs.readFileSync(p, 'utf8');
    const ext = path.extname(p).toLowerCase();
    if (ext === '.html' || ext === '.htm') {
      // Convert HTML to markdown-ish text
      let md = text;
      // Headers
      md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n');
      md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n');
      md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n');
      md = md.replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n');
      md = md.replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '##### $1\n');
      md = md.replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '###### $1\n');
      // Bold/italic
      md = md.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
      md = md.replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, '*$2*');
      // Links
      md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
      // Lists
      md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
      // Paragraphs/breaks
      md = md.replace(/<br\s*\/?>/gi, '\n');
      md = md.replace(/<\/p>/gi, '\n\n');
      md = md.replace(/<p[^>]*>/gi, '');
      // Code
      md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');
      md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```');
      // Strip remaining tags
      md = md.replace(/<script[\s\S]*?<\/script>/gi, '');
      md = md.replace(/<style[\s\S]*?<\/style>/gi, '');
      md = md.replace(/<[^>]+>/g, '');
      // Clean up whitespace
      md = md.replace(/\n{3,}/g, '\n\n').trim();
      return ok({ path: p, markdown: md.slice(0, 8000), length: md.length });
    }
    // Non-HTML: return raw text
    return ok({ path: p, markdown: text.slice(0, 8000), length: text.length, note: 'Non-HTML file returned as-is' });
  } catch (e) { return fail(e.message); }
}

export function extract_table({ path: filePath = '', format = 'csv' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    const text = fs.readFileSync(p, 'utf8');
    const ext = path.extname(p).toLowerCase();
    if (ext === '.csv' || format === 'csv') {
      // Parse CSV
      const lines = text.trim().split('\n');
      if (lines.length === 0) return ok({ tables: [], count: 0 });
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });
      return ok({ headers, rows, count: rows.length });
    }
    if (ext === '.html' || ext === '.htm') {
      // Extract HTML tables
      const tables = [];
      const tableRegex = /<table[\s\S]*?<\/table>/gi;
      let tm;
      while ((tm = tableRegex.exec(text)) && tables.length < 10) {
        const tableHtml = tm[0];
        const rows = [];
        const rowRegex = /<tr[\s\S]*?<\/tr>/gi;
        let rm;
        while ((rm = rowRegex.exec(tableHtml))) {
          const cells = [];
          const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
          let cm;
          while ((cm = cellRegex.exec(rm[0]))) {
            cells.push(cm[1].replace(/<[^>]+>/g, '').trim());
          }
          rows.push(cells);
        }
        tables.push(rows);
      }
      return ok({ tables, count: tables.length });
    }
    return ok({ text: text.slice(0, 4000), note: 'Could not detect table format. Returning raw text.' });
  } catch (e) { return fail(e.message); }
}

export function summarize_text({ text = '', max_length = 500 }) {
  if (!text) return fail('text required');
  const maxLen = Number(max_length);
  if (text.length <= maxLen) return ok({ summary: text, original_length: text.length, truncated: false });
  // Smart sentence breaking
  const truncated = text.slice(0, maxLen);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  const summary = lastSentenceEnd > maxLen * 0.3
    ? truncated.slice(0, lastSentenceEnd + 1)
    : truncated + '...';
  return ok({ summary, original_length: text.length, truncated: true });
}

// ── Data Transformation Tools ──────────────────────────────────────────────

export function csv_to_json({ input = '', path: filePath = '' }) {
  let csvText = input;
  if (!csvText && filePath) {
    const p = safePath(filePath);
    if (!fs.existsSync(p)) return fail('file not found');
    csvText = fs.readFileSync(p, 'utf8');
  }
  if (!csvText) return fail('input or path required');
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return ok({ data: [], count: 0 });
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    });
    return ok({ data, headers, count: data.length });
  } catch (e) { return fail(e.message); }
}

export function json_to_csv({ input = '', path: filePath = '' }) {
  let jsonData = input;
  if (!jsonData && filePath) {
    const p = safePath(filePath);
    if (!fs.existsSync(p)) return fail('file not found');
    jsonData = fs.readFileSync(p, 'utf8');
  }
  if (!jsonData) return fail('input or path required');
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    if (!Array.isArray(data) || data.length === 0) return fail('input must be a non-empty JSON array');
    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];
    for (const row of data) {
      const vals = headers.map(h => {
        const v = String(row[h] ?? '');
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      });
      csvLines.push(vals.join(','));
    }
    const csv = csvLines.join('\n');
    return ok({ csv, headers, row_count: data.length });
  } catch (e) { return fail(e.message); }
}

export function yaml_parse({ input = '', path: filePath = '', reverse = false }) {
  let text = input;
  if (!text && filePath) {
    const p = safePath(filePath);
    if (!fs.existsSync(p)) return fail('file not found');
    text = fs.readFileSync(p, 'utf8');
  }
  if (!text) return fail('input or path required');
  try {
    if (reverse) {
      // JSON to YAML
      const data = typeof text === 'string' ? JSON.parse(text) : text;
      function toYaml(obj, indent = 0) {
        const pad = '  '.repeat(indent);
        let result = '';
        if (Array.isArray(obj)) {
          for (const item of obj) {
            if (typeof item === 'object' && item !== null) {
              result += `${pad}-\n${toYaml(item, indent + 1)}`;
            } else {
              result += `${pad}- ${item}\n`;
            }
          }
        } else if (typeof obj === 'object' && obj !== null) {
          for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'object' && v !== null) {
              result += `${pad}${k}:\n${toYaml(v, indent + 1)}`;
            } else {
              result += `${pad}${k}: ${v}\n`;
            }
          }
        }
        return result;
      }
      return ok({ yaml: toYaml(data) });
    }
    // YAML to JSON (simple key:value parser)
    const result = {};
    const lines = text.split('\n');
    const stack = [{ obj: result, indent: -1 }];
    for (const line of lines) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const indent = line.search(/\S/);
      const content = line.trim();
      // Pop stack to find parent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const parent = stack[stack.length - 1].obj;
      if (content.startsWith('- ')) {
        // Array item
        const val = content.slice(2).trim();
        if (!Array.isArray(parent)) {
          // Find the last key and make it an array
          const keys = Object.keys(parent);
          const lastKey = keys[keys.length - 1];
          if (lastKey && !Array.isArray(parent[lastKey])) parent[lastKey] = [];
          if (lastKey) parent[lastKey].push(val);
        } else {
          parent.push(val);
        }
      } else if (content.includes(':')) {
        const colonIdx = content.indexOf(':');
        const key = content.slice(0, colonIdx).trim();
        const val = content.slice(colonIdx + 1).trim();
        if (val === '' || val === '|' || val === '>') {
          parent[key] = {};
          stack.push({ obj: parent[key], indent });
        } else {
          // Parse value
          if (val === 'true') parent[key] = true;
          else if (val === 'false') parent[key] = false;
          else if (val === 'null') parent[key] = null;
          else if (!isNaN(val) && val !== '') parent[key] = Number(val);
          else parent[key] = val.replace(/^['"]|['"]$/g, '');
        }
      }
    }
    return ok({ data: result });
  } catch (e) { return fail(e.message); }
}

export function xml_parse({ input = '', path: filePath = '' }) {
  let text = input;
  if (!text && filePath) {
    const p = safePath(filePath);
    if (!fs.existsSync(p)) return fail('file not found');
    text = fs.readFileSync(p, 'utf8');
  }
  if (!text) return fail('input or path required');
  try {
    // Simple XML to JSON using regex
    function parseXml(xml) {
      const result = {};
      // Remove XML declaration and comments
      xml = xml.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '').trim();
      const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>/g;
      const selfCloseRegex = /<(\w+)([^>]*)\/>/g;
      let m;
      // Self-closing tags
      while ((m = selfCloseRegex.exec(xml))) {
        const tag = m[1];
        const attrs = parseAttrs(m[2]);
        result[tag] = attrs || '';
      }
      // Regular tags
      while ((m = tagRegex.exec(xml))) {
        const tag = m[1];
        const content = m[3].trim();
        if (content.includes('<')) {
          const child = parseXml(content);
          if (result[tag]) {
            if (!Array.isArray(result[tag])) result[tag] = [result[tag]];
            result[tag].push(child);
          } else {
            result[tag] = child;
          }
        } else {
          if (result[tag]) {
            if (!Array.isArray(result[tag])) result[tag] = [result[tag]];
            result[tag].push(content);
          } else {
            result[tag] = content;
          }
        }
      }
      return result;
    }
    function parseAttrs(attrStr) {
      const attrs = {};
      const regex = /(\w+)="([^"]*)"/g;
      let m;
      while ((m = regex.exec(attrStr))) {
        attrs[m[1]] = m[2];
      }
      return Object.keys(attrs).length > 0 ? attrs : null;
    }
    const data = parseXml(text);
    return ok({ data });
  } catch (e) { return fail(e.message); }
}

export function validate_json({ input = '', schema = '' }) {
  if (!input) return fail('input required');
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    const errors = [];
    if (schema) {
      const schemaObj = typeof schema === 'string' ? JSON.parse(schema) : schema;
      // Check required fields
      if (schemaObj.required && Array.isArray(schemaObj.required)) {
        for (const field of schemaObj.required) {
          if (data[field] === undefined) errors.push(`Missing required field: ${field}`);
        }
      }
      // Check types
      if (schemaObj.properties && typeof schemaObj.properties === 'object') {
        for (const [key, def] of Object.entries(schemaObj.properties)) {
          if (data[key] !== undefined && def.type) {
            const actualType = Array.isArray(data[key]) ? 'array' : typeof data[key];
            if (actualType !== def.type) {
              errors.push(`Field '${key}' expected type '${def.type}', got '${actualType}'`);
            }
          }
        }
      }
    }
    return ok({ valid: errors.length === 0, errors, data });
  } catch (e) {
    return ok({ valid: false, errors: [`Invalid JSON: ${e.message}`] });
  }
}

// ── Email & Messaging Tools ────────────────────────────────────────────────

export function send_email({ to = '', subject = '', body = '', smtp_host = '', smtp_port = 587, smtp_user = '', smtp_pass = '' }) {
  if (!to) return fail('to required');
  if (!subject) return fail('subject required');
  if (!smtp_host) {
    return ok({
      message: 'SMTP configuration required. Provide smtp_host, smtp_port, smtp_user, and smtp_pass.',
      alternative: 'You can also use the bash tool with curl to send via an API like SendGrid or Mailgun:',
      example: `bash({ command: 'curl -X POST "https://api.sendgrid.com/v3/mail/send" -H "Authorization: Bearer YOUR_API_KEY" -H "Content-Type: application/json" -d \'{"personalizations":[{"to":[{"email":"${to}"}]}],"from":{"email":"noreply@example.com"},"subject":"${subject}","content":[{"type":"text/plain","value":"${body}"}]}\'' })`
    });
  }
  // Try using curl with SMTP
  try {
    const emailContent = `From: ${smtp_user}\r\nTo: ${to}\r\nSubject: ${subject}\r\n\r\n${body}`;
    const tmpFile = path.join(os.tmpdir(), `brain_email_${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, emailContent);
    const cmd = `curl --url "smtp://${smtp_host}:${smtp_port}" --ssl-reqd --mail-from "${smtp_user}" --mail-rcpt "${to}" --user "${smtp_user}:${smtp_pass}" -T "${tmpFile}"`;
    const stdout = execSync(cmd, { timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    try { fs.unlinkSync(tmpFile); } catch {}
    return ok({ sent: true, to, subject, stdout });
  } catch (e) {
    return fail(`Failed to send email: ${e.stderr || e.message}`);
  }
}

export async function send_slack_message({ webhook_url = '', text = '', channel = '' }) {
  if (!webhook_url) return fail('webhook_url required');
  if (!text) return fail('text required');
  try {
    const payload = { text };
    if (channel) payload.channel = channel;
    const res = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    return ok({ status: res.status, response: body, sent: res.ok });
  } catch (e) { return fail(e.message); }
}

export async function send_webhook({ url = '', data = {}, method = 'POST', headers = {} }) {
  if (!url) return fail('url required');
  try {
    const opts = {
      method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (['POST', 'PUT', 'PATCH'].includes(opts.method)) {
      opts.body = JSON.stringify(data);
    }
    const res = await fetch(url, opts);
    const body = (await res.text()).slice(0, 8000);
    return ok({ status: res.status, body, method: opts.method });
  } catch (e) { return fail(e.message); }
}

export function send_notification({ title = '', message = '' }) {
  if (!message) return fail('message required');
  const t = title || 'Artificial Brain';
  try {
    if (process.platform === 'win32') {
      const ps = `
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
        $template = @"
        <toast><visual><binding template='ToastGeneric'><text>${t.replace(/"/g, '&quot;')}</text><text>${message.replace(/"/g, '&quot;')}</text></binding></visual></toast>
"@
        $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
        $xml.LoadXml($template)
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Brain').Show($toast)
      `.trim();
      execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, { timeout: 10000 });
    } else if (process.platform === 'darwin') {
      execSync(`osascript -e 'display notification "${message}" with title "${t}"'`, { timeout: 5000 });
    } else {
      execSync(`notify-send "${t}" "${message}"`, { timeout: 5000 });
    }
    return ok({ sent: true, title: t, message });
  } catch (e) {
    return fail(`Notification failed: ${e.message}. Fallback: message logged.`);
  }
}

// ── Memory & Knowledge Tools ───────────────────────────────────────────────

function ensureMemoryDir(store) {
  const dir = path.join(HOME, '.brain-memory');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${store}.json`);
}

function loadStore(storePath) {
  if (!fs.existsSync(storePath)) return {};
  try { return JSON.parse(fs.readFileSync(storePath, 'utf8')); } catch { return {}; }
}

function saveStore(storePath, data) {
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2));
}

export function vector_store_upsert({ key = '', text = '', tags = [], store = 'default' }) {
  if (!key) return fail('key required');
  if (!text) return fail('text required');
  try {
    const storePath = ensureMemoryDir(store);
    const data = loadStore(storePath);
    data[key] = { text, tags: Array.isArray(tags) ? tags : [tags], updated: new Date().toISOString() };
    saveStore(storePath, data);
    return ok({ key, store, entries: Object.keys(data).length });
  } catch (e) { return fail(e.message); }
}

export function vector_search({ query = '', store = 'default', limit = 5 }) {
  if (!query) return fail('query required');
  try {
    const storePath = ensureMemoryDir(store);
    const data = loadStore(storePath);
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    // Score each entry by keyword matches (TF-IDF-like)
    const scored = Object.entries(data).map(([key, entry]) => {
      const textWords = (entry.text || '').toLowerCase().split(/\s+/);
      const tagStr = (entry.tags || []).join(' ').toLowerCase();
      let score = 0;
      for (const qw of queryWords) {
        // Count occurrences in text
        const textCount = textWords.filter(w => w.includes(qw)).length;
        score += textCount;
        // Bonus for tag matches
        if (tagStr.includes(qw)) score += 3;
        // Bonus for key match
        if (key.toLowerCase().includes(qw)) score += 5;
      }
      return { key, text: entry.text, tags: entry.tags, score };
    });
    const results = scored.filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, Number(limit));
    return ok({ results, count: results.length, total: Object.keys(data).length });
  } catch (e) { return fail(e.message); }
}

export function create_embedding({ text = '' }) {
  if (!text) return fail('text required');
  // Simple bag-of-words vector
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1);
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const total = words.length || 1;
  const vector = {};
  for (const [w, count] of Object.entries(freq)) {
    vector[w] = Math.round((count / total) * 10000) / 10000;
  }
  return ok({ vector, dimensions: Object.keys(vector).length, word_count: words.length });
}

export function memory_save({ key = '', value = '', tags = [] }) {
  if (!key) return fail('key required');
  try {
    const storePath = ensureMemoryDir('kv');
    const data = loadStore(storePath);
    data[key] = { value, tags: Array.isArray(tags) ? tags : [tags], saved: new Date().toISOString() };
    saveStore(storePath, data);
    return ok({ key, saved: true, total: Object.keys(data).length });
  } catch (e) { return fail(e.message); }
}

export function memory_recall({ key = '', tag = '', query = '' }) {
  try {
    const storePath = ensureMemoryDir('kv');
    const data = loadStore(storePath);
    // By exact key
    if (key) {
      if (data[key]) return ok({ key, ...data[key] });
      return fail(`Key '${key}' not found`);
    }
    // By tag
    if (tag) {
      const results = Object.entries(data)
        .filter(([, v]) => (v.tags || []).includes(tag))
        .map(([k, v]) => ({ key: k, ...v }));
      return ok({ results, count: results.length });
    }
    // By keyword search
    if (query) {
      const qw = query.toLowerCase();
      const results = Object.entries(data)
        .filter(([k, v]) => {
          const searchText = `${k} ${v.value || ''} ${(v.tags || []).join(' ')}`.toLowerCase();
          return searchText.includes(qw);
        })
        .map(([k, v]) => ({ key: k, ...v }));
      return ok({ results, count: results.length });
    }
    // Return all
    const all = Object.entries(data).map(([k, v]) => ({ key: k, ...v }));
    return ok({ results: all, count: all.length });
  } catch (e) { return fail(e.message); }
}

// ── Docker & Container Tools ───────────────────────────────────────────────

export function docker_run({ image = '', ports = '', volumes = '', env = '', name = '', detach = true, command = '' }) {
  if (!image) return fail('image required');
  try {
    let cmd = 'docker run';
    if (detach) cmd += ' -d';
    if (name) cmd += ` --name ${name}`;
    if (ports) {
      for (const p of ports.split(',').map(s => s.trim()).filter(Boolean)) {
        cmd += ` -p ${p}`;
      }
    }
    if (volumes) {
      for (const v of volumes.split(',').map(s => s.trim()).filter(Boolean)) {
        cmd += ` -v ${v}`;
      }
    }
    if (env) {
      for (const e of env.split(',').map(s => s.trim()).filter(Boolean)) {
        cmd += ` -e ${e}`;
      }
    }
    cmd += ` ${image}`;
    if (command) cmd += ` ${command}`;
    const stdout = execSync(cmd, { timeout: 120000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.trim(), command: cmd, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function docker_build({ path: buildPath = '.', tag = '', file = '' }) {
  const p = safePath(buildPath);
  try {
    let cmd = `docker build "${p}"`;
    if (tag) cmd += ` -t ${tag}`;
    if (file) cmd += ` -f "${safePath(file)}"`;
    const stdout = execSync(cmd, { timeout: 300000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.slice(-4000), command: cmd, returncode: 0 });
  } catch (e) {
    return ok({ stdout: (e.stdout || '').slice(-4000), stderr: (e.stderr || '').slice(-2000), returncode: e.status ?? 1 });
  }
}

export function docker_list({ all = false }) {
  try {
    const cmd = all ? 'docker ps -a' : 'docker ps';
    const stdout = execSync(cmd, { timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = stdout.trim().split('\n');
    return ok({ output: stdout.trim(), containers: lines.length - 1, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function docker_stop({ container = '', remove = false }) {
  if (!container) return fail('container required');
  try {
    let stdout = execSync(`docker stop ${container}`, { timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (remove) {
      stdout += '\n' + execSync(`docker rm ${container}`, { timeout: 15000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    }
    return ok({ stdout: stdout.trim(), stopped: true, removed: remove, returncode: 0 });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

// ── Code Quality & Testing Tools ───────────────────────────────────────────

export function run_tests({ command = '', cwd = '', framework = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    let cmd = command;
    if (!cmd) {
      // Auto-detect
      if (framework === 'pytest' || fs.existsSync(path.join(workDir, 'pytest.ini')) || fs.existsSync(path.join(workDir, 'setup.py'))) {
        cmd = 'pytest --tb=short -q';
      } else if (fs.existsSync(path.join(workDir, 'package.json'))) {
        const pkg = JSON.parse(fs.readFileSync(path.join(workDir, 'package.json'), 'utf8'));
        if (pkg.scripts && pkg.scripts.test) cmd = 'npm test';
        else cmd = 'npx jest --passWithNoTests 2>/dev/null || npx mocha 2>/dev/null || echo "No test runner found"';
      } else {
        return fail('Could not auto-detect test framework. Provide a command or ensure package.json/pytest.ini exists.');
      }
    }
    const stdout = execSync(cmd, { cwd: workDir, timeout: 120000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.slice(-6000), returncode: 0, command: cmd });
  } catch (e) {
    if (e.killed) return fail('Tests timed out after 120s');
    return ok({ stdout: (e.stdout || '').slice(-6000), stderr: (e.stderr || '').slice(-2000), returncode: e.status ?? 1 });
  }
}

export function lint_code({ path: filePath = '', cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    let cmd;
    const target = filePath ? safePath(filePath) : '.';
    const ext = filePath ? path.extname(filePath).toLowerCase() : '';
    if (ext === '.py' || (!ext && fs.existsSync(path.join(workDir, 'setup.py')))) {
      cmd = `pylint "${target}" --output-format=text 2>&1 || true`;
    } else {
      cmd = `npx eslint "${target}" --format compact 2>&1 || true`;
    }
    const stdout = execSync(cmd, { cwd: workDir, timeout: 60000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
    return ok({ stdout: stdout.slice(-6000), returncode: 0, command: cmd });
  } catch (e) {
    return ok({ stdout: (e.stdout || '').slice(-6000), stderr: (e.stderr || '').slice(-2000), returncode: e.status ?? 1 });
  }
}

export function format_code({ path: filePath = '', cwd = '' }) {
  if (!filePath) return fail('path required');
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  const p = safePath(filePath);
  const ext = path.extname(p).toLowerCase();
  try {
    let cmd;
    if (ext === '.py') {
      cmd = `black "${p}"`;
    } else {
      cmd = `npx prettier --write "${p}"`;
    }
    const stdout = execSync(cmd, { cwd: workDir, timeout: 30000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.trim(), formatted: true, command: cmd });
  } catch (e) {
    return ok({ stdout: e.stdout || '', stderr: e.stderr || '', returncode: e.status ?? 1 });
  }
}

export function check_types({ cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    let cmd;
    if (fs.existsSync(path.join(workDir, 'tsconfig.json'))) {
      cmd = 'npx tsc --noEmit';
    } else if (fs.existsSync(path.join(workDir, 'setup.py')) || fs.existsSync(path.join(workDir, 'mypy.ini'))) {
      cmd = 'mypy .';
    } else if (fs.existsSync(path.join(workDir, 'package.json'))) {
      cmd = 'npx tsc --noEmit';
    } else {
      return fail('No tsconfig.json or Python project detected.');
    }
    const stdout = execSync(cmd, { cwd: workDir, timeout: 60000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.slice(-6000), returncode: 0, command: cmd, errors: 0 });
  } catch (e) {
    const stderr = e.stderr || '';
    const stdout = e.stdout || '';
    const errorCount = (stdout.match(/error TS/g) || stdout.match(/error:/g) || []).length;
    return ok({ stdout: stdout.slice(-6000), stderr: stderr.slice(-2000), returncode: e.status ?? 1, errors: errorCount });
  }
}

export function run_benchmark({ command = '', iterations = 3, cwd = '' }) {
  if (!command) return fail('command required');
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  const n = Number(iterations) || 3;
  const durations = [];
  try {
    for (let i = 0; i < n; i++) {
      const start = performance.now();
      execSync(command, { cwd: workDir, timeout: 60000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      durations.push(Math.round(performance.now() - start));
    }
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    return ok({ durations_ms: durations, min_ms: min, max_ms: max, avg_ms: avg, iterations: n });
  } catch (e) {
    return fail(`Benchmark failed: ${e.message}`);
  }
}

// ── Security & Secrets Tools ───────────────────────────────────────────────

export function scan_secrets({ path: scanPath = '', patterns = [] }) {
  const p = scanPath ? safePath(scanPath) : WORKSPACE;
  if (!fs.existsSync(p)) return fail('path not found');

  const defaultPatterns = [
    { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g },
    { name: 'Stripe Key', regex: /sk_live_[a-zA-Z0-9]{24,}/g },
    { name: 'OpenAI Key', regex: /sk-[a-zA-Z0-9]{32,}/g },
    { name: 'Generic API Key', regex: /[aA][pP][iI][-_]?[kK][eE][yY]\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/g },
    { name: 'Password Assignment', regex: /[pP]assword\s*[:=]\s*['"][^'"]{4,}['"]/g },
    { name: 'Private Key', regex: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g },
    { name: 'Generic Secret', regex: /[sS]ecret\s*[:=]\s*['"][a-zA-Z0-9_\-]{8,}['"]/g },
    { name: 'Bearer Token', regex: /[bB]earer\s+[a-zA-Z0-9_\-.]{20,}/g },
  ];

  // Add custom patterns
  const customPatterns = (Array.isArray(patterns) ? patterns : []).map((p, i) => ({
    name: `Custom ${i + 1}`, regex: new RegExp(p, 'g')
  }));
  const allPatterns = [...defaultPatterns, ...customPatterns];

  const findings = [];

  function scanFile(filePath) {
    if (findings.length >= 100) return;
    try {
      const text = fs.readFileSync(filePath, 'utf8');
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        for (const pat of allPatterns) {
          pat.regex.lastIndex = 0;
          if (pat.regex.test(lines[i])) {
            findings.push({
              file: filePath,
              line: i + 1,
              type: pat.name,
              preview: lines[i].trim().slice(0, 100),
            });
            if (findings.length >= 100) return;
          }
        }
      }
    } catch {}
  }

  function walk(dir) {
    if (findings.length >= 100) return;
    let items;
    try { items = fs.readdirSync(dir); } catch { return; }
    for (const name of items) {
      if (findings.length >= 100) return;
      const full = path.join(dir, name);
      if (['node_modules', '.git', '__pycache__', 'venv', 'dist', '.next'].includes(name)) continue;
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory()) walk(full);
      else if (stat.isFile() && stat.size < 500000) scanFile(full);
    }
  }

  const stat = fs.statSync(p);
  if (stat.isFile()) scanFile(p);
  else walk(p);

  return ok({ findings, count: findings.length, scanned_path: p });
}

export function scan_vulnerabilities({ cwd = '' }) {
  const workDir = cwd ? safePath(cwd) : WORKSPACE;
  try {
    if (fs.existsSync(path.join(workDir, 'package.json'))) {
      try {
        const stdout = execSync('npm audit --json 2>&1', { cwd: workDir, timeout: 60000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
        const audit = JSON.parse(stdout);
        return ok({
          tool: 'npm audit',
          vulnerabilities: audit.metadata?.vulnerabilities || audit.vulnerabilities || {},
          total: audit.metadata?.totalDependencies || 0,
          summary: stdout.slice(0, 4000)
        });
      } catch (e) {
        const stdout = e.stdout || '';
        try {
          const audit = JSON.parse(stdout);
          return ok({ tool: 'npm audit', vulnerabilities: audit.metadata?.vulnerabilities || {}, raw: stdout.slice(0, 4000) });
        } catch {
          return ok({ tool: 'npm audit', raw: stdout.slice(0, 4000), returncode: e.status ?? 1 });
        }
      }
    }
    if (fs.existsSync(path.join(workDir, 'requirements.txt')) || fs.existsSync(path.join(workDir, 'setup.py'))) {
      try {
        const stdout = execSync('pip audit 2>&1', { cwd: workDir, timeout: 60000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true });
        return ok({ tool: 'pip audit', output: stdout.slice(0, 4000), returncode: 0 });
      } catch (e) {
        return ok({ tool: 'pip audit', output: (e.stdout || '').slice(0, 4000), stderr: (e.stderr || '').slice(-2000), returncode: e.status ?? 1 });
      }
    }
    return fail('No package.json or requirements.txt found. Cannot determine package manager.');
  } catch (e) { return fail(e.message); }
}

export function hash_string({ input = '', algorithm = 'sha256' }) {
  if (!input) return fail('input required');
  const algos = ['sha256', 'sha512', 'md5', 'sha1', 'sha384'];
  const algo = algos.includes(algorithm) ? algorithm : 'sha256';
  try {
    const hash = crypto.createHash(algo).update(input).digest('hex');
    return ok({ hash, algorithm: algo, input_length: input.length });
  } catch (e) { return fail(e.message); }
}

// ── Image Processing Tools ─────────────────────────────────────────────────

export function resize_image({ path: filePath = '', width = 0, height = 0, dst = '' }) {
  if (!filePath) return fail('path required');
  if (!width && !height) return fail('width or height required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  const outPath = dst ? safePath(dst) : p.replace(/(\.\w+)$/, `_${width}x${height}$1`);
  try {
    if (process.platform === 'win32') {
      const w = width || 0;
      const h = height || 0;
      const ps = `
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile('${p.replace(/'/g, "''")}')
        $newW = if (${w} -gt 0) { ${w} } else { [int]($img.Width * ${h} / $img.Height) }
        $newH = if (${h} -gt 0) { ${h} } else { [int]($img.Height * ${w} / $img.Width) }
        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($img, 0, 0, $newW, $newH)
        $bmp.Save('${outPath.replace(/'/g, "''")}')
        $img.Dispose()
        $bmp.Dispose()
        $graphics.Dispose()
      `.trim();
      execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, { timeout: 30000 });
    } else {
      const size = width && height ? `${width}x${height}` : width ? `${width}x` : `x${height}`;
      execSync(`convert "${p}" -resize ${size} "${outPath}"`, { timeout: 30000 });
    }
    return ok({ path: outPath, width, height });
  } catch (e) { return fail(e.message); }
}

export function convert_image({ path: filePath = '', format = 'png', dst = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  const outPath = dst ? safePath(dst) : p.replace(/\.\w+$/, `.${format}`);
  try {
    if (process.platform === 'win32') {
      const fmtMap = { png: 'Png', jpg: 'Jpeg', jpeg: 'Jpeg', bmp: 'Bmp', gif: 'Gif', tiff: 'Tiff' };
      const dotNetFmt = fmtMap[format.toLowerCase()] || 'Png';
      const ps = `
        Add-Type -AssemblyName System.Drawing
        $img = [System.Drawing.Image]::FromFile('${p.replace(/'/g, "''")}')
        $img.Save('${outPath.replace(/'/g, "''")}', [System.Drawing.Imaging.ImageFormat]::${dotNetFmt})
        $img.Dispose()
      `.trim();
      execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, { timeout: 30000 });
    } else {
      execSync(`convert "${p}" "${outPath}"`, { timeout: 30000 });
    }
    const stat = fs.statSync(outPath);
    return ok({ path: outPath, format, size: stat.size });
  } catch (e) { return fail(e.message); }
}

export function describe_image({ path: filePath = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found');
  try {
    const stat = fs.statSync(p);
    const ext = path.extname(p).toLowerCase();
    let dimensions = 'unknown';
    try {
      if (process.platform === 'win32') {
        const ps = `
          Add-Type -AssemblyName System.Drawing
          $img = [System.Drawing.Image]::FromFile('${p.replace(/'/g, "''")}')
          Write-Output "$($img.Width)x$($img.Height)"
          $img.Dispose()
        `.trim();
        dimensions = execSync(`powershell -Command "${ps.replace(/"/g, '\\"')}"`, { timeout: 10000, encoding: 'utf8' }).trim();
      } else {
        dimensions = execSync(`identify -format "%wx%h" "${p}"`, { timeout: 10000, encoding: 'utf8' }).trim();
      }
    } catch {}
    return ok({
      path: p,
      format: ext.slice(1),
      size_bytes: stat.size,
      dimensions,
      modified: stat.mtime.toISOString(),
      note: 'For AI-powered image description, pass the image to the LLM directly.'
    });
  } catch (e) { return fail(e.message); }
}

export function generate_image({ prompt = '', dst = '', width = 512, height = 512 }) {
  if (!prompt) return fail('prompt required');
  const outPath = dst ? safePath(dst) : path.join(WORKSPACE, `generated_${Date.now()}.svg`);
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const w = Number(width) || 512;
    const h = Number(height) || 512;
    // Generate SVG placeholder with the prompt text
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)" />
  <rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="12" fill="none" stroke="#0f3460" stroke-width="2" stroke-dasharray="8,4" />
  <text x="${w / 2}" y="${h / 2 - 20}" text-anchor="middle" fill="#e94560" font-family="Arial, sans-serif" font-size="18" font-weight="bold">AI Generated Image Placeholder</text>
  <text x="${w / 2}" y="${h / 2 + 20}" text-anchor="middle" fill="#a3a3a3" font-family="Arial, sans-serif" font-size="14">${prompt.replace(/[<>&'"]/g, '').slice(0, 80)}</text>
  <text x="${w / 2}" y="${h - 40}" text-anchor="middle" fill="#555" font-family="Arial, sans-serif" font-size="11">${w}x${h} | Use an external API (DALL-E, Stable Diffusion) for real generation</text>
</svg>`;
    fs.writeFileSync(outPath, svg);
    return ok({ path: outPath, format: 'svg', width: w, height: h, note: 'SVG placeholder created. For real image generation, use an external API.' });
  } catch (e) { return fail(e.message); }
}

// ── Scheduling & Cron Tools ────────────────────────────────────────────────

const TIMERS = {};

export function set_timer({ seconds = 0, label = '' }) {
  if (!seconds) return fail('seconds required');
  const id = `timer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const triggerAt = new Date(Date.now() + Number(seconds) * 1000).toISOString();
  TIMERS[id] = { label: label || `Timer ${seconds}s`, seconds: Number(seconds), triggerAt, set: new Date().toISOString() };
  return ok({ id, label: TIMERS[id].label, triggerAt, seconds: Number(seconds) });
}

function ensureCronDir() {
  const dir = path.join(HOME, '.brain-cron');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'jobs.json');
}

export function cron_schedule({ expression = '', command = '', label = '' }) {
  if (!expression) return fail('cron expression required');
  if (!command) return fail('command required');
  try {
    const cronPath = ensureCronDir();
    const jobs = fs.existsSync(cronPath) ? JSON.parse(fs.readFileSync(cronPath, 'utf8')) : [];
    const id = `cron_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    jobs.push({ id, expression, command, label: label || command.slice(0, 50), created: new Date().toISOString(), active: true });
    fs.writeFileSync(cronPath, JSON.stringify(jobs, null, 2));
    return ok({ id, expression, command, label: label || command.slice(0, 50), total_jobs: jobs.length });
  } catch (e) { return fail(e.message); }
}

export function cron_list() {
  try {
    const cronPath = ensureCronDir();
    const jobs = fs.existsSync(cronPath) ? JSON.parse(fs.readFileSync(cronPath, 'utf8')) : [];
    return ok({ jobs, count: jobs.length });
  } catch (e) { return fail(e.message); }
}

// ── API & Integration Tools ────────────────────────────────────────────────

export async function graphql_query({ url = '', query = '', variables = {}, headers = {} }) {
  if (!url) return fail('url required');
  if (!query) return fail('query required');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ query, variables }),
    });
    const body = (await res.text()).slice(0, 8000);
    try {
      const data = JSON.parse(body);
      return ok({ status: res.status, data });
    } catch {
      return ok({ status: res.status, body });
    }
  } catch (e) { return fail(e.message); }
}

export async function call_api({ url = '', method = 'GET', headers = {}, body = '', auth = '' }) {
  if (!url) return fail('url required');
  try {
    const opts = {
      method: method.toUpperCase(),
      headers: { ...headers },
    };
    if (auth) opts.headers['Authorization'] = auth;
    if (body && ['POST', 'PUT', 'PATCH'].includes(opts.method)) {
      if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const responseBody = (await res.text()).slice(0, 8000);
    const responseHeaders = {};
    res.headers.forEach((v, k) => { responseHeaders[k] = v; });
    return ok({ status: res.status, body: responseBody, headers: responseHeaders });
  } catch (e) { return fail(e.message); }
}

export function parse_url({ url = '' }) {
  if (!url) return fail('url required');
  try {
    const parsed = new URL(url);
    const params = {};
    parsed.searchParams.forEach((v, k) => { params[k] = v; });
    return ok({
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      params,
      hash: parsed.hash,
      origin: parsed.origin,
      href: parsed.href,
    });
  } catch (e) { return fail(`Invalid URL: ${e.message}`); }
}

export function base64_encode({ input = '', decode = false, file = '' }) {
  try {
    if (file) {
      const p = safePath(file);
      if (!fs.existsSync(p)) return fail('file not found');
      if (decode) {
        const encoded = fs.readFileSync(p, 'utf8');
        const decoded = Buffer.from(encoded, 'base64').toString('utf8');
        return ok({ output: decoded, length: decoded.length });
      }
      const buf = fs.readFileSync(p);
      const encoded = buf.toString('base64');
      return ok({ output: encoded, length: encoded.length });
    }
    if (!input) return fail('input or file required');
    if (decode) {
      const decoded = Buffer.from(input, 'base64').toString('utf8');
      return ok({ output: decoded, length: decoded.length });
    }
    const encoded = Buffer.from(input).toString('base64');
    return ok({ output: encoded, length: encoded.length });
  } catch (e) { return fail(e.message); }
}

// ── Math & Computation Tools ───────────────────────────────────────────────

export function evaluate_expression({ expression = '' }) {
  if (!expression) return fail('expression required');
  try {
    // Sanitize: only allow math-safe characters
    const sanitized = expression.replace(/\s/g, '');
    if (!/^[0-9+\-*/().%^,a-zA-Z]+$/.test(sanitized)) {
      return fail('Expression contains invalid characters. Only numbers, operators, and Math functions are allowed.');
    }
    // Build safe evaluator with only Math globals
    const mathGlobals = [
      'abs', 'ceil', 'floor', 'round', 'sqrt', 'cbrt', 'pow', 'max', 'min',
      'log', 'log2', 'log10', 'exp', 'sign', 'trunc',
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
      'PI', 'E', 'LN2', 'LN10', 'SQRT2', 'random',
      'sinh', 'cosh', 'tanh', 'hypot',
    ];
    const mathScope = {};
    for (const fn of mathGlobals) {
      mathScope[fn] = Math[fn];
    }
    // Replace ^ with ** for exponentiation
    const expr = expression.replace(/\^/g, '**');
    const fn = new Function(...Object.keys(mathScope), `"use strict"; return (${expr});`);
    const result = fn(...Object.values(mathScope));
    return ok({ result, expression, type: typeof result });
  } catch (e) { return fail(`Evaluation error: ${e.message}`); }
}

export function regex_match({ text = '', pattern = '', flags = 'g' }) {
  if (!text) return fail('text required');
  if (!pattern) return fail('pattern required');
  try {
    const regex = new RegExp(pattern, flags);
    const matches = [];
    if (flags.includes('g')) {
      let m;
      while ((m = regex.exec(text)) && matches.length < 100) {
        matches.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1),
          namedGroups: m.groups || {},
        });
      }
    } else {
      const m = regex.exec(text);
      if (m) {
        matches.push({
          match: m[0],
          index: m.index,
          groups: m.slice(1),
          namedGroups: m.groups || {},
        });
      }
    }
    return ok({ matches, count: matches.length, pattern, flags });
  } catch (e) { return fail(`Regex error: ${e.message}`); }
}

// ── Package / Script Tools ──────────────────────────────────────────────────

export function pip_install({ package: pkg = '' }) {
  if (!pkg.trim()) return fail('package required');
  try {
    const stdout = execSync(`pip install ${pkg}`, { timeout: 120000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return ok({ stdout: stdout.slice(-4000), returncode: 0 });
  } catch (e) {
    if (e.killed) return fail('pip install timed out after 120s');
    return ok({ stdout: (e.stdout || '').slice(-4000), stderr: (e.stderr || '').slice(-2000), returncode: e.status ?? 1 });
  }
}

export function run_python({ code = '', timeout = 30 }) {
  if (!code) return fail('code required');
  const tmpFile = path.join(os.tmpdir(), `brain_run_${Date.now()}.py`);
  try {
    fs.writeFileSync(tmpFile, code);
    const stdout = execSync(`python "${tmpFile}"`, { cwd: WORKSPACE, timeout: Number(timeout) * 1000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    fs.unlinkSync(tmpFile);
    return ok({ stdout: stdout.slice(-6000), returncode: 0 });
  } catch (e) {
    try { fs.unlinkSync(tmpFile); } catch {}
    if (e.killed) return fail(`timed out after ${timeout}s`);
    return ok({ stdout: (e.stdout || '').slice(-6000), stderr: (e.stderr || '').slice(-2000), returncode: e.status ?? 1 });
  }
}

// ── System Tools ────────────────────────────────────────────────────────────

export function get_system_info() {
  try {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return ok({
      os: os.platform(),
      os_version: os.release(),
      node: process.version,
      cpu_count: cpus.length,
      cpu_model: cpus[0]?.model || 'unknown',
      ram_total_mb: Math.round(totalMem / 1e6),
      ram_used_mb: Math.round(usedMem / 1e6),
      ram_percent: Math.round((usedMem / totalMem) * 100),
      homedir: HOME,
      uptime_hours: Math.round(os.uptime() / 3600 * 10) / 10,
    });
  } catch (e) { return fail(e.message); }
}

export function list_processes({ limit = 30 }) {
  try {
    let stdout;
    if (process.platform === 'win32') {
      stdout = execSync('tasklist /FO CSV /NH', { timeout: 15000, encoding: 'utf8' });
    } else {
      stdout = execSync('ps aux --sort=-%cpu', { timeout: 15000, encoding: 'utf8' });
    }
    const lines = stdout.trim().split('\n').slice(0, Number(limit));
    return ok({ processes: lines, total: lines.length });
  } catch (e) { return fail(e.message); }
}

export function kill_process({ pid, name = '' }) {
  if (pid == null && !name) return fail('pid or name required');
  try {
    if (pid != null) {
      process.kill(Number(pid), 'SIGTERM');
      return ok({ killed: [Number(pid)] });
    }
    // Kill by name
    if (process.platform === 'win32') {
      execSync(`taskkill /IM "${name}" /F`, { timeout: 10000, encoding: 'utf8' });
    } else {
      execSync(`pkill -f "${name}"`, { timeout: 10000, encoding: 'utf8' });
    }
    return ok({ killed_name: name });
  } catch (e) { return fail(e.message); }
}

export function get_env_var({ name = '' }) {
  if (!name.trim()) return fail('name required');
  const value = process.env[name];
  if (value === undefined) return fail(`env var '${name}' not set`);
  return ok({ name, value });
}

// ── Network Tools ───────────────────────────────────────────────────────────

export async function http_get({ url = '', headers = {}, timeout = 15 }) {
  if (!url) return fail('url required');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(timeout) * 1000);
    const res = await fetch(url, { headers, signal: controller.signal });
    clearTimeout(timer);
    const body = (await res.text()).slice(0, 8000);
    return ok({ status: res.status, body });
  } catch (e) { return fail(e.message); }
}

export async function http_post({ url = '', data = {}, headers = {}, timeout = 15 }) {
  if (!url) return fail('url required');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(timeout) * 1000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const body = (await res.text()).slice(0, 8000);
    return ok({ status: res.status, body });
  } catch (e) { return fail(e.message); }
}

export async function download_file({ url = '', dst = '' }) {
  if (!url) return fail('url required');
  try {
    const res = await fetch(url);
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = dst ? safePath(dst) : path.join(WORKSPACE, url.split('/').pop().split('?')[0] || 'download');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buf);
    return ok({ path: outPath, bytes: buf.length });
  } catch (e) { return fail(e.message); }
}

// ── Desktop Tools ───────────────────────────────────────────────────────────

export function take_screenshot({ dst = '' }) {
  const outPath = dst ? safePath(dst) : path.join(WORKSPACE, 'screenshot.png');
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    if (process.platform === 'win32') {
      // PowerShell screenshot
      const ps = `
        Add-Type -AssemblyName System.Windows.Forms
        $bmp = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bitmap = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($bmp.Location, [System.Drawing.Point]::Empty, $bmp.Size)
        $bitmap.Save('${outPath.replace(/'/g, "''")}')
      `.trim();
      execSync(`powershell -Command "${ps}"`, { timeout: 15000 });
    } else if (process.platform === 'darwin') {
      execSync(`screencapture "${outPath}"`, { timeout: 10000 });
    } else {
      execSync(`scrot "${outPath}"`, { timeout: 10000 });
    }
    const stat = fs.statSync(outPath);
    return ok({ path: outPath, size: stat.size });
  } catch (e) { return fail(e.message); }
}

export function read_clipboard() {
  try {
    let text;
    if (process.platform === 'win32') {
      text = execSync('powershell -Command "Get-Clipboard"', { encoding: 'utf8', timeout: 5000 }).trim();
    } else if (process.platform === 'darwin') {
      text = execSync('pbpaste', { encoding: 'utf8', timeout: 5000 });
    } else {
      text = execSync('xclip -selection clipboard -o', { encoding: 'utf8', timeout: 5000 });
    }
    return ok({ content: text, length: text.length });
  } catch (e) { return fail(e.message); }
}

export function write_clipboard({ text = '' }) {
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Set-Clipboard -Value '${text.replace(/'/g, "''")}'"`  , { timeout: 5000 });
    } else if (process.platform === 'darwin') {
      execSync(`echo "${text}" | pbcopy`, { timeout: 5000 });
    } else {
      execSync(`echo "${text}" | xclip -selection clipboard`, { timeout: 5000 });
    }
    return ok({ length: text.length });
  } catch (e) { return fail(e.message); }
}

// ── Web Tools ───────────────────────────────────────────────────────────────

export async function search_web({ query = '', limit = 5 }) {
  if (!query) return fail('query required');
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Brain Agent)' } });
    const html = await res.text();
    // Extract result snippets with basic regex
    const results = [];
    const regex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>(.+?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) && results.length < Number(limit)) {
      results.push({ url: match[1], title: match[2].replace(/<[^>]+>/g, '') });
    }
    return ok({ results, count: results.length });
  } catch (e) { return fail(e.message); }
}

export async function scrape_web({ url = '' }) {
  if (!url) return fail('url required');
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Brain Agent)' } });
    if (!res.ok) return fail(`HTTP ${res.status}`);
    const html = await res.text();
    // Strip tags, scripts, styles — basic text extraction
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);
    return ok({ url, text, length: text.length });
  } catch (e) { return fail(e.message); }
}

// ── List Tool ──────────────────────────────────────────────────────────────

// ── HIGH-PRIORITY BUSINESS TOOLS (9) ──────────────────────────────────────

/**
 * 1. generate_pdf — Convert HTML/Markdown to PDF using Puppeteer or wkhtmltopdf.
 * Falls back to writing an HTML file if no converter is available.
 */
export async function generate_pdf({ content = '', dst = '', format = 'markdown', title = '' }) {
  if (!content) return fail('content required');
  const outPath = dst ? safePath(dst) : path.join(WORKSPACE, `report_${Date.now()}.pdf`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // Build HTML from content
  let html;
  if (format === 'html') {
    html = content;
  } else {
    // Simple markdown → HTML conversion
    const bodyHtml = content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title || 'Report'}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#222;line-height:1.6}
h1{border-bottom:2px solid #333;padding-bottom:8px}h2{color:#444;margin-top:24px}h3{color:#555}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f5f5f5}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:0.9em}
ul{padding-left:20px}li{margin-bottom:4px}</style></head><body><p>${bodyHtml}</p></body></html>`;
  }

  try {
    // Try wkhtmltopdf first (lightweight, no Node deps)
    const tmpHtml = path.join(os.tmpdir(), `brain_pdf_${Date.now()}.html`);
    fs.writeFileSync(tmpHtml, html);
    try {
      execSync(`wkhtmltopdf --quiet "${tmpHtml}" "${outPath}"`, { timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
      fs.unlinkSync(tmpHtml);
      const stat = fs.statSync(outPath);
      return ok({ path: outPath, bytes: stat.size, method: 'wkhtmltopdf' });
    } catch {
      // Try Chrome/Edge headless print-to-pdf
      const browsers = [
        'google-chrome', 'chromium-browser', 'chromium',
        ...(process.platform === 'win32' ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ] : []),
        ...(process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : []),
      ];
      let printed = false;
      for (const browser of browsers) {
        try {
          const cmd = `"${browser}" --headless --disable-gpu --no-sandbox --print-to-pdf="${outPath}" "${tmpHtml}"`;
          execSync(cmd, { timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
          printed = true;
          break;
        } catch { continue; }
      }
      fs.unlinkSync(tmpHtml);
      if (printed && fs.existsSync(outPath)) {
        const stat = fs.statSync(outPath);
        return ok({ path: outPath, bytes: stat.size, method: 'chrome_headless' });
      }
    }
    // Fallback: save as HTML
    const htmlPath = outPath.replace(/\.pdf$/i, '.html');
    fs.writeFileSync(htmlPath, html);
    return ok({ path: htmlPath, bytes: html.length, method: 'html_fallback', note: 'PDF converter not found. Install wkhtmltopdf or Chrome for native PDF.' });
  } catch (e) { return fail(e.message); }
}

/**
 * 2. google_calendar_api — Google Calendar operations via REST API.
 * Requires GOOGLE_CALENDAR_API_KEY or GOOGLE_OAUTH_TOKEN in env.
 */
export async function google_calendar_api({ action = 'list', calendarId = 'primary', event = {}, eventId = '', timeMin = '', timeMax = '' }) {
  const token = process.env.GOOGLE_OAUTH_TOKEN || process.env.GOOGLE_CALENDAR_TOKEN || '';
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY || '';

  if (!token && !apiKey) {
    return fail('Set GOOGLE_OAUTH_TOKEN or GOOGLE_CALENDAR_API_KEY in environment. Get credentials from console.cloud.google.com');
  }

  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`;
  const headers = token
    ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
  const keyParam = apiKey ? `key=${apiKey}` : '';

  try {
    if (action === 'list') {
      const now = new Date().toISOString();
      const min = timeMin || now;
      const max = timeMax || new Date(Date.now() + 7 * 86400000).toISOString();
      const url = `${baseUrl}/events?timeMin=${encodeURIComponent(min)}&timeMax=${encodeURIComponent(max)}&singleEvents=true&orderBy=startTime&maxResults=20${keyParam ? '&' + keyParam : ''}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (!res.ok) return fail(data.error?.message || `HTTP ${res.status}`);
      const events = (data.items || []).map(e => ({
        id: e.id, summary: e.summary || '', start: e.start?.dateTime || e.start?.date, end: e.end?.dateTime || e.end?.date,
        location: e.location || '', status: e.status,
      }));
      return ok({ events, count: events.length });
    }

    if (action === 'create') {
      if (!event.summary) return fail('event.summary required');
      const body = {
        summary: event.summary,
        description: event.description || '',
        location: event.location || '',
        start: { dateTime: event.start || new Date(Date.now() + 3600000).toISOString(), timeZone: event.timeZone || 'UTC' },
        end: { dateTime: event.end || new Date(Date.now() + 7200000).toISOString(), timeZone: event.timeZone || 'UTC' },
        attendees: (event.attendees || []).map(e => ({ email: e })),
      };
      const url = `${baseUrl}/events${keyParam ? '?' + keyParam : ''}`;
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) return fail(data.error?.message || `HTTP ${res.status}`);
      return ok({ id: data.id, summary: data.summary, htmlLink: data.htmlLink, start: data.start, end: data.end });
    }

    if (action === 'delete') {
      if (!eventId) return fail('eventId required');
      const url = `${baseUrl}/events/${eventId}${keyParam ? '?' + keyParam : ''}`;
      const res = await fetch(url, { method: 'DELETE', headers });
      if (!res.ok) { const data = await res.json().catch(() => ({})); return fail(data.error?.message || `HTTP ${res.status}`); }
      return ok({ deleted: eventId });
    }

    if (action === 'get') {
      if (!eventId) return fail('eventId required');
      const url = `${baseUrl}/events/${eventId}${keyParam ? '?' + keyParam : ''}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      if (!res.ok) return fail(data.error?.message || `HTTP ${res.status}`);
      return ok({ event: data });
    }

    return fail(`Unknown action: ${action}. Use: list, create, get, delete`);
  } catch (e) { return fail(e.message); }
}

/**
 * 3. hubspot_api — HubSpot CRM operations (contacts, companies, deals).
 * Requires HUBSPOT_API_KEY or HUBSPOT_TOKEN in env.
 */
export async function hubspot_api({ action = 'list', resource = 'contacts', data = {}, id = '', query = '', limit = 10 }) {
  const token = process.env.HUBSPOT_TOKEN || process.env.HUBSPOT_API_KEY || '';
  if (!token) return fail('Set HUBSPOT_TOKEN in environment. Get from app.hubspot.com → Settings → Integrations → API Key');

  const baseUrl = 'https://api.hubapi.com/crm/v3/objects';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'list') {
      const url = `${baseUrl}/${resource}?limit=${limit}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ results: body.results || [], total: body.total || 0 });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ record: body });
    }

    if (action === 'create') {
      const res = await fetch(`${baseUrl}/${resource}`, {
        method: 'POST', headers, body: JSON.stringify({ properties: data }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ id: body.id, properties: body.properties });
    }

    if (action === 'update') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ properties: data }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ id: body.id, properties: body.properties });
    }

    if (action === 'search') {
      const res = await fetch(`${baseUrl}/${resource}/search`, {
        method: 'POST', headers,
        body: JSON.stringify({ query: query || '', limit, sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }] }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ results: body.results || [], total: body.total || 0 });
    }

    if (action === 'delete') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { method: 'DELETE', headers });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.message || `HTTP ${res.status}`); }
      return ok({ deleted: id, resource });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, update, search, delete`);
  } catch (e) { return fail(e.message); }
}

/**
 * 4. salesforce_api — Salesforce CRM operations via REST API.
 * Requires SALESFORCE_TOKEN and SALESFORCE_INSTANCE_URL in env.
 */
export async function salesforce_api({ action = 'query', sobject = '', soql = '', id = '', data = {} }) {
  const token = process.env.SALESFORCE_TOKEN || '';
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || '';
  if (!token || !instanceUrl) return fail('Set SALESFORCE_TOKEN and SALESFORCE_INSTANCE_URL in environment');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'query') {
      if (!soql) return fail('soql required for query action');
      const url = `${instanceUrl}/services/data/v59.0/query/?q=${encodeURIComponent(soql)}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(JSON.stringify(body));
      return ok({ records: body.records || [], totalSize: body.totalSize || 0, done: body.done });
    }

    if (action === 'get') {
      if (!sobject || !id) return fail('sobject and id required');
      const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/${sobject}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(JSON.stringify(body));
      return ok({ record: body });
    }

    if (action === 'create') {
      if (!sobject) return fail('sobject required');
      const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/${sobject}`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(JSON.stringify(body));
      return ok({ id: body.id, success: body.success });
    }

    if (action === 'update') {
      if (!sobject || !id) return fail('sobject and id required');
      const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/${sobject}/${id}`, {
        method: 'PATCH', headers, body: JSON.stringify(data),
      });
      if (res.status === 204) return ok({ updated: id, sobject });
      const body = await res.json().catch(() => ({}));
      return fail(JSON.stringify(body));
    }

    if (action === 'delete') {
      if (!sobject || !id) return fail('sobject and id required');
      const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/${sobject}/${id}`, { method: 'DELETE', headers });
      if (res.status === 204) return ok({ deleted: id, sobject });
      const body = await res.json().catch(() => ({}));
      return fail(JSON.stringify(body));
    }

    if (action === 'describe') {
      if (!sobject) return fail('sobject required');
      const res = await fetch(`${instanceUrl}/services/data/v59.0/sobjects/${sobject}/describe`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(JSON.stringify(body));
      const fields = (body.fields || []).map(f => ({ name: f.name, type: f.type, label: f.label }));
      return ok({ name: body.name, label: body.label, fields, fieldCount: fields.length });
    }

    return fail(`Unknown action: ${action}. Use: query, get, create, update, delete, describe`);
  } catch (e) { return fail(e.message); }
}

/**
 * 5. stripe_api — Stripe payments: customers, charges, invoices, refunds.
 * Requires STRIPE_SECRET_KEY in env.
 */
export async function stripe_api({ action = 'list', resource = 'customers', id = '', data = {}, limit = 10 }) {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) return fail('Set STRIPE_SECRET_KEY in environment. Get from dashboard.stripe.com/apikeys');

  const baseUrl = 'https://api.stripe.com/v1';
  const headers = { 'Authorization': `Basic ${Buffer.from(key + ':').toString('base64')}` };

  function toFormData(obj, prefix = '') {
    const pairs = [];
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}[${k}]` : k;
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        pairs.push(...toFormData(v, key));
      } else {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
      }
    }
    return pairs;
  }

  try {
    if (action === 'list') {
      const res = await fetch(`${baseUrl}/${resource}?limit=${limit}`, { headers });
      const body = await res.json();
      if (body.error) return fail(body.error.message);
      return ok({ data: body.data || [], has_more: body.has_more || false });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { headers });
      const body = await res.json();
      if (body.error) return fail(body.error.message);
      return ok({ record: body });
    }

    if (action === 'create') {
      const formBody = toFormData(data).join('&');
      const res = await fetch(`${baseUrl}/${resource}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody,
      });
      const body = await res.json();
      if (body.error) return fail(body.error.message);
      return ok({ id: body.id, object: body.object, status: body.status || 'created' });
    }

    if (action === 'update') {
      if (!id) return fail('id required');
      const formBody = toFormData(data).join('&');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody,
      });
      const body = await res.json();
      if (body.error) return fail(body.error.message);
      return ok({ id: body.id, object: body.object });
    }

    if (action === 'refund') {
      const refundData = id ? { charge: id, ...data } : data;
      const formBody = toFormData(refundData).join('&');
      const res = await fetch(`${baseUrl}/refunds`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body: formBody,
      });
      const body = await res.json();
      if (body.error) return fail(body.error.message);
      return ok({ id: body.id, amount: body.amount, status: body.status, currency: body.currency });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, update, refund`);
  } catch (e) { return fail(e.message); }
}

/**
 * 6. chart_generate — Generate charts as PNG/SVG using QuickChart.io API (free, no API key needed).
 */
export async function chart_generate({ type = 'bar', labels = [], datasets = [], title = '', dst = '', width = 600, height = 400 }) {
  if (!labels.length) return fail('labels array required');
  if (!datasets.length) return fail('datasets array required (each: {label, data[]})');

  const chartConfig = {
    type,
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.label || `Series ${i + 1}`,
        data: ds.data || [],
        backgroundColor: ds.color || ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'][i % 8],
        borderColor: ds.borderColor || ds.color || '#3b82f6',
        fill: ds.fill ?? false,
      })),
    },
    options: {
      plugins: { title: { display: !!title, text: title } },
      scales: type !== 'pie' && type !== 'doughnut' ? { y: { beginAtZero: true } } : undefined,
    },
  };

  try {
    const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=${width}&h=${height}&bkg=white&f=png`;

    if (dst) {
      // Download to file
      const outPath = safePath(dst);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const res = await fetch(url);
      if (!res.ok) return fail(`QuickChart API returned HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(outPath, buf);
      return ok({ path: outPath, bytes: buf.length, type, url });
    }

    // Return URL only (no download)
    return ok({ url, type, width, height, labels: labels.length, datasets: datasets.length });
  } catch (e) { return fail(e.message); }
}

/**
 * 7. quickbooks_api — QuickBooks Online operations via REST API.
 * Requires QUICKBOOKS_TOKEN and QUICKBOOKS_REALM_ID in env.
 */
export async function quickbooks_api({ action = 'query', resource = '', query: soql = '', id = '', data = {} }) {
  const token = process.env.QUICKBOOKS_TOKEN || '';
  const realmId = process.env.QUICKBOOKS_REALM_ID || '';
  const baseUrl = process.env.QUICKBOOKS_BASE_URL || 'https://quickbooks.api.intuit.com';

  if (!token || !realmId) return fail('Set QUICKBOOKS_TOKEN and QUICKBOOKS_REALM_ID in environment. Get from developer.intuit.com');

  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' };
  const apiBase = `${baseUrl}/v3/company/${realmId}`;

  try {
    if (action === 'query') {
      const q = soql || `SELECT * FROM ${resource || 'Customer'} MAXRESULTS 20`;
      const url = `${apiBase}/query?query=${encodeURIComponent(q)}&minorversion=65`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(JSON.stringify(body.Fault || body));
      const response = body.QueryResponse || {};
      const key = Object.keys(response).find(k => Array.isArray(response[k]));
      return ok({ records: key ? response[key] : [], totalCount: response.totalCount || 0 });
    }

    if (action === 'get') {
      if (!resource || !id) return fail('resource and id required');
      const res = await fetch(`${apiBase}/${resource}/${id}?minorversion=65`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(JSON.stringify(body.Fault || body));
      return ok({ record: body[resource] || body });
    }

    if (action === 'create') {
      if (!resource) return fail('resource required');
      const res = await fetch(`${apiBase}/${resource}?minorversion=65`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(JSON.stringify(body.Fault || body));
      return ok({ record: body[resource] || body });
    }

    if (action === 'report') {
      const reportName = resource || 'ProfitAndLoss';
      const url = `${apiBase}/reports/${reportName}?minorversion=65`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(JSON.stringify(body.Fault || body));
      return ok({ report: body });
    }

    return fail(`Unknown action: ${action}. Use: query, get, create, report`);
  } catch (e) { return fail(e.message); }
}

/**
 * 8. twilio_sms — Send SMS via Twilio REST API.
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in env.
 */
export async function twilio_sms({ to = '', body = '', from = '' }) {
  const sid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const defaultFrom = process.env.TWILIO_PHONE_NUMBER || '';

  if (!sid || !authToken) return fail('Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment. Get from twilio.com/console');
  if (!to) return fail('to (phone number) required');
  if (!body) return fail('body (message text) required');

  const fromNumber = from || defaultFrom;
  if (!fromNumber) return fail('from phone number required (set TWILIO_PHONE_NUMBER in env or pass from arg)');

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const formBody = `To=${encodeURIComponent(to)}&From=${encodeURIComponent(fromNumber)}&Body=${encodeURIComponent(body)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(sid + ':' + authToken).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });
    const data = await res.json();
    if (data.error_code) return fail(`Twilio error ${data.error_code}: ${data.error_message}`);
    return ok({ sid: data.sid, to: data.to, from: data.from, status: data.status, body: data.body });
  } catch (e) { return fail(e.message); }
}

/**
 * 9. sentiment_analysis — Classify text sentiment using keyword scoring.
 * Returns positive/negative/neutral with confidence score.
 */
export function sentiment_analysis({ text = '' }) {
  if (!text) return fail('text required');

  const positive = new Set(['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'loved', 'happy', 'glad', 'pleased', 'satisfied', 'awesome', 'outstanding', 'perfect', 'brilliant', 'superb', 'delighted', 'thrilled', 'impressive', 'beautiful', 'best', 'better', 'enjoy', 'enjoyed', 'thank', 'thanks', 'helpful', 'recommended', 'positive', 'success', 'successful', 'win', 'winning', 'improve', 'improved', 'growth', 'profit', 'gain', 'benefit', 'nice', 'friendly', 'fast', 'efficient', 'reliable', 'innovative', 'exciting']);
  const negative = new Set(['bad', 'terrible', 'awful', 'horrible', 'poor', 'worst', 'hate', 'hated', 'angry', 'frustrated', 'disappointed', 'dissatisfied', 'annoyed', 'upset', 'failure', 'failed', 'slow', 'broken', 'bug', 'error', 'crash', 'problem', 'issue', 'complaint', 'refund', 'cancel', 'cancelled', 'lost', 'loss', 'decline', 'decrease', 'negative', 'expensive', 'overpriced', 'ugly', 'confusing', 'complicated', 'difficult', 'unreliable', 'useless', 'waste', 'scam', 'fraud', 'rude', 'unprofessional', 'delay', 'delayed']);

  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  let posCount = 0, negCount = 0;
  const posWords = [], negWords = [];

  for (const word of words) {
    if (positive.has(word)) { posCount++; posWords.push(word); }
    if (negative.has(word)) { negCount++; negWords.push(word); }
  }

  const total = posCount + negCount;
  let label, score;
  if (total === 0) {
    label = 'neutral'; score = 0.5;
  } else if (posCount > negCount) {
    label = 'positive'; score = 0.5 + (posCount - negCount) / (total * 2);
  } else if (negCount > posCount) {
    label = 'negative'; score = 0.5 - (negCount - posCount) / (total * 2);
  } else {
    label = 'neutral'; score = 0.5;
  }

  return ok({
    sentiment: label,
    score: Math.round(score * 1000) / 1000,
    positive_words: posWords,
    negative_words: negWords,
    word_count: words.length,
    signal_count: total,
  });
}

// ── Medium-Priority Tools ──────────────────────────────────────────────────

/**
 * transcribe_audio — Transcribe audio file to text via Whisper API, AssemblyAI, or local CLI.
 */
export async function transcribe_audio({ path: filePath = '', provider = 'whisper', api_key = '' }) {
  if (!filePath) return fail('path required');
  const p = safePath(filePath);
  if (!fs.existsSync(p)) return fail('file not found: ' + p);

  try {
    if (provider === 'whisper' || provider === 'openai') {
      const key = api_key || process.env.OPENAI_API_KEY || '';
      if (!key) return fail('Set OPENAI_API_KEY in environment for Whisper transcription');
      const fileBuffer = fs.readFileSync(p);
      const fileName = path.basename(p);
      const boundary = '----FormBoundary' + crypto.randomBytes(8).toString('hex');
      const bodyParts = [
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
        fileBuffer,
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n--${boundary}--\r\n`,
      ];
      const body = Buffer.concat(bodyParts.map(p => typeof p === 'string' ? Buffer.from(p) : p));
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) return fail(data.error?.message || `HTTP ${res.status}`);
      return ok({ text: data.text, duration: data.duration || null, provider: 'whisper' });
    }

    if (provider === 'assemblyai') {
      const key = api_key || process.env.ASSEMBLYAI_API_KEY || '';
      if (!key) return fail('Set ASSEMBLYAI_API_KEY in environment');
      const fileBuffer = fs.readFileSync(p);
      const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: { 'authorization': key, 'Content-Type': 'application/octet-stream' },
        body: fileBuffer,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) return fail(uploadData.error || `Upload HTTP ${uploadRes.status}`);
      const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
        method: 'POST',
        headers: { 'authorization': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: uploadData.upload_url }),
      });
      const transcriptData = await transcriptRes.json();
      if (!transcriptRes.ok) return fail(transcriptData.error || `Transcript HTTP ${transcriptRes.status}`);
      // Poll for completion
      const transcriptId = transcriptData.id;
      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: { 'authorization': key },
        });
        const pollData = await pollRes.json();
        if (pollData.status === 'completed') return ok({ text: pollData.text, duration: pollData.audio_duration || null, provider: 'assemblyai' });
        if (pollData.status === 'error') return fail(pollData.error || 'Transcription failed');
      }
      return fail('Transcription timed out after 3 minutes');
    }

    // Fallback: local whisper CLI
    try {
      const stdout = execSync(`whisper "${p}" --output_format txt`, { encoding: 'utf8', timeout: 120000 });
      return ok({ text: stdout.trim(), duration: null, provider: 'local_whisper' });
    } catch (e) {
      return fail('No provider available. Set OPENAI_API_KEY or ASSEMBLYAI_API_KEY, or install whisper CLI');
    }
  } catch (e) { return fail(e.message); }
}

/**
 * shopify_api — Shopify Admin API operations for products, orders, customers, etc.
 */
export async function shopify_api({ action = 'list', resource = 'products', id = '', data = {}, query = '', limit = 10 }) {
  const token = process.env.SHOPIFY_TOKEN || '';
  const storeUrl = (process.env.SHOPIFY_STORE_URL || '').replace(/\/+$/, '');
  if (!token) return fail('Set SHOPIFY_TOKEN in environment. Get from Shopify Admin → Apps → Develop apps');
  if (!storeUrl) return fail('Set SHOPIFY_STORE_URL in environment (e.g., https://your-store.myshopify.com)');

  const baseUrl = `${storeUrl}/admin/api/2024-01/${resource}.json`;
  const headers = { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };

  try {
    if (action === 'list') {
      const url = query ? `${baseUrl}?limit=${limit}&${query}` : `${baseUrl}?limit=${limit}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errors || `HTTP ${res.status}`);
      return ok({ results: body[resource] || [], resource });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const url = `${storeUrl}/admin/api/2024-01/${resource}/${id}.json`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errors || `HTTP ${res.status}`);
      return ok({ record: body[resource.replace(/s$/, '')] || body });
    }

    if (action === 'create') {
      const singular = resource.replace(/s$/, '');
      const res = await fetch(baseUrl, {
        method: 'POST', headers, body: JSON.stringify({ [singular]: data }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errors || `HTTP ${res.status}`);
      return ok({ record: body[singular] || body });
    }

    if (action === 'update') {
      if (!id) return fail('id required');
      const singular = resource.replace(/s$/, '');
      const url = `${storeUrl}/admin/api/2024-01/${resource}/${id}.json`;
      const res = await fetch(url, {
        method: 'PUT', headers, body: JSON.stringify({ [singular]: data }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errors || `HTTP ${res.status}`);
      return ok({ record: body[singular] || body });
    }

    if (action === 'delete') {
      if (!id) return fail('id required');
      const url = `${storeUrl}/admin/api/2024-01/${resource}/${id}.json`;
      const res = await fetch(url, { method: 'DELETE', headers });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.errors || `HTTP ${res.status}`); }
      return ok({ deleted: id, resource });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, update, delete`);
  } catch (e) { return fail(e.message); }
}

/**
 * jira_api — Jira Cloud REST API for issues, search, transitions.
 */
export async function jira_api({ action = 'search', project = '', issueKey = '', data = {}, jql = '', limit = 20 }) {
  const token = process.env.JIRA_API_TOKEN || '';
  const baseUrl = (process.env.JIRA_BASE_URL || '').replace(/\/+$/, '');
  const email = process.env.JIRA_EMAIL || '';
  if (!token || !baseUrl || !email) return fail('Set JIRA_API_TOKEN, JIRA_BASE_URL, and JIRA_EMAIL in environment');

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };

  try {
    if (action === 'search') {
      const query = jql || (project ? `project=${project} ORDER BY updated DESC` : 'ORDER BY updated DESC');
      const url = `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(query)}&maxResults=${limit}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errorMessages?.join(', ') || `HTTP ${res.status}`);
      return ok({ issues: body.issues || [], total: body.total || 0 });
    }

    if (action === 'get') {
      if (!issueKey) return fail('issueKey required');
      const res = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errorMessages?.join(', ') || `HTTP ${res.status}`);
      return ok({ issue: body });
    }

    if (action === 'create') {
      const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errorMessages?.join(', ') || JSON.stringify(body.errors) || `HTTP ${res.status}`);
      return ok({ key: body.key, id: body.id, self: body.self });
    }

    if (action === 'update') {
      if (!issueKey) return fail('issueKey required');
      const res = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
        method: 'PUT', headers, body: JSON.stringify(data),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.errorMessages?.join(', ') || `HTTP ${res.status}`); }
      return ok({ updated: issueKey });
    }

    if (action === 'transition') {
      if (!issueKey) return fail('issueKey required');
      const res = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.errorMessages?.join(', ') || `HTTP ${res.status}`); }
      return ok({ transitioned: issueKey });
    }

    return fail(`Unknown action: ${action}. Use: search, get, create, update, transition`);
  } catch (e) { return fail(e.message); }
}

/**
 * google_sheets_api — Google Sheets read/write/append/create operations.
 */
export async function google_sheets_api({ action = 'read', spreadsheetId = '', range = 'Sheet1', values = [], data = {} }) {
  const token = process.env.GOOGLE_OAUTH_TOKEN || '';
  if (!token) return fail('Set GOOGLE_OAUTH_TOKEN in environment');

  const base = 'https://sheets.googleapis.com/v4/spreadsheets';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'read') {
      if (!spreadsheetId) return fail('spreadsheetId required');
      const res = await fetch(`${base}/${spreadsheetId}/values/${encodeURIComponent(range)}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ values: body.values || [], range: body.range });
    }

    if (action === 'write') {
      if (!spreadsheetId) return fail('spreadsheetId required');
      const url = `${base}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
      const res = await fetch(url, {
        method: 'PUT', headers, body: JSON.stringify({ values }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ updatedCells: body.updatedCells, updatedRange: body.updatedRange });
    }

    if (action === 'append') {
      if (!spreadsheetId) return fail('spreadsheetId required');
      const url = `${base}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
      const res = await fetch(url, {
        method: 'POST', headers, body: JSON.stringify({ values }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ updatedRange: body.updates?.updatedRange, updatedRows: body.updates?.updatedRows });
    }

    if (action === 'create') {
      const res = await fetch(base, {
        method: 'POST', headers, body: JSON.stringify(data.title ? { properties: { title: data.title } } : {}),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ spreadsheetId: body.spreadsheetId, spreadsheetUrl: body.spreadsheetUrl });
    }

    return fail(`Unknown action: ${action}. Use: read, write, append, create`);
  } catch (e) { return fail(e.message); }
}

/**
 * social_media_post — Post to Twitter, LinkedIn, or Facebook.
 */
export async function social_media_post({ platform = 'twitter', text = '', image_url = '', access_token = '' }) {
  if (!text) return fail('text required');

  try {
    if (platform === 'twitter') {
      const token = access_token || process.env.TWITTER_BEARER_TOKEN || '';
      if (!token) return fail('Set TWITTER_BEARER_TOKEN in environment');
      const res = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.detail || body.title || `HTTP ${res.status}`);
      return ok({ platform: 'twitter', id: body.data?.id, text: body.data?.text });
    }

    if (platform === 'linkedin') {
      const token = access_token || process.env.LINKEDIN_ACCESS_TOKEN || '';
      if (!token) return fail('Set LINKEDIN_ACCESS_TOKEN in environment');
      const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify({
          author: 'urn:li:person:me',
          lifecycleState: 'PUBLISHED',
          specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text }, shareMediaCategory: 'NONE' } },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ platform: 'linkedin', id: body.id });
    }

    if (platform === 'facebook') {
      const token = access_token || process.env.FACEBOOK_ACCESS_TOKEN || '';
      if (!token) return fail('Set FACEBOOK_ACCESS_TOKEN in environment');
      const params = new URLSearchParams({ message: text, access_token: token });
      if (image_url) params.set('link', image_url);
      const res = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ platform: 'facebook', id: body.id });
    }

    return fail(`Unknown platform: ${platform}. Use: twitter, linkedin, facebook`);
  } catch (e) { return fail(e.message); }
}

/**
 * calendly_api — Calendly event types and scheduled events.
 */
export async function calendly_api({ action = 'list', resource = 'event_types', id = '', limit = 20 }) {
  const token = process.env.CALENDLY_API_KEY || '';
  if (!token) return fail('Set CALENDLY_API_KEY in environment. Get from calendly.com → Integrations → API');

  const baseUrl = 'https://api.calendly.com';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'list') {
      // First get current user to obtain URI
      const userRes = await fetch(`${baseUrl}/users/me`, { headers });
      const userData = await userRes.json();
      if (!userRes.ok) return fail(userData.message || `HTTP ${userRes.status}`);
      const userUri = userData.resource?.uri || '';

      let url;
      if (resource === 'event_types') {
        url = `${baseUrl}/event_types?user=${encodeURIComponent(userUri)}&count=${limit}`;
      } else if (resource === 'events' || resource === 'scheduled_events') {
        url = `${baseUrl}/scheduled_events?user=${encodeURIComponent(userUri)}&count=${limit}`;
      } else {
        url = `${baseUrl}/${resource}?count=${limit}`;
      }
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ collection: body.collection || [], pagination: body.pagination });
    }

    if (action === 'get') {
      if (!id) return fail('id (full URI or UUID) required');
      const url = id.startsWith('http') ? id : `${baseUrl}/scheduled_events/${id}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ resource: body.resource });
    }

    return fail(`Unknown action: ${action}. Use: list, get`);
  } catch (e) { return fail(e.message); }
}

/**
 * asana_api — Asana project and task management.
 */
export async function asana_api({ action = 'list', resource = 'tasks', project = '', id = '', data = {}, limit = 20 }) {
  const token = process.env.ASANA_ACCESS_TOKEN || '';
  if (!token) return fail('Set ASANA_ACCESS_TOKEN in environment. Get from app.asana.com → Developer Console');

  const baseUrl = 'https://app.asana.com/api/1.0';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'list') {
      let url;
      if (resource === 'tasks' && project) {
        url = `${baseUrl}/projects/${project}/tasks?limit=${limit}`;
      } else {
        url = `${baseUrl}/${resource}?limit=${limit}`;
      }
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body.data || [] });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body.data });
    }

    if (action === 'create') {
      const res = await fetch(`${baseUrl}/${resource}`, {
        method: 'POST', headers, body: JSON.stringify({ data }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body.data });
    }

    if (action === 'update') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, {
        method: 'PUT', headers, body: JSON.stringify({ data }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body.data });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, update`);
  } catch (e) { return fail(e.message); }
}

/**
 * zoom_api — Zoom meetings management via OAuth2.
 */
export async function zoom_api({ action = 'list', resource = 'meetings', id = '', data = {} }) {
  const accountId = process.env.ZOOM_ACCOUNT_ID || '';
  const clientId = process.env.ZOOM_CLIENT_ID || '';
  const clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
  if (!accountId || !clientId || !clientSecret) return fail('Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in environment');

  try {
    // Get OAuth token
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return fail(tokenData.reason || `Token HTTP ${tokenRes.status}`);
    const token = tokenData.access_token;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    if (action === 'list') {
      const res = await fetch(`https://api.zoom.us/v2/users/me/${resource}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ results: body[resource] || body.meetings || [], total: body.total_records || 0 });
    }

    if (action === 'create') {
      const res = await fetch(`https://api.zoom.us/v2/users/me/${resource}`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ id: body.id, join_url: body.join_url, start_url: body.start_url, topic: body.topic });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`https://api.zoom.us/v2/${resource}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ meeting: body });
    }

    if (action === 'delete') {
      if (!id) return fail('id required');
      const res = await fetch(`https://api.zoom.us/v2/${resource}/${id}`, { method: 'DELETE', headers });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.message || `HTTP ${res.status}`); }
      return ok({ deleted: id });
    }

    return fail(`Unknown action: ${action}. Use: list, create, get, delete`);
  } catch (e) { return fail(e.message); }
}

/**
 * clearbit_enrichment — Enrich person/company data via Clearbit API.
 */
export async function clearbit_enrichment({ email = '', domain = '', type = 'combined' }) {
  const key = process.env.CLEARBIT_API_KEY || '';
  if (!key) return fail('Set CLEARBIT_API_KEY in environment. Get from clearbit.com/docs');

  const headers = { 'Authorization': `Bearer ${key}` };

  try {
    let url;
    if (type === 'person') {
      if (!email) return fail('email required for person enrichment');
      url = `https://person.clearbit.com/v2/people/find?email=${encodeURIComponent(email)}`;
    } else if (type === 'company') {
      if (!domain) return fail('domain required for company enrichment');
      url = `https://company.clearbit.com/v2/companies/find?domain=${encodeURIComponent(domain)}`;
    } else {
      if (!email) return fail('email required for combined enrichment');
      url = `https://person.clearbit.com/v2/combined/find?email=${encodeURIComponent(email)}`;
    }

    const res = await fetch(url, { headers });
    if (res.status === 202) return ok({ status: 'pending', message: 'Enrichment in progress, try again shortly' });
    if (res.status === 404) return ok({ status: 'not_found', message: 'No data found' });
    const body = await res.json();
    if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
    return ok({ type, data: body });
  } catch (e) { return fail(e.message); }
}

/**
 * docusign_api — DocuSign envelope management.
 */
export async function docusign_api({ action = 'list', envelopeId = '', data = {}, template = '' }) {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY || '';
  const secretKey = process.env.DOCUSIGN_SECRET_KEY || '';
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID || '';
  const baseUrl = (process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi').replace(/\/+$/, '');
  if (!integrationKey || !accountId) return fail('Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_ACCOUNT_ID, and DOCUSIGN_BASE_URL in environment');

  const token = process.env.DOCUSIGN_ACCESS_TOKEN || secretKey;
  if (!token) return fail('Set DOCUSIGN_ACCESS_TOKEN or DOCUSIGN_SECRET_KEY in environment');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const envelopesUrl = `${baseUrl}/v2.1/accounts/${accountId}/envelopes`;

  try {
    if (action === 'list') {
      const res = await fetch(`${envelopesUrl}?from_date=${new Date(Date.now() - 30 * 86400000).toISOString()}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ envelopes: body.envelopes || [], resultSetSize: body.resultSetSize });
    }

    if (action === 'get') {
      if (!envelopeId) return fail('envelopeId required');
      const res = await fetch(`${envelopesUrl}/${envelopeId}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ envelope: body });
    }

    if (action === 'create') {
      const envelope = template
        ? { templateId: template, status: 'sent', ...data }
        : { ...data, status: data.status || 'created' };
      const res = await fetch(envelopesUrl, {
        method: 'POST', headers, body: JSON.stringify(envelope),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ envelopeId: body.envelopeId, status: body.status, uri: body.uri });
    }

    if (action === 'send') {
      if (!envelopeId) return fail('envelopeId required');
      const res = await fetch(`${envelopesUrl}/${envelopeId}`, {
        method: 'PUT', headers, body: JSON.stringify({ status: 'sent' }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ envelopeId: body.envelopeId, status: 'sent' });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, send`);
  } catch (e) { return fail(e.message); }
}

/**
 * okta_api — Okta identity management operations.
 */
export async function okta_api({ action = 'list', resource = 'users', id = '', data = {}, query = '' }) {
  const token = process.env.OKTA_API_TOKEN || '';
  const domain = process.env.OKTA_DOMAIN || '';
  if (!token || !domain) return fail('Set OKTA_API_TOKEN and OKTA_DOMAIN in environment');

  const baseUrl = `https://${domain}/api/v1`;
  const headers = { 'Authorization': `SSWS ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };

  try {
    if (action === 'list') {
      const url = query ? `${baseUrl}/${resource}?q=${encodeURIComponent(query)}` : `${baseUrl}/${resource}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errorSummary || `HTTP ${res.status}`);
      return ok({ results: body, count: body.length });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errorSummary || `HTTP ${res.status}`);
      return ok({ data: body });
    }

    if (action === 'create') {
      const res = await fetch(`${baseUrl}/${resource}`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errorSummary || `HTTP ${res.status}`);
      return ok({ data: body });
    }

    if (action === 'deactivate') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/users/${id}/lifecycle/deactivate`, {
        method: 'POST', headers,
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.errorSummary || `HTTP ${res.status}`); }
      return ok({ deactivated: id });
    }

    if (action === 'assign_group') {
      if (!id) return fail('id (groupId) required');
      const userId = data.userId || '';
      if (!userId) return fail('data.userId required');
      const res = await fetch(`${baseUrl}/groups/${id}/users/${userId}`, {
        method: 'PUT', headers,
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.errorSummary || `HTTP ${res.status}`); }
      return ok({ assigned: userId, group: id });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, deactivate, assign_group`);
  } catch (e) { return fail(e.message); }
}

/**
 * text_to_speech — Convert text to audio via OpenAI TTS or ElevenLabs.
 */
export async function text_to_speech({ text = '', voice = 'alloy', dst = '', provider = 'openai' }) {
  if (!text) return fail('text required');
  const outPath = dst ? safePath(dst) : path.join(WORKSPACE, `tts_${Date.now()}.mp3`);

  try {
    if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY || '';
      if (!key) return fail('Set OPENAI_API_KEY in environment');
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: text, voice }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.error?.message || `HTTP ${res.status}`); }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      return ok({ path: outPath, bytes: buffer.length, provider: 'openai' });
    }

    if (provider === 'elevenlabs') {
      const key = process.env.ELEVENLABS_API_KEY || '';
      if (!key) return fail('Set ELEVENLABS_API_KEY in environment');
      const voiceId = voice || 'EXAVITQu4vr4xnSDxMaL'; // default "Rachel" voice
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: 'eleven_monolingual_v1' }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); return fail(body.detail?.message || `HTTP ${res.status}`); }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, buffer);
      return ok({ path: outPath, bytes: buffer.length, provider: 'elevenlabs' });
    }

    return fail(`Unknown provider: ${provider}. Use: openai, elevenlabs`);
  } catch (e) { return fail(e.message); }
}

// ── Low-Priority Tools ────────────────────────────────────────────────────

/**
 * google_analytics_api — Run a report against Google Analytics Data API.
 */
export async function google_analytics_api({ property = '', startDate = '30daysAgo', endDate = 'today', metrics = [], dimensions = [] }) {
  const token = process.env.GOOGLE_OAUTH_TOKEN || '';
  const propertyId = property || process.env.GA_PROPERTY_ID || '';
  if (!token) return fail('Set GOOGLE_OAUTH_TOKEN in environment');
  if (!propertyId) return fail('property or GA_PROPERTY_ID required');
  if (!metrics.length) return fail('metrics array required (e.g., ["sessions", "activeUsers"])');

  try {
    const body = {
      dateRanges: [{ startDate, endDate }],
      metrics: metrics.map(m => ({ name: m })),
    };
    if (dimensions.length) body.dimensions = dimensions.map(d => ({ name: d }));

    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return fail(data.error?.message || `HTTP ${res.status}`);
    return ok({ rows: data.rows || [], rowCount: data.rowCount || 0, metadata: data.metadata });
  } catch (e) { return fail(e.message); }
}

/**
 * search_console_api — Query Google Search Console performance data.
 */
export async function search_console_api({ siteUrl = '', startDate = '', endDate = '', query = '', limit = 10 }) {
  const token = process.env.GOOGLE_OAUTH_TOKEN || '';
  if (!token) return fail('Set GOOGLE_OAUTH_TOKEN in environment');
  if (!siteUrl) return fail('siteUrl required (e.g., https://example.com)');

  const start = startDate || new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];
  const end = endDate || new Date().toISOString().split('T')[0];

  try {
    const body = { startDate: start, endDate: end, rowLimit: limit, dimensions: ['query', 'page'] };
    if (query) body.dimensionFilterGroups = [{ filters: [{ dimension: 'query', operator: 'contains', expression: query }] }];

    const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return fail(data.error?.message || `HTTP ${res.status}`);
    return ok({ rows: data.rows || [], responseAggregationType: data.responseAggregationType });
  } catch (e) { return fail(e.message); }
}

/**
 * wordpress_publish — Create or update WordPress posts via REST API.
 */
export async function wordpress_publish({ action = 'create', title = '', content = '', status = 'draft', postId = '', site_url = '' }) {
  const siteUrl = (site_url || process.env.WORDPRESS_SITE_URL || '').replace(/\/+$/, '');
  const user = process.env.WORDPRESS_USER || '';
  const appPassword = process.env.WORDPRESS_APP_PASSWORD || '';
  if (!siteUrl) return fail('Set WORDPRESS_SITE_URL or pass site_url');
  if (!user || !appPassword) return fail('Set WORDPRESS_USER and WORDPRESS_APP_PASSWORD in environment');

  const auth = Buffer.from(`${user}:${appPassword}`).toString('base64');
  const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };
  const apiBase = `${siteUrl}/wp-json/wp/v2/posts`;

  try {
    if (action === 'create') {
      const res = await fetch(apiBase, {
        method: 'POST', headers, body: JSON.stringify({ title, content, status }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ id: body.id, link: body.link, status: body.status, title: body.title?.rendered });
    }

    if (action === 'update') {
      if (!postId) return fail('postId required');
      const payload = {};
      if (title) payload.title = title;
      if (content) payload.content = content;
      if (status) payload.status = status;
      const res = await fetch(`${apiBase}/${postId}`, {
        method: 'PUT', headers, body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ id: body.id, link: body.link, status: body.status, title: body.title?.rendered });
    }

    if (action === 'list') {
      const res = await fetch(`${apiBase}?per_page=10&status=${status}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ posts: body.map(p => ({ id: p.id, title: p.title?.rendered, status: p.status, link: p.link })) });
    }

    return fail(`Unknown action: ${action}. Use: create, update, list`);
  } catch (e) { return fail(e.message); }
}

/**
 * buffer_api — Schedule social media posts via Buffer.
 */
export async function buffer_api({ action = 'create', text = '', profile_ids = [], scheduled_at = '' }) {
  const token = process.env.BUFFER_ACCESS_TOKEN || '';
  if (!token) return fail('Set BUFFER_ACCESS_TOKEN in environment. Get from buffer.com → Settings → API');

  try {
    if (action === 'create') {
      if (!text) return fail('text required');
      const body = { text, profile_ids, access_token: token };
      if (scheduled_at) body.scheduled_at = scheduled_at;
      const res = await fetch('https://api.bufferapp.com/1/updates/create.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return fail(data.message || `HTTP ${res.status}`);
      return ok({ success: data.success, updates: data.updates });
    }

    if (action === 'profiles') {
      const res = await fetch(`https://api.bufferapp.com/1/profiles.json?access_token=${token}`);
      const data = await res.json();
      if (!res.ok) return fail(data.message || `HTTP ${res.status}`);
      return ok({ profiles: data });
    }

    return fail(`Unknown action: ${action}. Use: create, profiles`);
  } catch (e) { return fail(e.message); }
}

/**
 * twitter_search_api — Search recent tweets via Twitter API v2.
 */
export async function twitter_search_api({ query = '', limit = 10, type = 'recent' }) {
  const token = process.env.TWITTER_BEARER_TOKEN || '';
  if (!token) return fail('Set TWITTER_BEARER_TOKEN in environment. Get from developer.twitter.com');
  if (!query) return fail('query required');

  try {
    const url = `https://api.twitter.com/2/tweets/search/${type}?query=${encodeURIComponent(query)}&max_results=${Math.min(Math.max(limit, 10), 100)}&tweet.fields=created_at,author_id,public_metrics`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) return fail(body.detail || body.title || `HTTP ${res.status}`);
    return ok({ tweets: body.data || [], meta: body.meta });
  } catch (e) { return fail(e.message); }
}

/**
 * reddit_api — Search Reddit via OAuth2.
 */
export async function reddit_api({ action = 'search', subreddit = '', query = '', sort = 'relevance', limit = 10 }) {
  const clientId = process.env.REDDIT_CLIENT_ID || '';
  const clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return fail('Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in environment');

  try {
    // Get OAuth token
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ArtificialBrain/3.0' },
      body: 'grant_type=client_credentials',
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return fail(tokenData.message || `Token HTTP ${tokenRes.status}`);
    const token = tokenData.access_token;
    const headers = { 'Authorization': `Bearer ${token}`, 'User-Agent': 'ArtificialBrain/3.0' };

    if (action === 'search') {
      if (!query) return fail('query required');
      const url = subreddit
        ? `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(query)}&sort=${sort}&limit=${limit}&restrict_sr=on`
        : `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=${sort}&limit=${limit}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      const posts = (body.data?.children || []).map(c => ({
        title: c.data.title, subreddit: c.data.subreddit, score: c.data.score,
        url: c.data.url, author: c.data.author, num_comments: c.data.num_comments,
      }));
      return ok({ posts, count: posts.length });
    }

    if (action === 'hot' || action === 'top' || action === 'new') {
      const sub = subreddit || 'all';
      const res = await fetch(`https://oauth.reddit.com/r/${sub}/${action}?limit=${limit}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      const posts = (body.data?.children || []).map(c => ({
        title: c.data.title, subreddit: c.data.subreddit, score: c.data.score,
        url: c.data.url, author: c.data.author, num_comments: c.data.num_comments,
      }));
      return ok({ posts, count: posts.length });
    }

    return fail(`Unknown action: ${action}. Use: search, hot, top, new`);
  } catch (e) { return fail(e.message); }
}

/**
 * trustpilot_api — Fetch business reviews from Trustpilot.
 */
export async function trustpilot_api({ action = 'list', businessUnitId = '', limit = 10 }) {
  const key = process.env.TRUSTPILOT_API_KEY || '';
  if (!key) return fail('Set TRUSTPILOT_API_KEY in environment');
  if (!businessUnitId) return fail('businessUnitId required');

  try {
    if (action === 'list') {
      const res = await fetch(`https://api.trustpilot.com/v1/business-units/${businessUnitId}/reviews?perPage=${limit}`, {
        headers: { 'apikey': key },
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ reviews: body.reviews || [], links: body.links });
    }

    if (action === 'get') {
      const res = await fetch(`https://api.trustpilot.com/v1/business-units/${businessUnitId}`, {
        headers: { 'apikey': key },
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ business: body });
    }

    return fail(`Unknown action: ${action}. Use: list, get`);
  } catch (e) { return fail(e.message); }
}

/**
 * mailchimp_api — Mailchimp marketing API for lists, campaigns, members.
 */
export async function mailchimp_api({ action = 'list', resource = 'lists', id = '', data = {}, limit = 10 }) {
  const apiKey = process.env.MAILCHIMP_API_KEY || '';
  if (!apiKey) return fail('Set MAILCHIMP_API_KEY in environment (format: key-dc)');
  const dc = apiKey.split('-').pop();
  if (!dc) return fail('MAILCHIMP_API_KEY must be in format key-dc (e.g., abc123-us21)');

  const baseUrl = `https://${dc}.api.mailchimp.com/3.0`;
  const headers = { 'Authorization': `apikey ${apiKey}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'list') {
      const res = await fetch(`${baseUrl}/${resource}?count=${limit}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.detail || `HTTP ${res.status}`);
      return ok({ data: body[resource] || body, total: body.total_items });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.detail || `HTTP ${res.status}`);
      return ok({ data: body });
    }

    if (action === 'create') {
      const res = await fetch(`${baseUrl}/${resource}`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.detail || `HTTP ${res.status}`);
      return ok({ data: body });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create`);
  } catch (e) { return fail(e.message); }
}

/**
 * sendgrid_api — Send email via SendGrid API.
 */
export async function sendgrid_api({ action = 'send', to = '', from = '', subject = '', html = '', text = '' }) {
  const key = process.env.SENDGRID_API_KEY || '';
  if (!key) return fail('Set SENDGRID_API_KEY in environment');

  try {
    if (action === 'send') {
      if (!to || !from || !subject) return fail('to, from, and subject required');
      const content = [];
      if (text) content.push({ type: 'text/plain', value: text });
      if (html) content.push({ type: 'text/html', value: html });
      if (!content.length) return fail('html or text content required');

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from },
          subject,
          content,
        }),
      });
      if (res.status === 202) return ok({ sent: true, to, subject });
      const body = await res.json().catch(() => ({}));
      return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
    }

    return fail(`Unknown action: ${action}. Use: send`);
  } catch (e) { return fail(e.message); }
}

/**
 * linkedin_company_api — LinkedIn company/organization data.
 */
export async function linkedin_company_api({ action = 'get', companyId = '', query = '' }) {
  const token = process.env.LINKEDIN_ACCESS_TOKEN || '';
  if (!token) return fail('Set LINKEDIN_ACCESS_TOKEN in environment');

  const headers = { 'Authorization': `Bearer ${token}`, 'X-Restli-Protocol-Version': '2.0.0' };

  try {
    if (action === 'get') {
      if (!companyId) return fail('companyId required');
      const res = await fetch(`https://api.linkedin.com/v2/organizations/${companyId}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ organization: body });
    }

    if (action === 'search') {
      if (!query) return fail('query required');
      const res = await fetch(`https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&count=10`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ results: body.elements || [] });
    }

    return fail(`Unknown action: ${action}. Use: get, search`);
  } catch (e) { return fail(e.message); }
}

/**
 * crunchbase_api — Search Crunchbase for organizations and people.
 */
export async function crunchbase_api({ query = '', type = 'organizations', limit = 5 }) {
  const key = process.env.CRUNCHBASE_API_KEY || '';
  if (!key) return fail('Set CRUNCHBASE_API_KEY in environment. Get from crunchbase.com/accelerator');
  if (!query) return fail('query required');

  try {
    const res = await fetch(`https://api.crunchbase.com/api/v4/autocompletes?query=${encodeURIComponent(query)}&collection_ids=${type}&limit=${limit}`, {
      headers: { 'X-cb-user-key': key },
    });
    const body = await res.json();
    if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
    return ok({ entities: body.entities || [], count: body.count || 0 });
  } catch (e) { return fail(e.message); }
}

/**
 * glassdoor_api — Search Glassdoor employer info (uses web search fallback).
 */
export async function glassdoor_api({ query = '', type = 'employers', limit = 5 }) {
  if (!query) return fail('query required');

  try {
    // Glassdoor API is restricted; use DuckDuckGo search as fallback
    const searchQuery = `site:glassdoor.com ${type} ${query}`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const results = [];
    const re = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null && results.length < limit) {
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      const href = m[1];
      if (title && href.includes('glassdoor')) results.push({ title, url: href });
    }
    return ok({ results, source: 'web_search', note: 'Glassdoor API is restricted; showing web search results' });
  } catch (e) { return fail(e.message); }
}

/**
 * zoominfo_api — Search ZoomInfo contacts and companies.
 */
export async function zoominfo_api({ action = 'search', type = 'contacts', query = '', limit = 10 }) {
  const clientId = process.env.ZOOMINFO_CLIENT_ID || '';
  const privateKey = process.env.ZOOMINFO_PRIVATE_KEY || '';
  if (!clientId || !privateKey) return fail('Set ZOOMINFO_CLIENT_ID and ZOOMINFO_PRIVATE_KEY in environment');

  try {
    // Authenticate
    const authRes = await fetch('https://api.zoominfo.com/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, privateKey }),
    });
    const authData = await authRes.json();
    if (!authRes.ok) return fail(authData.message || `Auth HTTP ${authRes.status}`);
    const token = authData.jwt;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const endpoint = type === 'contacts' ? '/search/contact' : '/search/company';
    const searchBody = type === 'contacts'
      ? { fullName: query, maxResults: limit }
      : { companyName: query, maxResults: limit };

    const res = await fetch(`https://api.zoominfo.com${endpoint}`, {
      method: 'POST', headers, body: JSON.stringify(searchBody),
    });
    const body = await res.json();
    if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
    return ok({ results: body.data || [], maxResults: body.maxResults });
  } catch (e) { return fail(e.message); }
}

/**
 * pipedrive_api — Pipedrive CRM operations for deals, persons, organizations.
 */
export async function pipedrive_api({ action = 'list', resource = 'deals', id = '', data = {}, limit = 20 }) {
  const token = process.env.PIPEDRIVE_API_TOKEN || '';
  if (!token) return fail('Set PIPEDRIVE_API_TOKEN in environment. Get from Pipedrive → Settings → API');

  const baseUrl = `https://api.pipedrive.com/v1`;

  try {
    if (action === 'list') {
      const res = await fetch(`${baseUrl}/${resource}?api_token=${token}&limit=${limit}`);
      const body = await res.json();
      if (!body.success) return fail(body.error || 'Request failed');
      return ok({ data: body.data || [], additional_data: body.additional_data });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}?api_token=${token}`);
      const body = await res.json();
      if (!body.success) return fail(body.error || 'Request failed');
      return ok({ data: body.data });
    }

    if (action === 'create') {
      const res = await fetch(`${baseUrl}/${resource}?api_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!body.success) return fail(body.error || 'Request failed');
      return ok({ data: body.data });
    }

    if (action === 'update') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}?api_token=${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!body.success) return fail(body.error || 'Request failed');
      return ok({ data: body.data });
    }

    if (action === 'delete') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}?api_token=${token}`, { method: 'DELETE' });
      const body = await res.json();
      if (!body.success) return fail(body.error || 'Request failed');
      return ok({ deleted: id });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, update, delete`);
  } catch (e) { return fail(e.message); }
}

/**
 * mixpanel_api — Export events from Mixpanel.
 */
export async function mixpanel_api({ action = 'export', from_date = '', to_date = '', event = '', limit = 100 }) {
  const token = process.env.MIXPANEL_TOKEN || '';
  const secret = process.env.MIXPANEL_API_SECRET || '';
  if (!secret) return fail('Set MIXPANEL_API_SECRET in environment');

  const start = from_date || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const end = to_date || new Date().toISOString().split('T')[0];
  const auth = Buffer.from(`${secret}:`).toString('base64');

  try {
    if (action === 'export') {
      let url = `https://data.mixpanel.com/api/2.0/export?from_date=${start}&to_date=${end}&limit=${limit}`;
      if (event) url += `&event=["${encodeURIComponent(event)}"]`;
      const res = await fetch(url, { headers: { 'Authorization': `Basic ${auth}` } });
      const text = await res.text();
      if (!res.ok) return fail(text || `HTTP ${res.status}`);
      const events = text.trim().split('\n').filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
      return ok({ events: events.slice(0, limit), count: events.length });
    }

    if (action === 'top_events') {
      const res = await fetch(`https://mixpanel.com/api/2.0/events/top?limit=${limit}`, {
        headers: { 'Authorization': `Basic ${auth}` },
      });
      const body = await res.json();
      if (!res.ok) return fail(body.error || `HTTP ${res.status}`);
      return ok({ events: body });
    }

    return fail(`Unknown action: ${action}. Use: export, top_events`);
  } catch (e) { return fail(e.message); }
}

/**
 * amplitude_api — Query Amplitude analytics events.
 */
export async function amplitude_api({ action = 'events', start = '', end = '', limit = 100 }) {
  const apiKey = process.env.AMPLITUDE_API_KEY || '';
  const secretKey = process.env.AMPLITUDE_SECRET_KEY || '';
  if (!apiKey || !secretKey) return fail('Set AMPLITUDE_API_KEY and AMPLITUDE_SECRET_KEY in environment');

  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
  const headers = { 'Authorization': `Basic ${auth}` };

  try {
    if (action === 'events') {
      const res = await fetch('https://amplitude.com/api/2/events/list', { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.error || `HTTP ${res.status}`);
      return ok({ events: (body.data || []).slice(0, limit) });
    }

    if (action === 'active_users') {
      const s = start || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0].replace(/-/g, '');
      const e = end || new Date().toISOString().split('T')[0].replace(/-/g, '');
      const res = await fetch(`https://amplitude.com/api/2/users/active?start=${s}&end=${e}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.error || `HTTP ${res.status}`);
      return ok({ data: body.data });
    }

    return fail(`Unknown action: ${action}. Use: events, active_users`);
  } catch (e) { return fail(e.message); }
}

/**
 * intercom_api — Intercom customer messaging platform API.
 */
export async function intercom_api({ action = 'list', resource = 'contacts', id = '', data = {}, query = '', limit = 20 }) {
  const token = process.env.INTERCOM_ACCESS_TOKEN || '';
  if (!token) return fail('Set INTERCOM_ACCESS_TOKEN in environment');

  const baseUrl = 'https://api.intercom.io';
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };

  try {
    if (action === 'list') {
      const res = await fetch(`${baseUrl}/${resource}?per_page=${limit}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body.data || body[resource] || [], total_count: body.total_count });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body });
    }

    if (action === 'create') {
      const res = await fetch(`${baseUrl}/${resource}`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body });
    }

    if (action === 'search') {
      if (!query) return fail('query required for search');
      const res = await fetch(`${baseUrl}/${resource}/search`, {
        method: 'POST', headers,
        body: JSON.stringify({ query: { field: 'email', operator: '=', value: query } }),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body.data || [], total_count: body.total_count });
    }

    if (action === 'update') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, {
        method: 'PUT', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.errors?.[0]?.message || `HTTP ${res.status}`);
      return ok({ data: body });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, search, update`);
  } catch (e) { return fail(e.message); }
}

/**
 * greenhouse_api — Greenhouse Harvest API for recruiting.
 */
export async function greenhouse_api({ action = 'list', resource = 'candidates', id = '', limit = 20 }) {
  const key = process.env.GREENHOUSE_API_KEY || '';
  if (!key) return fail('Set GREENHOUSE_API_KEY in environment');

  const baseUrl = 'https://harvest.greenhouse.io/v1';
  const auth = Buffer.from(`${key}:`).toString('base64');
  const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'list') {
      const res = await fetch(`${baseUrl}/${resource}?per_page=${limit}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ data: body, count: body.length });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ data: body });
    }

    return fail(`Unknown action: ${action}. Use: list, get`);
  } catch (e) { return fail(e.message); }
}

/**
 * lever_api — Lever ATS API for recruiting opportunities.
 */
export async function lever_api({ action = 'list', resource = 'opportunities', id = '', limit = 20 }) {
  const key = process.env.LEVER_API_KEY || '';
  if (!key) return fail('Set LEVER_API_KEY in environment');

  const baseUrl = 'https://api.lever.co/v1';
  const auth = Buffer.from(`:${key}`).toString('base64');
  const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' };

  try {
    if (action === 'list') {
      const res = await fetch(`${baseUrl}/${resource}?limit=${limit}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ data: body.data || [], hasNext: body.hasNext });
    }

    if (action === 'get') {
      if (!id) return fail('id required');
      const res = await fetch(`${baseUrl}/${resource}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ data: body.data });
    }

    return fail(`Unknown action: ${action}. Use: list, get`);
  } catch (e) { return fail(e.message); }
}

/**
 * notion_api — Notion API for pages, databases, and search.
 */
export async function notion_api({ action = 'search', query = '', pageId = '', databaseId = '', data = {} }) {
  const key = process.env.NOTION_API_KEY || '';
  if (!key) return fail('Set NOTION_API_KEY in environment. Get from notion.so/my-integrations');

  const baseUrl = 'https://api.notion.com/v1';
  const headers = { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' };

  try {
    if (action === 'search') {
      const res = await fetch(`${baseUrl}/search`, {
        method: 'POST', headers, body: JSON.stringify(query ? { query } : {}),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ results: body.results || [], has_more: body.has_more });
    }

    if (action === 'get_page') {
      if (!pageId) return fail('pageId required');
      const res = await fetch(`${baseUrl}/pages/${pageId}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ page: body });
    }

    if (action === 'query_database') {
      if (!databaseId) return fail('databaseId required');
      const res = await fetch(`${baseUrl}/databases/${databaseId}/query`, {
        method: 'POST', headers, body: JSON.stringify(data || {}),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ results: body.results || [], has_more: body.has_more });
    }

    if (action === 'create_page') {
      const res = await fetch(`${baseUrl}/pages`, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.message || `HTTP ${res.status}`);
      return ok({ page: body });
    }

    return fail(`Unknown action: ${action}. Use: search, get_page, query_database, create_page`);
  } catch (e) { return fail(e.message); }
}

/**
 * servicenow_api — ServiceNow table API for incidents, requests, etc.
 */
export async function servicenow_api({ action = 'list', table = 'incident', id = '', data = {}, query = '', limit = 20 }) {
  const instance = process.env.SERVICENOW_INSTANCE || '';
  const user = process.env.SERVICENOW_USER || '';
  const password = process.env.SERVICENOW_PASSWORD || '';
  if (!instance || !user || !password) return fail('Set SERVICENOW_INSTANCE, SERVICENOW_USER, and SERVICENOW_PASSWORD in environment');

  const baseUrl = `https://${instance}.service-now.com/api/now/table/${table}`;
  const auth = Buffer.from(`${user}:${password}`).toString('base64');
  const headers = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };

  try {
    if (action === 'list') {
      const url = query
        ? `${baseUrl}?sysparm_query=${encodeURIComponent(query)}&sysparm_limit=${limit}`
        : `${baseUrl}?sysparm_limit=${limit}`;
      const res = await fetch(url, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ result: body.result || [], count: (body.result || []).length });
    }

    if (action === 'get') {
      if (!id) return fail('id (sys_id) required');
      const res = await fetch(`${baseUrl}/${id}`, { headers });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ result: body.result });
    }

    if (action === 'create') {
      const res = await fetch(baseUrl, {
        method: 'POST', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ result: body.result });
    }

    if (action === 'update') {
      if (!id) return fail('id (sys_id) required');
      const res = await fetch(`${baseUrl}/${id}`, {
        method: 'PATCH', headers, body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return fail(body.error?.message || `HTTP ${res.status}`);
      return ok({ result: body.result });
    }

    return fail(`Unknown action: ${action}. Use: list, get, create, update`);
  } catch (e) { return fail(e.message); }
}

/**
 * semrush_api — SEMrush domain and keyword analytics.
 */
export async function semrush_api({ type = 'domain_overview', domain = '', keyword = '', database = 'us' }) {
  const key = process.env.SEMRUSH_API_KEY || '';
  if (!key) return fail('Set SEMRUSH_API_KEY in environment');

  try {
    let url;
    if (type === 'domain_overview' || type === 'domain_ranks') {
      if (!domain) return fail('domain required');
      url = `https://api.semrush.com/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${encodeURIComponent(domain)}&database=${database}`;
    } else if (type === 'domain_organic') {
      if (!domain) return fail('domain required');
      url = `https://api.semrush.com/?type=domain_organic&key=${key}&export_columns=Ph,Po,Nq,Cp,Ur,Tr,Tc&domain=${encodeURIComponent(domain)}&database=${database}&display_limit=20`;
    } else if (type === 'keyword_overview') {
      if (!keyword) return fail('keyword required');
      url = `https://api.semrush.com/?type=phrase_all&key=${key}&export_columns=Ph,Nq,Cp,Co,Nr&phrase=${encodeURIComponent(keyword)}&database=${database}`;
    } else {
      url = `https://api.semrush.com/?type=${type}&key=${key}&domain=${encodeURIComponent(domain || '')}&database=${database}`;
    }

    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok) return fail(text || `HTTP ${res.status}`);
    if (text.startsWith('ERROR')) return fail(text);
    // Parse semicolon-separated response
    const lines = text.trim().split('\n');
    const headers = lines[0]?.split(';') || [];
    const rows = lines.slice(1).map(line => {
      const vals = line.split(';');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i]; });
      return obj;
    });
    return ok({ headers, rows, raw_lines: lines.length - 1 });
  } catch (e) { return fail(e.message); }
}

/**
 * expensify_api — Expensify integration for expense management.
 */
export async function expensify_api({ action = 'list', type = 'expenses', data = {} }) {
  const partnerId = process.env.EXPENSIFY_PARTNER_ID || '';
  const partnerSecret = process.env.EXPENSIFY_PARTNER_SECRET || '';
  if (!partnerId || !partnerSecret) return fail('Set EXPENSIFY_PARTNER_ID and EXPENSIFY_PARTNER_SECRET in environment');

  try {
    const requestData = {
      type,
      credentials: { partnerUserID: partnerId, partnerUserSecret: partnerSecret },
      ...data,
    };

    if (action === 'list') {
      requestData.type = 'file';
      requestData.onReceive = { immediateResponse: ['returnRandomFileName'] };
      if (!requestData.inputSettings) {
        requestData.inputSettings = {
          type: 'combinedReportData',
          filters: { startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0] },
        };
      }
    }

    const formBody = `requestJobDescription=${encodeURIComponent(JSON.stringify(requestData))}`;
    const res = await fetch('https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody,
    });
    const text = await res.text();
    if (!res.ok) return fail(text || `HTTP ${res.status}`);
    try { return ok({ data: JSON.parse(text) }); } catch { return ok({ data: text }); }
  } catch (e) { return fail(e.message); }
}

/**
 * erp_api — Generic ERP connector (SAP, NetSuite, or any REST-based ERP).
 */
export async function erp_api({ action = 'query', system = 'generic', endpoint = '', method = 'GET', data = {}, headers: customHeaders = {} }) {
  const baseUrl = (process.env.ERP_BASE_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.ERP_API_KEY || '';
  const erpSystem = system || process.env.ERP_SYSTEM || 'generic';
  if (!baseUrl) return fail('Set ERP_BASE_URL in environment');
  if (!endpoint) return fail('endpoint required (e.g., /api/v1/invoices)');

  const headers = { 'Content-Type': 'application/json', ...customHeaders };

  // System-specific auth
  if (erpSystem === 'sap') {
    const sapUser = process.env.SAP_USER || '';
    const sapPassword = process.env.SAP_PASSWORD || '';
    if (sapUser && sapPassword) {
      headers['Authorization'] = `Basic ${Buffer.from(`${sapUser}:${sapPassword}`).toString('base64')}`;
    }
    headers['x-csrf-token'] = 'fetch';
    headers['sap-client'] = process.env.SAP_CLIENT || '100';
  } else if (erpSystem === 'netsuite') {
    const nsAccount = process.env.NETSUITE_ACCOUNT_ID || '';
    const nsToken = process.env.NETSUITE_TOKEN_ID || '';
    const nsTokenSecret = process.env.NETSUITE_TOKEN_SECRET || '';
    const nsConsumerKey = process.env.NETSUITE_CONSUMER_KEY || '';
    const nsConsumerSecret = process.env.NETSUITE_CONSUMER_SECRET || '';
    if (nsAccount && nsToken) {
      const nonce = crypto.randomBytes(16).toString('hex');
      const timestamp = Math.floor(Date.now() / 1000);
      headers['Authorization'] = `OAuth realm="${nsAccount}",oauth_consumer_key="${nsConsumerKey}",oauth_token="${nsToken}",oauth_signature_method="HMAC-SHA256",oauth_timestamp="${timestamp}",oauth_nonce="${nonce}",oauth_version="1.0",oauth_signature="pending"`;
    }
  } else {
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const url = `${baseUrl}${endpoint}`;
    const opts = { method: method.toUpperCase(), headers };
    if (['POST', 'PUT', 'PATCH'].includes(opts.method) && Object.keys(data).length) {
      opts.body = JSON.stringify(data);
    }

    const res = await fetch(url, opts);
    const contentType = res.headers.get('content-type') || '';
    let body;
    if (contentType.includes('json')) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    if (!res.ok) return fail(typeof body === 'string' ? body : JSON.stringify(body) || `HTTP ${res.status}`);
    return ok({ data: body, status: res.status, system: erpSystem });
  } catch (e) { return fail(e.message); }
}

// ── Tool Descriptions ──────────────────────────────────────────────────────

const TOOL_DESCRIPTIONS = {
  read_file:      { category: 'File',      description: 'Read file contents (up to 8KB)' },
  read_file_lines:{ category: 'File',      description: 'Read specific line range from a file' },
  write_file:     { category: 'File',      description: 'Write/overwrite a file' },
  create_file:    { category: 'File',      description: 'Create a new file' },
  append_file:    { category: 'File',      description: 'Append content to a file' },
  edit_file:      { category: 'File',      description: 'Find & replace text in a file' },
  delete_file:    { category: 'File',      description: 'Delete a file' },
  create_folder:  { category: 'Folder',    description: 'Create a directory' },
  delete_folder:  { category: 'Folder',    description: 'Delete a directory recursively' },
  read_folder:    { category: 'Folder',    description: 'List folder contents with depth' },
  list_directory: { category: 'Folder',    description: 'List immediate directory entries' },
  move_file:      { category: 'Move/Copy', description: 'Move or rename a file' },
  move_folder:    { category: 'Move/Copy', description: 'Move or rename a folder' },
  copy_file:      { category: 'Move/Copy', description: 'Copy a file' },
  search_code:    { category: 'Search',    description: 'Regex search across files' },
  zip_folder:     { category: 'Archive',   description: 'Compress folder to ZIP' },
  unzip_file:     { category: 'Archive',   description: 'Extract a ZIP file' },
  git_status:     { category: 'Git',       description: 'Run git status' },
  git_diff:       { category: 'Git',       description: 'Run git diff' },
  git_commit:     { category: 'Git',       description: 'Stage all and commit' },
  git_log:        { category: 'Git',       description: 'Show git log (oneline, configurable limit)' },
  git_add:        { category: 'Git',       description: 'Stage files for commit' },
  git_branch:     { category: 'Git',       description: 'List, create, or delete branches' },
  git_checkout:   { category: 'Git',       description: 'Switch or create branches' },
  git_merge:      { category: 'Git',       description: 'Merge a branch into current' },
  git_push:       { category: 'Git',       description: 'Push commits to remote' },
  git_pull:       { category: 'Git',       description: 'Pull commits from remote' },
  git_clone:      { category: 'Git',       description: 'Clone a repository' },
  run_command:    { category: 'Scripts',   description: 'Execute a shell command (10s timeout)' },
  bash:           { category: 'Scripts',   description: 'Execute a shell command with cwd (30s timeout)' },
  pip_install:    { category: 'Scripts',   description: 'Install a Python package' },
  run_python:     { category: 'Scripts',   description: 'Write and execute a Python script' },
  get_system_info:{ category: 'System',    description: 'OS, CPU, RAM, uptime info' },
  list_processes: { category: 'System',    description: 'List running processes' },
  kill_process:   { category: 'System',    description: 'Kill a process by PID or name' },
  get_env_var:    { category: 'System',    description: 'Read an environment variable' },
  http_get:       { category: 'Network',   description: 'HTTP GET request' },
  http_post:      { category: 'Network',   description: 'HTTP POST request' },
  download_file:  { category: 'Network',   description: 'Download a file from URL' },
  take_screenshot:{ category: 'Desktop',   description: 'Capture screen to PNG' },
  read_clipboard: { category: 'Desktop',   description: 'Read clipboard text' },
  write_clipboard:{ category: 'Desktop',   description: 'Write text to clipboard' },
  search_web:     { category: 'Web',       description: 'DuckDuckGo search' },
  scrape_web:     { category: 'Web',       description: 'Fetch and extract text from a URL' },
  // Database & SQL
  query_sql:         { category: 'Database',    description: 'Execute SQL query via sqlite3 CLI' },
  describe_schema:   { category: 'Database',    description: 'Show database schema via sqlite3' },
  create_table:      { category: 'Database',    description: 'Create table via sqlite3' },
  insert_rows:       { category: 'Database',    description: 'Insert rows via sqlite3' },
  run_migration:     { category: 'Database',    description: 'Run SQL migration file via sqlite3' },
  // Browser Automation
  browser_open:      { category: 'Browser',     description: 'Fetch URL and return title + text content' },
  browser_click:     { category: 'Browser',     description: 'Click element (requires Puppeteer)' },
  browser_type_text: { category: 'Browser',     description: 'Type text into element (requires Puppeteer)' },
  browser_navigate:  { category: 'Browser',     description: 'Navigate to URL and return content' },
  browser_extract:   { category: 'Browser',     description: 'Extract elements from URL by selector' },
  // Document Processing
  parse_pdf:         { category: 'Document',    description: 'Extract text from PDF file' },
  ocr_image:         { category: 'Document',    description: 'OCR image to text via Tesseract' },
  convert_to_markdown:{ category: 'Document',   description: 'Convert HTML/file to markdown text' },
  extract_table:     { category: 'Document',    description: 'Extract tables from CSV/HTML files' },
  summarize_text:    { category: 'Document',    description: 'Truncate text with smart sentence breaking' },
  // Data Transformation
  csv_to_json:       { category: 'Data',        description: 'Parse CSV to JSON array' },
  json_to_csv:       { category: 'Data',        description: 'Convert JSON array to CSV' },
  yaml_parse:        { category: 'Data',        description: 'Parse YAML to JSON or JSON to YAML' },
  xml_parse:         { category: 'Data',        description: 'Parse XML to JSON' },
  validate_json:     { category: 'Data',        description: 'Validate JSON with optional schema check' },
  // Email & Messaging
  send_email:        { category: 'Messaging',   description: 'Send email via SMTP/curl' },
  send_slack_message:{ category: 'Messaging',   description: 'Post message to Slack webhook' },
  send_webhook:      { category: 'Messaging',   description: 'Send configurable HTTP webhook' },
  send_notification: { category: 'Messaging',   description: 'OS-native desktop notification' },
  // Memory & Knowledge
  vector_store_upsert:{ category: 'Memory',     description: 'Store text with key+tags in JSON store' },
  vector_search:     { category: 'Memory',      description: 'Search stored entries by keyword matching' },
  create_embedding:  { category: 'Memory',      description: 'Create bag-of-words vector from text' },
  memory_save:       { category: 'Memory',      description: 'Save key-value to persistent store' },
  memory_recall:     { category: 'Memory',      description: 'Recall by key, tag, or keyword search' },
  // Docker & Containers
  docker_run:        { category: 'Docker',      description: 'Run a Docker container' },
  docker_build:      { category: 'Docker',      description: 'Build a Docker image' },
  docker_list:       { category: 'Docker',      description: 'List Docker containers' },
  docker_stop:       { category: 'Docker',      description: 'Stop (and optionally remove) a container' },
  // Code Quality & Testing
  run_tests:         { category: 'Quality',     description: 'Auto-detect and run tests' },
  lint_code:         { category: 'Quality',     description: 'Lint code with ESLint or pylint' },
  format_code:       { category: 'Quality',     description: 'Format code with Prettier or Black' },
  check_types:       { category: 'Quality',     description: 'Type-check with tsc or mypy' },
  run_benchmark:     { category: 'Quality',     description: 'Benchmark command with min/max/avg timing' },
  // Security & Secrets
  scan_secrets:      { category: 'Security',    description: 'Scan files for API keys, tokens, passwords' },
  scan_vulnerabilities:{ category: 'Security',  description: 'Run npm audit or pip audit' },
  hash_string:       { category: 'Security',    description: 'Hash string with sha256/sha512/md5' },
  // Image Processing
  resize_image:      { category: 'Image',       description: 'Resize image via PowerShell/ImageMagick' },
  convert_image:     { category: 'Image',       description: 'Convert image format' },
  describe_image:    { category: 'Image',       description: 'Get image metadata (dimensions, size)' },
  generate_image:    { category: 'Image',       description: 'Generate SVG placeholder with prompt text' },
  // Scheduling & Cron
  set_timer:         { category: 'Scheduling',  description: 'Set a timer with label and duration' },
  cron_schedule:     { category: 'Scheduling',  description: 'Schedule a cron job (stored in JSON)' },
  cron_list:         { category: 'Scheduling',  description: 'List all scheduled cron jobs' },
  // API & Integration
  graphql_query:     { category: 'API',         description: 'Execute GraphQL query via HTTP POST' },
  call_api:          { category: 'API',         description: 'Fully configurable HTTP request' },
  parse_url:         { category: 'API',         description: 'Parse URL into components' },
  base64_encode:     { category: 'API',         description: 'Base64 encode/decode string or file' },
  // Math & Computation
  evaluate_expression:{ category: 'Math',       description: 'Safely evaluate math expression' },
  regex_match:       { category: 'Math',        description: 'Find all regex matches with groups' },
  // High-Priority Business Tools
  generate_pdf:      { category: 'Document',    description: 'Convert markdown/HTML to PDF document' },
  google_calendar_api:{ category: 'Business',   description: 'Google Calendar: list, create, delete events' },
  hubspot_api:       { category: 'Business',    description: 'HubSpot CRM: contacts, deals, companies CRUD' },
  salesforce_api:    { category: 'Business',    description: 'Salesforce CRM: query, CRUD, describe objects' },
  stripe_api:        { category: 'Business',    description: 'Stripe: customers, charges, invoices, refunds' },
  chart_generate:    { category: 'Document',    description: 'Generate bar/line/pie charts as PNG via QuickChart' },
  quickbooks_api:    { category: 'Business',    description: 'QuickBooks: invoices, customers, reports' },
  twilio_sms:        { category: 'Messaging',   description: 'Send SMS via Twilio API' },
  sentiment_analysis:{ category: 'Data',        description: 'Classify text sentiment (positive/negative/neutral)' },
  // Medium-Priority Business & SaaS Tools
  transcribe_audio:  { category: 'Audio',       description: 'Transcribe audio to text via Whisper/AssemblyAI' },
  shopify_api:       { category: 'Business',    description: 'Shopify Admin API: products, orders, customers CRUD' },
  jira_api:          { category: 'Business',    description: 'Jira Cloud: search, create, update, transition issues' },
  google_sheets_api: { category: 'Business',    description: 'Google Sheets: read, write, append, create spreadsheets' },
  social_media_post: { category: 'Messaging',   description: 'Post to Twitter, LinkedIn, or Facebook' },
  calendly_api:      { category: 'Business',    description: 'Calendly: list event types and scheduled events' },
  asana_api:         { category: 'Business',    description: 'Asana: tasks, projects CRUD operations' },
  zoom_api:          { category: 'Business',    description: 'Zoom: create, list, manage meetings via OAuth2' },
  clearbit_enrichment:{ category: 'Business',   description: 'Clearbit: enrich person/company data by email/domain' },
  docusign_api:      { category: 'Business',    description: 'DocuSign: manage envelopes and e-signatures' },
  okta_api:          { category: 'Business',    description: 'Okta: manage users, groups, identity operations' },
  text_to_speech:    { category: 'Audio',       description: 'Convert text to speech via OpenAI TTS or ElevenLabs' },
  // Low-Priority Analytics & Marketing Tools
  google_analytics_api:{ category: 'Analytics', description: 'Google Analytics: run reports with metrics/dimensions' },
  search_console_api:{ category: 'Analytics',   description: 'Google Search Console: query search performance data' },
  wordpress_publish: { category: 'CMS',         description: 'WordPress: create, update, list posts via REST API' },
  buffer_api:        { category: 'Marketing',   description: 'Buffer: schedule social media posts' },
  twitter_search_api:{ category: 'Marketing',   description: 'Twitter: search recent tweets via API v2' },
  reddit_api:        { category: 'Marketing',   description: 'Reddit: search posts, browse subreddits via OAuth' },
  trustpilot_api:    { category: 'Marketing',   description: 'Trustpilot: fetch business reviews' },
  mailchimp_api:     { category: 'Marketing',   description: 'Mailchimp: lists, campaigns, members management' },
  sendgrid_api:      { category: 'Messaging',   description: 'SendGrid: send transactional emails' },
  linkedin_company_api:{ category: 'Business',  description: 'LinkedIn: get organization data' },
  crunchbase_api:    { category: 'Business',    description: 'Crunchbase: search organizations and people' },
  glassdoor_api:     { category: 'Business',    description: 'Glassdoor: search employer info via web fallback' },
  zoominfo_api:      { category: 'Business',    description: 'ZoomInfo: search contacts and companies' },
  pipedrive_api:     { category: 'Business',    description: 'Pipedrive CRM: deals, persons, organizations CRUD' },
  mixpanel_api:      { category: 'Analytics',   description: 'Mixpanel: export events and analytics data' },
  amplitude_api:     { category: 'Analytics',   description: 'Amplitude: query event analytics' },
  intercom_api:      { category: 'Messaging',   description: 'Intercom: contacts, conversations, search' },
  greenhouse_api:    { category: 'HR',          description: 'Greenhouse: recruiting candidates and jobs' },
  lever_api:         { category: 'HR',          description: 'Lever ATS: opportunities and candidates' },
  notion_api:        { category: 'Business',    description: 'Notion: search, pages, databases CRUD' },
  servicenow_api:    { category: 'Business',    description: 'ServiceNow: incidents, requests table CRUD' },
  semrush_api:       { category: 'Analytics',   description: 'SEMrush: domain and keyword analytics' },
  expensify_api:     { category: 'Business',    description: 'Expensify: expense reports and management' },
  erp_api:           { category: 'Business',    description: 'Generic ERP connector (SAP, NetSuite, REST)' },
  // Meta
  list:              { category: 'Meta',        description: 'List all available tools' },
};

export function list() {
  const header = 'Tool                 | Category   | Description';
  const sep =    '---------------------+------------+--------------------------------------------';
  const rows = Object.entries(TOOL_DESCRIPTIONS).map(([name, info]) => {
    return `${name.padEnd(21)}| ${info.category.padEnd(11)}| ${info.description}`;
  });
  return ok({ table: [header, sep, ...rows].join('\n'), count: rows.length });
}

// ── Tool Map ────────────────────────────────────────────────────────────────

const ASYNC_TOOLS = new Set([
  'http_get', 'http_post', 'download_file', 'search_web', 'scrape_web',
  'send_slack_message', 'send_webhook', 'graphql_query', 'call_api',
  'browser_open', 'browser_extract', 'browser_navigate',
  'generate_pdf', 'google_calendar_api', 'hubspot_api', 'salesforce_api',
  'stripe_api', 'chart_generate', 'quickbooks_api', 'twilio_sms',
  // Medium-priority async tools
  'transcribe_audio', 'shopify_api', 'jira_api', 'google_sheets_api',
  'social_media_post', 'calendly_api', 'asana_api', 'zoom_api',
  'clearbit_enrichment', 'docusign_api', 'okta_api', 'text_to_speech',
  // Low-priority async tools
  'google_analytics_api', 'search_console_api', 'wordpress_publish',
  'buffer_api', 'twitter_search_api', 'reddit_api', 'trustpilot_api',
  'mailchimp_api', 'sendgrid_api', 'linkedin_company_api', 'crunchbase_api',
  'glassdoor_api', 'zoominfo_api', 'pipedrive_api', 'mixpanel_api',
  'amplitude_api', 'intercom_api', 'greenhouse_api', 'lever_api',
  'notion_api', 'servicenow_api', 'semrush_api', 'expensify_api', 'erp_api',
]);

export const TOOL_MAP = {
  run_command, bash, read_file, read_file_lines, write_file, create_file,
  append_file, edit_file, delete_file, create_folder, delete_folder,
  read_folder, list_directory, move_file, move_folder, copy_file,
  search_code, zip_folder, unzip_file,
  git_status, git_diff, git_commit,
  git_log, git_add, git_branch, git_checkout, git_merge, git_push, git_pull, git_clone,
  pip_install, run_python,
  get_system_info, list_processes, kill_process, get_env_var,
  http_get, http_post, download_file,
  take_screenshot, read_clipboard, write_clipboard,
  search_web, scrape_web,
  // Database & SQL
  query_sql, describe_schema, create_table, insert_rows, run_migration,
  // Browser Automation
  browser_open, browser_click, browser_type_text, browser_navigate, browser_extract,
  // Document Processing
  parse_pdf, ocr_image, convert_to_markdown, extract_table, summarize_text,
  // Data Transformation
  csv_to_json, json_to_csv, yaml_parse, xml_parse, validate_json,
  // Email & Messaging
  send_email, send_slack_message, send_webhook, send_notification,
  // Memory & Knowledge
  vector_store_upsert, vector_search, create_embedding, memory_save, memory_recall,
  // Docker & Containers
  docker_run, docker_build, docker_list, docker_stop,
  // Code Quality & Testing
  run_tests, lint_code, format_code, check_types, run_benchmark,
  // Security & Secrets
  scan_secrets, scan_vulnerabilities, hash_string,
  // Image Processing
  resize_image, convert_image, describe_image, generate_image,
  // Scheduling & Cron
  set_timer, cron_schedule, cron_list,
  // API & Integration
  graphql_query, call_api, parse_url, base64_encode,
  // Math & Computation
  evaluate_expression, regex_match,
  // High-Priority Business Tools
  generate_pdf, google_calendar_api, hubspot_api, salesforce_api,
  stripe_api, chart_generate, quickbooks_api, twilio_sms, sentiment_analysis,
  // Medium-Priority Tools
  transcribe_audio, shopify_api, jira_api, google_sheets_api,
  social_media_post, calendly_api, asana_api, zoom_api,
  clearbit_enrichment, docusign_api, okta_api, text_to_speech,
  // Low-Priority Tools
  google_analytics_api, search_console_api, wordpress_publish,
  buffer_api, twitter_search_api, reddit_api, trustpilot_api,
  mailchimp_api, sendgrid_api, linkedin_company_api, crunchbase_api,
  glassdoor_api, zoominfo_api, pipedrive_api, mixpanel_api,
  amplitude_api, intercom_api, greenhouse_api, lever_api,
  notion_api, servicenow_api, semrush_api, expensify_api, erp_api,
  // Meta
  list,
};

export function isAsync(toolName) {
  return ASYNC_TOOLS.has(toolName);
}
