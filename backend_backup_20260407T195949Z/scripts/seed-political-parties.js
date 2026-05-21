/**
 * Political parties with state scoping:
 * - is_national: shown in every state
 * - political_party_states: regional parties only in listed states (states.state_code from locations seed)
 *
 * Run after: npm run seed:locations
 * Usage: node scripts/seed-political-parties.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * @typedef {{ name: string, short: string|null, color: string|null, national?: true, states?: string[] }} PartyRow
 * state codes: 01–35 as in s4hubhamp/states-districts-tehsils states.json
 */
/** @type {PartyRow[]} */
const PARTIES = [
  { name: 'Aam Aadmi Party', short: 'AAP', color: '#0072BC', national: true },
  { name: 'All India Forward Bloc', short: 'AIFB', color: '#C41E3A', national: true },
  { name: 'All India Majlis-e-Ittehadul Muslimeen', short: 'AIMIM', color: '#0B6623', national: true },
  { name: 'Bahujan Samaj Party', short: 'BSP', color: '#22409A', national: true },
  { name: 'Bharatiya Janata Party', short: 'BJP', color: '#FF9933', national: true },
  { name: 'Communist Party of India', short: 'CPI', color: '#E3242B', national: true },
  { name: 'Communist Party of India (Marxist)', short: 'CPI(M)', color: '#CC0000', national: true },
  { name: 'Indian National Congress', short: 'INC', color: '#19AAED', national: true },
  { name: 'Janata Dal (United)', short: 'JD(U)', color: '#003366', national: true },
  { name: 'Lok Janshakti Party (Ram Vilas)', short: 'LJP(RV)', color: '#9932CC', national: true },
  { name: 'Nationalist Congress Party', short: 'NCP', color: '#00A859', national: true },
  { name: 'Rashtriya Janata Dal', short: 'RJD', color: '#228B22', national: true },
  { name: 'Rashtriya Lok Dal', short: 'RLD', color: '#006400', national: true },
  { name: 'Revolutionary Socialist Party', short: 'RSP', color: '#DC143C', national: true },
  { name: 'Samajwadi Party', short: 'SP', color: '#E34234', national: true },
  { name: 'Independent', short: 'IND', color: '#888888', national: true },
  { name: 'Other', short: null, color: '#9CA3AF', national: true },

  { name: 'All India Anna Dravida Munnetra Kazhagam', short: 'AIADMK', color: '#228B22', states: ['33'] },
  { name: 'All India Trinamool Congress', short: 'AITC', color: '#20B2AA', states: ['19'] },
  { name: 'Apna Dal (Sonelal)', short: 'AD(S)', color: '#FF6600', states: ['09'] },
  { name: 'Asom Gana Parishad', short: 'AGP', color: '#F4C430', states: ['18'] },
  { name: 'Bharat Rashtra Samithi', short: 'BRS', color: '#E34234', states: ['28'] },
  { name: 'Biju Janata Dal', short: 'BJD', color: '#006400', states: ['21'] },
  { name: 'Bodoland People’s Front', short: 'BPF', color: '#E34234', states: ['18'] },
  { name: 'Dravida Munnetra Kazhagam', short: 'DMK', color: '#C71585', states: ['33'] },
  { name: 'Goa Forward Party', short: 'GFP', color: '#2E8B57', states: ['30'] },
  { name: 'Hill State People’s Democratic Party', short: 'HSPDP', color: '#4B5320', states: ['17'] },
  { name: 'Indian National Lok Dal', short: 'INLD', color: '#3366CC', states: ['06', '09'] },
  { name: 'Indigenous People’s Front of Tripura', short: 'IPFT', color: '#8B4513', states: ['16'] },
  { name: 'Jammu & Kashmir National Conference', short: 'JKNC', color: '#C71585', states: ['01'] },
  { name: 'Jammu & Kashmir Peoples Democratic Party', short: 'JKPDP', color: '#228B22', states: ['01'] },
  { name: 'Janata Dal (Secular)', short: 'JD(S)', color: '#028A0F', states: ['29'] },
  { name: 'Jharkhand Mukti Morcha', short: 'JMM', color: '#228B22', states: ['20'] },
  { name: 'Kerala Congress (M)', short: 'KC(M)', color: '#4169E1', states: ['32'] },
  { name: 'Maharashtra Navnirman Sena', short: 'MNS', color: '#FF4500', states: ['27'] },
  { name: 'Maharashtrawadi Gomantak Party', short: 'MGP', color: '#FFD700', states: ['30'] },
  { name: 'Mizo National Front', short: 'MNF', color: '#8B0000', states: ['15'] },
  { name: 'National People’s Party', short: 'NPP', color: '#FF8C00', states: ['17'] },
  { name: 'Naga People’s Front', short: 'NPF', color: '#800080', states: ['13'] },
  { name: 'Pattali Makkal Katchi', short: 'PMK', color: '#FFD700', states: ['33'] },
  { name: 'People’s Democratic Front', short: 'PDF', color: '#2F4F4F', states: ['17'] },
  { name: 'People’s Party of Arunachal', short: 'PPA', color: '#CD853F', states: ['12'] },
  { name: 'Shiromani Akali Dal', short: 'SAD', color: '#FF8C00', states: ['03'] },
  { name: 'Shiv Sena', short: 'SS', color: '#FF4500', states: ['27'] },
  { name: 'Shiv Sena (Uddhav Balasaheb Thackeray)', short: 'SS(UBT)', color: '#FF6347', states: ['27'] },
  { name: 'Sikkim Democratic Front', short: 'SDF', color: '#FFD700', states: ['11'] },
  { name: 'Sikkim Krantikari Morcha', short: 'SKM', color: '#FF1493', states: ['11'] },
  { name: 'Telugu Desam Party', short: 'TDP', color: '#FFFF00', states: ['28'] },
  { name: 'United People’s Party Liberal', short: 'UPPL', color: '#4682B4', states: ['18'] },
  { name: 'YSR Congress Party', short: 'YSRCP', color: '#1560BD', states: ['28'] },
  { name: 'Zoram People’s Movement', short: 'ZPM', color: '#6B8E23', states: ['15'] },
];

