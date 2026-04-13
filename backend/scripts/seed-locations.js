/**
 * Creates location tables (if needed) and seeds states, districts, and tehsils
 * from the public dataset: https://github.com/s4hubhamp/states-districts-tehsils
 *
 * Usage (from backend/): node scripts/seed-locations.js
 * Requires: network once to download JSON, PostgreSQL credentials in .env
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE =
  'https://raw.githubusercontent.com/s4hubhamp/states-districts-tehsils/main/JSON';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function toDisplayName(upper) {
  if (!upper || typeof upper !== 'string') return upper;
  return upper
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s+$/.test(token)) return token;
      if (token === '&') return '&';
      const t = token.replace(/[()]/g, (m) => m);
      const inner = t.replace(/[()]/g, '');
      if (!inner) return t;
      const cased =
        inner.charAt(0).toUpperCase() + inner.slice(1).toLowerCase();
      if (t.startsWith('(')) return '(' + cased + ')';
      return cased;
    })
    .join('');
}

async function ensureSchema(pool) {
  const schemaPath = path.join(__dirname, '..', 'db', 'locations_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

async function run() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'chitrakal',
    user: process.env.DB_USER || 'postgres',
    password: String(process.env.DB_PASSWORD || 'postgres'),
  });

  const client = await pool.connect();
  try {
    console.log('Ensuring schema...');
    await ensureSchema(pool);

    console.log('Downloading location JSON (states, districts, tehsils)...');
    const [statesRaw, districtsRaw, tehsilsRaw] = await Promise.all([
      fetchJson(`${BASE}/states.json`),
      fetchJson(`${BASE}/districts.json`),
      fetchJson(`${BASE}/tehsils.json`),
    ]);

    const states = statesRaw.map((s) => ({
      code: String(s.stateCode).padStart(2, '0'),
      name: toDisplayName(s.name),
    }));

    const districts = districtsRaw.map((d) => ({
      stateCode: String(d.stateCode).padStart(2, '0'),
      districtCode: String(d.districtCode).padStart(2, '0'),
      name: d.name,
    }));

    const tehsils = tehsilsRaw.map((t) => ({
      stateCode: String(t.stateCode).padStart(2, '0'),
      districtCode: String(t.districtCode).padStart(2, '0'),
      name: t.name,
    }));

    console.log(
      `Loaded ${states.length} states, ${districts.length} districts, ${tehsils.length} tehsils`
    );

    await client.query('BEGIN');
    await client.query(
      'TRUNCATE TABLE tehsils, districts, states RESTART IDENTITY CASCADE'
    );

    const stateCodeToId = new Map();
    for (const s of states) {
      const r = await client.query(
        'INSERT INTO states (name, state_code) VALUES ($1, $2) RETURNING id',
        [s.name, s.code]
      );
      stateCodeToId.set(s.code, r.rows[0].id);
    }

    const districtKeyToId = new Map();
    for (const d of districts) {
      const sid = stateCodeToId.get(d.stateCode);
      if (sid == null) continue;
      const r = await client.query(
        `INSERT INTO districts (state_id, name, district_code)
         VALUES ($1, $2, $3) RETURNING id`,
        [sid, d.name, d.districtCode]
      );
      districtKeyToId.set(`${d.stateCode}|${d.districtCode}`, r.rows[0].id);
    }

    const tehsilRows = [];
    let skippedNoDistrict = 0;
    for (const t of tehsils) {
      const did = districtKeyToId.get(`${t.stateCode}|${t.districtCode}`);
      if (did == null) {
        skippedNoDistrict++;
        continue;
      }
      tehsilRows.push([did, t.name]);
    }

    const BATCH = 400;
    for (let i = 0; i < tehsilRows.length; i += BATCH) {
      const chunk = tehsilRows.slice(i, i + BATCH);
      const placeholders = [];
      const flat = [];
      let p = 1;
      for (const [did, name] of chunk) {
        placeholders.push(`($${p++}, $${p++})`);
        flat.push(did, name);
      }
      await client.query(
        `INSERT INTO tehsils (district_id, name) VALUES ${placeholders.join(', ')}
         ON CONFLICT (district_id, name) DO NOTHING`,
        flat
      );
    }

    await client.query('COMMIT');
    const countRes = await pool.query('SELECT COUNT(*)::int AS c FROM tehsils');
    console.log(
      `Done. Tehsils in DB: ${countRes.rows[0].c} (source rows: ${tehsilRows.length}, skipped no district: ${skippedNoDistrict}).`
    );
    console.log('Verify: GET /api/locations/states on your API server.');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed failed:', e.message || e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
