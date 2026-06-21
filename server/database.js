const Database = require('better-sqlite3');
const path = require('path');
const Fuse = require('fuse.js');

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
        original_name TEXT,
        folder_id INTEGER,
        columns TEXT NOT NULL DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Folders table
    db.exec(`
      CREATE TABLE IF NOT EXISTS _folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Migration: Add column_types to _meta if it doesn't exist
    try {
      db.exec(`ALTER TABLE _meta ADD COLUMN column_types TEXT NOT NULL DEFAULT '{}'`);
    } catch (e) {
      // Column already exists, ignore error
    }
    // Migration: Add original_name to _meta
    try {
      db.exec(`ALTER TABLE _meta ADD COLUMN original_name TEXT`);
    } catch (e) {}
    // Migration: Add folder_id to _meta
    try {
      db.exec(`ALTER TABLE _meta ADD COLUMN folder_id INTEGER`);
    } catch (e) {}
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
function importDataset(displayName, columns, rows, originalName = null, folderId = null) {
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
    INSERT INTO _meta (table_name, display_name, columns, column_types, original_name, folder_id, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const result = insertMeta.run(tableName, displayName, JSON.stringify(uniqueCols), '{}', originalName, folderId);

  return { id: result.lastInsertRowid, tableName, columns: uniqueCols, rowCount: rows ? rows.length : 0 };
}

function getAllMeta() {
  const db = getDb();
  const metas = db.prepare('SELECT * FROM _meta ORDER BY updated_at DESC').all();
  return metas.map(m => {
    let columnTypes = {};
    if (m.column_types) {
      try {
        columnTypes = JSON.parse(m.column_types);
      } catch (e) {
        columnTypes = {};
      }
    }
    return {
      id: m.id,
      tableName: m.table_name,
      displayName: m.display_name,
      originalName: m.original_name,
      folderId: m.folder_id,
      columns: JSON.parse(m.columns),
      columnTypes,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    };
  });
}

/**
 * Get specific dataset meta info
 */
function getMeta(id) {
  const db = getDb();
  const meta = db.prepare('SELECT * FROM _meta WHERE id = ?').get(id);
  if (!meta) return null;
  let columnTypes = {};
  if (meta.column_types) {
    try {
      columnTypes = JSON.parse(meta.column_types);
    } catch (e) {
      columnTypes = {};
    }
  }
  return {
    id: meta.id,
    tableName: meta.table_name,
    displayName: meta.display_name,
    originalName: meta.original_name,
    folderId: meta.folder_id,
    columns: JSON.parse(meta.columns),
    columnTypes,
    createdAt: meta.created_at,
    updatedAt: meta.updated_at
  };
}

function getAllRows(datasetId) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  const rows = db.prepare(`SELECT * FROM "${meta.tableName}" ORDER BY _id ASC`).all();
  return { columns: meta.columns, columnTypes: meta.columnTypes, rows };
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
function addColumn(datasetId, columnName, columnType = 'text') {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  const safeColName = sanitizeName(columnName, 'col');
  
  if (meta.columns.includes(safeColName)) {
    throw new Error('Column name already exists');
  }

  db.exec(`ALTER TABLE "${meta.tableName}" ADD COLUMN "${safeColName}" TEXT`);
  
  meta.columns.push(safeColName);
  const types = meta.columnTypes || {};
  types[safeColName] = columnType;

  db.prepare(`UPDATE _meta SET columns = ?, column_types = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(meta.columns), JSON.stringify(types), datasetId);

  return { columns: meta.columns, columnTypes: types };
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
  const types = meta.columnTypes || {};
  if (types[oldName]) {
    types[safeNewName] = types[oldName];
    delete types[oldName];
  }

  db.prepare(`UPDATE _meta SET columns = ?, column_types = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(updatedColumns), JSON.stringify(types), datasetId);

  return { columns: updatedColumns, columnTypes: types };
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
  const types = meta.columnTypes || {};
  delete types[columnName];

  db.prepare(`UPDATE _meta SET columns = ?, column_types = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(updatedColumns), JSON.stringify(types), datasetId);

  return { columns: updatedColumns, columnTypes: types };
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
 * Update the columns list (order) for a dataset
 */
