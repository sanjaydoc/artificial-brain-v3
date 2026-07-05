/**
 * Artificial Brain v3 — Neo4j Memory Wrapper
 * Dual-mode: Bolt driver (local dev) + HTTP API (cPanel via tunnel)
 *
 * Local dev:  NEO4J_URI=bolt://localhost:7687  → uses neo4j-driver (Bolt)
 * Production: NEO4J_URI not set or fails       → falls back to HTTP API via NEO4J_TUNNEL_URL
 */
import neo4j from 'neo4j-driver';
import axios from 'axios';

let driver = null;
let connected = false;
let mode = 'none'; // 'bolt' | 'http' | 'none'

// HTTP tunnel config
let httpUrl = '';
let httpAuth = '';

export async function connect(uri, user, password) {
  const tunnelUrl = process.env.NEO4J_TUNNEL_URL || '';
  const tunnelToken = process.env.TUNNEL_AUTH_TOKEN || '';

  // Try Bolt first
  if (uri && uri.startsWith('bolt')) {
    try {
      driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
      const info = await driver.getServerInfo();
      connected = true;
      mode = 'bolt';
      console.log(`[memory] Neo4j connected via Bolt: ${info.address}`);
      await ensureIndexes();
      return;
    } catch (e) {
      console.warn(`[memory] Bolt connection failed: ${e.message} — trying HTTP tunnel...`);
      driver = null;
    }
  }

  // Fallback to HTTP API via tunnel
  if (tunnelUrl) {
    try {
      const headers = tunnelToken ? { 'X-Auth-Token': tunnelToken } : {};
      const r = await axios.get(tunnelUrl, { headers, timeout: 10000 });
      if (r.data?.neo4j_version) {
        httpUrl = tunnelUrl;
        httpAuth = tunnelToken;
        connected = true;
        mode = 'http';
        console.log(`[memory] Neo4j connected via HTTP tunnel: ${tunnelUrl} (v${r.data.neo4j_version})`);
        // Create indexes via HTTP
        await httpQuery('CREATE INDEX IF NOT EXISTS FOR (m:Memory) ON (m.node)');
        await httpQuery('CREATE INDEX IF NOT EXISTS FOR (m:Memory) ON (m.ts)');
        await httpQuery('CREATE INDEX IF NOT EXISTS FOR (m:Memory) ON (m.term)');
        await httpQuery('CREATE INDEX IF NOT EXISTS FOR (c:Concept) ON (c.name)');
        return;
      }
    } catch (e) {
      console.warn(`[memory] HTTP tunnel failed: ${e.message}`);
    }
  }

  console.error('[memory] Neo4j unavailable — no Bolt or HTTP connection. Memory disabled.');
  connected = false;
  mode = 'none';
}

export function isConnected() { return connected; }
export function getMode() { return mode; }

// ── HTTP API helpers (Neo4j Query API v2) ───────────────────────────────────

async function httpQuery(cypher, params = {}) {
  if (!httpUrl) return null;
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (httpAuth) headers['X-Auth-Token'] = httpAuth;

    // Neo4j HTTP Query API v2: POST /db/neo4j/query/v2
    const r = await axios.post(`${httpUrl}/db/neo4j/query/v2`, {
      statement: cypher,
      parameters: cleanParams(params),
    }, {
      headers,
      timeout: 30000,
      auth: { username: process.env.NEO4J_USER || 'neo4j', password: process.env.NEO4J_PASSWORD || 'brain_pass' },
    });

    return r.data;
  } catch (e) {
    // Fallback to legacy tx endpoint
    try {
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (httpAuth) headers['X-Auth-Token'] = httpAuth;

      const r = await axios.post(`${httpUrl}/db/neo4j/tx/commit`, {
        statements: [{ statement: cypher, parameters: cleanParams(params) }],
      }, {
        headers,
        timeout: 30000,
        auth: { username: process.env.NEO4J_USER || 'neo4j', password: process.env.NEO4J_PASSWORD || 'brain_pass' },
      });

      return r.data;
    } catch (e2) {
      console.error(`[memory] HTTP query failed: ${e2.message}`);
      return null;
    }
  }
}

function cleanParams(params) {
  // Convert neo4j.int to regular numbers for HTTP API
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v && typeof v === 'object' && v.low !== undefined) clean[k] = v.low;
    else clean[k] = v;
  }
  return clean;
}

function extractRows(httpResult) {
  if (!httpResult) return [];
  // Query API v2 format
  if (httpResult.data?.values) return httpResult.data.values;
  // Legacy tx format
  if (httpResult.results?.[0]?.data) {
    return httpResult.results[0].data.map(d => d.row);
  }
  return [];
}