async function ensureSchema(pool) {
  const schemaPath = path.join(__dirname, '..', 'db', 'political_parties_schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
}

function padCode(code) {
  return String(code).padStart(2, '0');
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
    console.log('Ensuring political_parties schema...');
    await ensureSchema(pool);

    const stRes = await client.query('SELECT id, state_code FROM states');
    if (stRes.rows.length === 0) {
      console.error('No states in database. Run: npm run seed:locations');
      process.exitCode = 1;
      return;
    }
    const codeToStateId = new Map(
      stRes.rows.map((r) => [padCode(r.state_code), r.id])
    );

    await client.query('BEGIN');
    await client.query('TRUNCATE TABLE political_parties RESTART IDENTITY CASCADE');

    const nameToId = new Map();
    for (const p of PARTIES) {
      const isNational = Boolean(p.national);
      const r = await client.query(
        `INSERT INTO political_parties (name, short_name, logo_url, color, is_active, is_national)
         VALUES ($1, $2, NULL, $3, true, $4)
         RETURNING id`,
        [p.name, p.short || null, p.color || null, isNational]
      );
      nameToId.set(p.name, r.rows[0].id);
    }

    let links = 0;
    for (const p of PARTIES) {
      if (p.national || !p.states?.length) continue;
      const pid = nameToId.get(p.name);
      for (const code of p.states) {
        const sid = codeToStateId.get(padCode(code));
        if (sid == null) {
          console.warn(`Unknown state_code ${code} for party ${p.name}`);
          continue;
        }
        await client.query(
          `INSERT INTO political_party_states (party_id, state_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [pid, sid]
        );
        links++;
      }
    }

    await client.query('COMMIT');
    const c = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM political_parties WHERE is_active) AS parties,
         (SELECT COUNT(*)::int FROM political_party_states) AS links`
    );
    console.log(
      `Done. Parties: ${c.rows[0].parties}, state links (regional): ${c.rows[0].links} (insert attempts: ${links}).`
    );
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