function updateColumnsOrder(datasetId, columnsArray) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  const existingCols = new Set(meta.columns);
  if (columnsArray.length !== meta.columns.length || !columnsArray.every(c => existingCols.has(c))) {
    throw new Error('Invalid columns provided for reordering');
  }

  db.prepare(`UPDATE _meta SET columns = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(columnsArray), datasetId);

  return columnsArray;
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

function renameDataset(datasetId, newName) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');

  // If original_name is null, it means it's an old dataset or hasn't been set.
  // Save the current display_name as original_name before renaming.
  if (!meta.originalName) {
    db.prepare(`UPDATE _meta SET original_name = ? WHERE id = ?`).run(meta.displayName, datasetId);
  }

  db.prepare(`UPDATE _meta SET display_name = ?, updated_at = datetime('now') WHERE id = ?`).run(newName, datasetId);
  return true;
}

function moveDatasetToFolder(datasetId, folderId) {
  const db = getDb();
  const meta = getMeta(datasetId);
  if (!meta) throw new Error('Dataset not found');
  
  db.prepare(`UPDATE _meta SET folder_id = ?, updated_at = datetime('now') WHERE id = ?`).run(folderId, datasetId);
  return true;
}

// Folders API
function getFolders() {
  const db = getDb();
  return db.prepare('SELECT * FROM _folders ORDER BY created_at ASC').all();
}

function createFolder(name) {
  const db = getDb();
  const result = db.prepare('INSERT INTO _folders (name) VALUES (?)').run(name);
  return { id: result.lastInsertRowid, name };
}

function renameFolder(folderId, newName) {
  const db = getDb();
  const result = db.prepare('UPDATE _folders SET name = ? WHERE id = ?').run(newName, folderId);
  if (result.changes === 0) throw new Error('Folder not found');
  return true;
}

function deleteFolder(folderId) {
  const db = getDb();
  // Set folder_id to null for datasets in this folder
  db.prepare('UPDATE _meta SET folder_id = NULL WHERE folder_id = ?').run(folderId);
  const result = db.prepare('DELETE FROM _folders WHERE id = ?').run(folderId);
  if (result.changes === 0) throw new Error('Folder not found');
  return true;
}

function globalSearch(query, folderId = null) {
  const db = getDb();
  let sql = 'SELECT * FROM _meta';
  const params = [];
  
  if (folderId !== null) {
    sql += ' WHERE folder_id = ?';
    params.push(folderId);
  }
  
  const datasets = db.prepare(sql).all();
  let allResults = [];

  for (const meta of datasets) {
    let columns = [];
    try {
      columns = JSON.parse(meta.columns);
    } catch (e) {
      continue;
    }
    
    if (columns.length === 0) continue;

    let rows = [];
    try {
      rows = db.prepare(`SELECT * FROM "${meta.table_name}"`).all();
    } catch (e) {
      console.error(`Error querying table ${meta.table_name}:`, e.message);
      continue;
    }
    
    if (rows.length === 0) continue;

    const fuse = new Fuse(rows, {
      keys: columns,
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true
    });

    const searchResults = fuse.search(query);
    for (const res of searchResults) {
      allResults.push({
        datasetId: meta.id,
        datasetName: meta.display_name,
        originalName: meta.original_name,
        folderId: meta.folder_id,
        columns: columns,
        score: res.score,
        row: res.item
      });
    }
  }

  // Sort globally by score
  allResults.sort((a, b) => a.score - b.score);
  
  // Return top 100 to avoid massive payloads
  return allResults.slice(0, 100);
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
  deleteDataset,
  updateColumnsOrder,
  renameDataset,
  moveDatasetToFolder,
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  globalSearch
};