// ── Bolt helpers ────────────────────────────────────────────────────────────

async function ensureIndexes() {
  if (!driver) return;
  const session = driver.session();
  try {
    await session.run('CREATE INDEX IF NOT EXISTS FOR (m:Memory) ON (m.node)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (m:Memory) ON (m.ts)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (m:Memory) ON (m.term)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (c:Concept) ON (c.name)');
  } catch (e) {
    console.error(`[memory] Index creation failed: ${e.message}`);
  } finally {
    await session.close();
  }
}

// ── Episodic Memory ─────────────────────────────────────────────────────────

export async function writeMemory(node, type, content, importance = 0.5) {
  if (!connected) return null;
  const contentStr = (typeof content === 'string' ? content : JSON.stringify(content)).slice(0, 2000);
  const ts = Date.now() / 1000;

  if (mode === 'bolt') {
    const session = driver.session();
    try {
      const result = await session.run(
        `CREATE (m:Memory {node: $node, type: $type, content: $content, importance: $importance, term: 'short', ts: $ts}) RETURN id(m) AS id`,
        { node, type, content: contentStr, importance, ts }
      );
      return result.records[0]?.get('id')?.toNumber?.() ?? null;
    } catch (e) { console.error(`[memory] writeMemory failed: ${e.message}`); return null; }
    finally { await session.close(); }
  } else {
    const r = await httpQuery(
      `CREATE (m:Memory {node: $node, type: $type, content: $content, importance: $importance, term: 'short', ts: $ts}) RETURN id(m) AS id`,
      { node, type, content: contentStr, importance, ts }
    );
    return r ? true : null;
  }
}

export async function readMemory(node, limit = 10, term = null) {
  if (!connected) return [];
  const where = term ? 'WHERE m.node = $node AND m.term = $term' : 'WHERE m.node = $node';
  const cypher = `MATCH (m:Memory) ${where} RETURN m.node AS node, m.type AS type, m.content AS content, m.importance AS importance, m.term AS term, m.ts AS ts ORDER BY m.ts DESC LIMIT $limit`;
  const params = { node, term, limit: mode === 'bolt' ? neo4j.int(limit) : limit };

  if (mode === 'bolt') {
    const session = driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map(r => ({
        node: r.get('node'), type: r.get('type'), content: r.get('content'),
        importance: r.get('importance'), term: r.get('term'), ts: r.get('ts'),
      }));
    } catch (e) { return []; }
    finally { await session.close(); }
  } else {
    const r = await httpQuery(cypher, params);
    const rows = extractRows(r);
    return rows.map(row => Array.isArray(row)
      ? { node: row[0], type: row[1], content: row[2], importance: row[3], term: row[4], ts: row[5] }
      : row
    );
  }
}

export async function readAllMemories(limit = 50) {
  if (!connected) return [];
  const cypher = `MATCH (m:Memory) RETURN m.node AS node, m.type AS type, m.content AS content, m.importance AS importance, m.term AS term, m.ts AS ts ORDER BY m.ts DESC LIMIT $limit`;
  const params = { limit: mode === 'bolt' ? neo4j.int(limit) : limit };

  if (mode === 'bolt') {
    const session = driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map(r => ({
        node: r.get('node'), type: r.get('type'), content: r.get('content'),
        importance: r.get('importance'), term: r.get('term'), ts: r.get('ts'),
      }));
    } catch (e) { return []; }
    finally { await session.close(); }
  } else {
    const r = await httpQuery(cypher, params);
    const rows = extractRows(r);
    return rows.map(row => Array.isArray(row)
      ? { node: row[0], type: row[1], content: row[2], importance: row[3], term: row[4], ts: row[5] }
      : row
    );
  }
}

export async function consolidate(threshold = 0.6, ageSeconds = 300) {
  if (!connected) return { promoted: 0, pruned: 0 };
  const cutoff = Date.now() / 1000 - ageSeconds;

  if (mode === 'bolt') {
    const session = driver.session();
    try {
      const promo = await session.run(
        `MATCH (m:Memory) WHERE m.term = 'short' AND m.ts < $cutoff AND m.importance >= $threshold SET m.term = 'long' RETURN count(m) AS cnt`,
        { cutoff, threshold }
      );
      const promoted = promo.records[0]?.get('cnt')?.toNumber?.() ?? 0;
      const prune = await session.run(
        `MATCH (m:Memory) WHERE m.term = 'short' AND m.ts < $cutoff AND m.importance < $threshold DELETE m RETURN count(m) AS cnt`,
        { cutoff, threshold }
      );
      const pruned = prune.records[0]?.get('cnt')?.toNumber?.() ?? 0;
      return { promoted, pruned };
    } catch (e) { return { promoted: 0, pruned: 0 }; }
    finally { await session.close(); }
  } else {
    await httpQuery(
      `MATCH (m:Memory) WHERE m.term = 'short' AND m.ts < $cutoff AND m.importance >= $threshold SET m.term = 'long'`,
      { cutoff, threshold }
    );
    await httpQuery(
      `MATCH (m:Memory) WHERE m.term = 'short' AND m.ts < $cutoff AND m.importance < $threshold DELETE m`,
      { cutoff, threshold }
    );
    return { promoted: 0, pruned: 0 }; // HTTP API doesn't return counts easily
  }
}

