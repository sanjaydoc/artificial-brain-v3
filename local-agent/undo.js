/**
 * Artificial Brain v3 — Undo System
 * Reversible action stack (last 20 entries).
 */
import fs from 'fs';
import path from 'path';
import os from 'os';

const UNDO_DIR = path.join(os.tmpdir(), 'brain_undo_backups');
fs.mkdirSync(UNDO_DIR, { recursive: true });

const stack = [];
const MAX = 20;

export function push(desc, reverseFn) {
  stack.push({ desc, fn: reverseFn, ts: Date.now() });
  if (stack.length > MAX) stack.shift();
}

export function backupFile(filePath) {
  const name = path.basename(filePath);
  const bk = path.join(UNDO_DIR, `${name}_${Date.now()}`);
  fs.copyFileSync(filePath, bk);
  return bk;
}

export function backupFolder(folderPath) {
  const name = path.basename(folderPath);
  const bk = path.join(UNDO_DIR, `${name}_${Date.now()}`);
  fs.cpSync(folderPath, bk, { recursive: true });
  return bk;
}

export function undo() {
  if (!stack.length) return { ok: false, error: 'Nothing to undo — history is empty' };
  const entry = stack.pop();
  try {
    entry.fn();
    return { ok: true, message: `Undid: ${entry.desc}`, remaining: stack.length };
  } catch (e) {
    return { ok: false, error: `Undo failed for '${entry.desc}': ${e.message}` };
  }
}

export function history() {
  return {
    ok: true,
    history: [...stack].reverse().map((e, i) => ({ step: i + 1, action: e.desc })),
    count: stack.length,
    note: 'Call undo to reverse the most recent action',
  };
}
