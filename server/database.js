const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Meta table to track multiple dynamic dataset tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS _meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        columns TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

/**
 * Sanitize strings for safe column and table names
 * Specifically preserves Unicode characters (Arabic, Kurdish, etc.)
 */
function sanitizeName(name, prefix = 'col') {
  if (!name || typeof name !== 'string') return `${prefix}_${Date.now()}`;
  // Remove double quotes and control characters, but keep all other Unicode text
  let safeName = name.replace(/["\0\x00-\x1F\x7F]/g, '').trim();
  return safeName || `${prefix}_${Date.now()}`;
}

/**
 * Import a new dataset
 */
function importDataset(displayName, columns, rows) {
  const db = getDb();
  
  // Create unique table name
  const safeDisplayName = sanitizeName(displayName, 'ds');
  const tableName = `dataset_${safeDisplayName}_${Date.now()}`;

  const safeCols = columns.map((c, i) => sanitizeName(c, `col_${i}`));

  // Ensure unique column names if there are duplicates
  const uniqueCols = [];
  const colSet = new Set();
  for (let c of safeCols) {
    let finalC = c;
    let counter = 1;
    while (colSet.has(finalC)) {
      finalC = `${c}_${counter}`;
      counter++;
    }
    colSet.add(finalC);
    uniqueCols.push(finalC);
  }

  // Build CREATE TABLE
  const colDefs = uniqueCols.map(c => `"${c}" TEXT`).join(', ');
  db.exec(`CREATE TABLE "${tableName}" (_id INTEGER PRIMARY KEY AUTOINCREMENT, ${colDefs})`);

  // Prepare INSERT
  if (rows && rows.length > 0) {
    const placeholders = uniqueCols.map(() => '?').join(', ');
    const insertStmt = db.prepare(
      `INSERT INTO "${tableName}" (${uniqueCols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
    );

    const insertMany = db.transaction((dataRows) => {
      for (const row of dataRows) {
        const values = columns.map((origCol) => {
          return row[origCol] !== undefined ? String(row[origCol]) : '';
        });
        insertStmt.run(...values);
      }
    });
    insertMany(rows);
  }

  // Insert meta
  const insertMeta = db.prepare(`
    INSERT INTO _meta (table_name, display_name, columns, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `);
  const result = insertMeta.run(tableName, displayName, JSON.stringify(uniqueCols));

  return { id: result.lastInsertRowid, tableName, columns: uniqueCols, rowCount: rows ? rows.length : 0 };
}

/**
 * Get all datasets meta info
 */
function getAllMeta() {
  const db = getDb();
  const metas = db.prepare('SELECT * FROM _meta ORDER BY updated_at DESC').all();
  return metas.map(m => ({
    id: m.id,
    tableName: m.table_name,
    displayName: m.display_name,
    columns: JSON.parse(m.columns),
    createdAt: m.created_at,
    updatedAt: m.updated_at
  }));
}

/**
 * Get specific dataset meta info
 */
function getMeta(id) {
  const db = getDb();
  const meta = db.prepare('SELECT * FROM _meta WHERE id = ?').get(id);
  if (!meta) return null;
  return {
    id: meta.id,
    tableName: meta.table_name,
    displayName: meta.display_name,
    columns: JSON.parse(meta.columns),
    createdAt: meta.created_at,
    updatedAt: meta.updated_at
  };
}

function getAllRows(datasetId) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  const rows = db.prepare(`SELECT * FROM "${meta.tableName}" ORDER BY _id ASC`).all();
  return { columns: meta.columns, rows };
}

function getRowById(datasetId, rowId) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');
  return db.prepare(`SELECT * FROM "${meta.tableName}" WHERE _id = ?`).get(rowId);
}

function updateRow(datasetId, rowId, updates) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  const setClauses = [];
  const values = [];

  for (const col of meta.columns) {
    if (updates[col] !== undefined) {
      setClauses.push(`"${col}" = ?`);
      values.push(String(updates[col]));
    }
  }

  if (setClauses.length === 0) throw new Error('No valid columns to update');

  values.push(rowId);
  const sql = `UPDATE "${meta.tableName}" SET ${setClauses.join(', ')} WHERE _id = ?`;
  const result = db.prepare(sql).run(...values);
  return result.changes;
}

function deleteRow(datasetId, rowId) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  const result = db.prepare(`DELETE FROM "${meta.tableName}" WHERE _id = ?`).run(rowId);
  return result.changes;
}

/**
 * Add a new column to a dataset
 */
function addColumn(datasetId, columnName) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  const safeColName = sanitizeName(columnName, 'col');
  
  if (meta.columns.includes(safeColName)) {
    throw new Error('Column name already exists');
  }

  db.exec(`ALTER TABLE "${meta.tableName}" ADD COLUMN "${safeColName}" TEXT`);
  
  meta.columns.push(safeColName);
  db.prepare(`UPDATE _meta SET columns = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(meta.columns), datasetId);

  return meta.columns;
}

/**
 * Rename a column in a dataset
 */
function renameColumn(datasetId, oldName, newName) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  if (!meta.columns.includes(oldName)) {
    throw new Error('Old column does not exist');
  }

  const safeNewName = sanitizeName(newName, 'col');
  if (meta.columns.includes(safeNewName)) {
    throw new Error('New column name already exists');
  }

  db.exec(`ALTER TABLE "${meta.tableName}" RENAME COLUMN "${oldName}" TO "${safeNewName}"`);

  const updatedColumns = meta.columns.map(c => c === oldName ? safeNewName : c);
  db.prepare(`UPDATE _meta SET columns = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(updatedColumns), datasetId);

  return updatedColumns;
}

/**
 * Delete a column from a dataset
 */
function deleteColumn(datasetId, columnName) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  if (!meta.columns.includes(columnName)) {
    throw new Error('Column does not exist');
  }

  // Drop column using SQLite >= 3.35.0 syntax
  db.exec(`ALTER TABLE "${meta.tableName}" DROP COLUMN "${columnName}"`);

  const updatedColumns = meta.columns.filter(c => c !== columnName);
  db.prepare(`UPDATE _meta SET columns = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(updatedColumns), datasetId);

  return updatedColumns;
}

/**
 * Delete a dataset entirely
 */
function deleteDataset(datasetId) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  db.exec(`DROP TABLE IF EXISTS "${meta.tableName}"`);
  db.prepare(`DELETE FROM _meta WHERE id = ?`).run(datasetId);
  return true;
}

/**
 * Add a new empty row to a dataset
 */
function addRow(datasetId, rowData = {}) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  const cols = meta.columns;
  if (cols.length === 0) {
    const result = db.prepare(`INSERT INTO "${meta.tableName}" DEFAULT VALUES`).run();
    return { _id: result.lastInsertRowid };
  }

  const fields = [];
  const placeholders = [];
  const values = [];

  for (const col of cols) {
    fields.push(`"${col}"`);
    placeholders.push('?');
    values.push(rowData[col] !== undefined ? String(rowData[col]) : '');
  }

  const sql = `INSERT INTO "${meta.tableName}" (${fields.join(', ')}) VALUES (${placeholders.join(', ')})`;
  const result = db.prepare(sql).run(...values);
  
  return db.prepare(`SELECT * FROM "${meta.tableName}" WHERE _id = ?`).get(result.lastInsertRowid);
}

module.exports = {
  getDb,
  importDataset,
  getAllMeta,
  getMeta,
  getAllRows,
  getRowById,
  addRow,
  updateRow,
  deleteRow,
  addColumn,
  renameColumn,
  deleteColumn,
  deleteDataset
};