export async function getStats() {
  if (!connected) return {};
  const cypher = `MATCH (m:Memory) RETURN m.node AS node, m.term AS term, count(m) AS cnt`;

  if (mode === 'bolt') {
    const session = driver.session();
    try {
      const result = await session.run(cypher);
      const stats = {};
      for (const r of result.records) {
        const node = r.get('node'), term = r.get('term'), cnt = r.get('cnt').toNumber();
        if (!stats[node]) stats[node] = { short: 0, long: 0 };
        stats[node][term] = cnt;
      }
      return stats;
    } catch (e) { return {}; }
    finally { await session.close(); }
  } else {
    const r = await httpQuery(cypher);
    const rows = extractRows(r);
    const stats = {};
    for (const row of rows) {
      const [node, term, cnt] = Array.isArray(row) ? row : [row.node, row.term, row.cnt];
      if (!stats[node]) stats[node] = { short: 0, long: 0 };
      stats[node][term] = cnt;
    }
    return stats;
  }
}

export async function resetMemories() {
  if (!connected) return 0;
  const cypher = 'MATCH (m:Memory) DELETE m RETURN count(m) AS cnt';
  if (mode === 'bolt') {
    const session = driver.session();
    try {
      const result = await session.run(cypher);
      return result.records[0]?.get('cnt')?.toNumber?.() ?? 0;
    } catch (e) { return 0; }
    finally { await session.close(); }
  } else {
    await httpQuery(cypher);
    return 0;
  }
}

// ── Knowledge Graph ─────────────────────────────────────────────────────────

export async function learnFact(concept, relation, target) {
  if (!connected) return false;
  const cypher = `MERGE (a:Concept {name: $concept}) MERGE (b:Concept {name: $target}) MERGE (a)-[r:RELATES {type: $relation}]->(b) SET r.ts = $ts`;
  const params = { concept, relation, target, ts: Date.now() / 1000 };

  if (mode === 'bolt') {
    const session = driver.session();
    try { await session.run(cypher, params); return true; }
    catch (e) { console.error(`[memory] learnFact failed: ${e.message}`); return false; }
    finally { await session.close(); }
  } else {
    const r = await httpQuery(cypher, params);
    return !!r;
  }
}

export async function recallConcept(concept, limit = 5) {
  if (!connected) return [];
  const cypher = `MATCH (a:Concept {name: $concept})-[r:RELATES]->(b:Concept) RETURN b.name AS target, r.type AS relation LIMIT $limit`;
  const params = { concept, limit: mode === 'bolt' ? neo4j.int(limit) : limit };

  if (mode === 'bolt') {
    const session = driver.session();
    try {
      const result = await session.run(cypher, params);
      return result.records.map(r => ({ target: r.get('target'), relation: r.get('relation') }));
    } catch (e) { return []; }
    finally { await session.close(); }
  } else {
    const r = await httpQuery(cypher, params);
    const rows = extractRows(r);
    return rows.map(row => Array.isArray(row) ? { target: row[0], relation: row[1] } : row);
  }
}

export async function resetAll() {
  if (!connected) return 0;
  const cypher = 'MATCH (n) DETACH DELETE n RETURN count(n) AS cnt';
  if (mode === 'bolt') {
    const session = driver.session();
    try {
      const result = await session.run(cypher);
      return result.records[0]?.get('cnt')?.toNumber?.() ?? 0;
    } catch (e) { return 0; }
    finally { await session.close(); }
  } else {
    await httpQuery(cypher);
    return 0;
  }
}

export async function close() {
  if (driver) { await driver.close(); }
  connected = false;
  mode = 'none';
}

export default {
  connect, isConnected, getMode, close,
  writeMemory, readMemory, readAllMemories, consolidate, getStats, resetMemories,
  learnFact, recallConcept, resetAll,
};
