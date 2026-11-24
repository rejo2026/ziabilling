const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const SINGLETON_KEYS = [
  'companySettings', 'countryConfigs', 'entitlement', 'facebookSyncSettings', 
  'systemModules', 'themeSettings', 'loginSettings', 'regionalSettings', 'vatSettings', 'smtpSettings', 'whatsappSettings'
];

// A handful of collections key their records by a field other than `id`.
const KEY_FIELD_OVERRIDES = {
  chartOfAccounts: 'accountCode'
};

const COLLECTION_KEYS = [
  'addOns', 'apSchedules', 'asc606Schedules', 'auditLogs', 'branches', 'brands', 'categories',
  'chartOfAccounts', 'coupons', 'customerLedgers', 'customers', 'debtReminders', 'eWayBills',
  'expenseCategories', 'expenses', 'goodsReceivedNotes', 'heldBills', 'invoices',
  'journalEntries', 'marketingCampaigns', 'plans', 'posRegisters', 'posShifts', 'products',
  'purchaseOrders', 'purchases', 'quotations', 'rmaRecords', 'roles', 'serialUnits',
  'serviceJobSheets', 'spareCompatibility', 'stockTransfers', 'storageLocations',
  'subscriptions', 'suppliers', 'units', 'users', 'websiteLeads', 'websiteVisitors', 'whatsappTemplates',
  // UAE Automotive Spare Parts ERP Collections
  'vehicleMakes', 'vehicleModels', 'vehicleCompatibility', 'stockAdjustments', 'stockLedger',
  'salesReturns', 'purchaseReturns', 'warrantyClaims', 'warehouses', 'dynamicFields',
  'messageLogs', 'deliveryNotes', 'priceLists', 'cashRegisters', 'cashShifts'
];

// sql.js (pure WebAssembly SQLite) instead of better-sqlite3: the native
// addon crashes inside Electron's bundled Node runtime on this machine (a
// real ABI incompatibility, not just a missing-rebuild issue — confirmed by
// reproducing a segfault calling into the compiled .node binary under
// Electron's own runtime). sql.js has no native code at all, so there is
// nothing to rebuild or mismatch, at the cost of the whole DB living in one
// in-memory buffer that gets explicitly exported and written to disk.
let SQL = null;

function run(db, sql, params = []) {
  db.run(sql, params);
}

function get(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// Writes the whole in-memory database to disk atomically (temp file +
// rename) so a crash mid-write can never leave a corrupted/partial file.
function writeToDisk(db, dbFile) {
  const buffer = Buffer.from(db.export());
  const tmpFile = `${dbFile}.tmp`;
  fs.writeFileSync(tmpFile, buffer);
  fs.renameSync(tmpFile, dbFile);
}

async function openDb(dbFile) {
  if (!SQL) SQL = await initSqlJs();

  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = fs.existsSync(dbFile)
    ? new SQL.Database(fs.readFileSync(dbFile))
    : new SQL.Database();

  run(db, 'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)');
  run(db, 'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, data TEXT NOT NULL)');
  run(db, 'CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)');
  for (const name of COLLECTION_KEYS) {
    run(db, `CREATE TABLE IF NOT EXISTS "${name}" (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }

  const applied = get(db, 'SELECT name FROM schema_migrations WHERE name = ?', ['001_init']);
  if (!applied) {
    run(db, 'INSERT INTO schema_migrations (name, appliedAt) VALUES (?, ?)', ['001_init', new Date().toISOString()]);
  }

  writeToDisk(db, dbFile);
  return { sqljsDb: db, dbFile };
}

// Reads every table into the same shape the app has always used in-memory.
function loadState(db, defaultState) {
  const state = {};
  const { sqljsDb } = db;

  for (const key of SINGLETON_KEYS) {
    const row = get(sqljsDb, 'SELECT data FROM settings WHERE key = ?', [key]);
    state[key] = row ? JSON.parse(row.data) : defaultState[key];
  }

  for (const key of COLLECTION_KEYS) {
    const rows = all(sqljsDb, `SELECT data FROM "${key}" ORDER BY rowid`);
    state[key] = rows.length > 0 ? rows.map(r => JSON.parse(r.data)) : (defaultState[key] || []);
  }

  return state;
}

function isDbEmpty(db) {
  const { sqljsDb } = db;
  const row = get(sqljsDb, 'SELECT COUNT(*) AS n FROM settings');
  if (row.n > 0) return false;
  for (const key of COLLECTION_KEYS) {
    const c = get(sqljsDb, `SELECT COUNT(*) AS n FROM "${key}"`);
    if (c.n > 0) return false;
  }
  return true;
}

// Writes the full in-memory state back into the sql.js database (inside a
// transaction) and then exports the whole thing to disk atomically, so a
// crash mid-write can never leave a half-updated database.
function makePersist(db) {
  const { sqljsDb, dbFile } = db;

  return function persist(state) {
    run(sqljsDb, 'BEGIN');
    try {
      for (const key of SINGLETON_KEYS) {
        if (state[key] === undefined) continue;
        run(sqljsDb, 'INSERT INTO settings (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data', [key, JSON.stringify(state[key])]);
      }
      for (const key of COLLECTION_KEYS) {
        const list = state[key] || [];
        run(sqljsDb, `DELETE FROM "${key}"`);
        const keyField = KEY_FIELD_OVERRIDES[key] || 'id';
        // Most collections are arrays of objects with a stable `id`. A few
        // are arrays of plain strings (categories/brands/units) or objects
        // with no natural unique field (auditLogs) — for those, fall back
        // to the record itself (if primitive) or its array position, which
        // is safe here since the whole table is deleted and reinserted in
        // order on every persist.
        list.forEach((record, index) => {
          let id;
          if (record && typeof record === 'object' && record[keyField] !== undefined) {
            id = String(record[keyField]);
          } else if (record !== null && typeof record !== 'object') {
            id = String(record);
          } else {
            id = String(index);
          }
          run(sqljsDb, `INSERT INTO "${key}" (id, data) VALUES (?, ?)`, [id, JSON.stringify(record)]);
        });
      }
      run(sqljsDb, 'COMMIT');
    } catch (e) {
      run(sqljsDb, 'ROLLBACK');
      throw e;
    }
    writeToDisk(sqljsDb, dbFile);
  };
}

// Atomically allocates the next number in a named sequence, e.g.
// nextId(db, 'invoices') -> 7. Callers format the prefix/padding themselves.
// Durability relies on the route handler calling persist() afterward in the
// same request (which every caller in server/api.cjs does) — the counter
// row is written to disk as part of that same persist() export.
function makeNextId(db) {
  const { sqljsDb } = db;

  return function nextId(name) {
    run(sqljsDb, 'INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1', [name]);
    return get(sqljsDb, 'SELECT value FROM counters WHERE name = ?', [name]).value;
  };
}

// Initializes a sequence's starting point from the size of an existing
// in-memory collection, so numbering continues where the JSON file left off
// instead of restarting at 1 after migration.
function seedCounterFromLength(db, name, length) {
  const { sqljsDb } = db;
  const existing = get(sqljsDb, 'SELECT value FROM counters WHERE name = ?', [name]);
  if (!existing && length > 0) {
    run(sqljsDb, 'INSERT INTO counters (name, value) VALUES (?, ?)', [name, length]);
  }
}

module.exports = { openDb, loadState, isDbEmpty, makePersist, makeNextId, seedCounterFromLength, SINGLETON_KEYS, COLLECTION_KEYS };
