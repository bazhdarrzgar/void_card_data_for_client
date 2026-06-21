const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const {
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
  updateColumnsOrder
} = require('./database');

const backupTasks = {};

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Datasets Meta ───────────────────────────────────────────
app.get('/api/datasets', (req, res) => {
  try {
    const metas = getAllMeta();
    res.json({ success: true, data: metas });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/datasets/:id/meta', (req, res) => {
  try {
    const meta = getMeta(Number(req.params.id));
    if (!meta) return res.status(404).json({ success: false, error: 'Dataset not found' });
    res.json({ success: true, data: meta });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Import Dataset ──────────────────────────────────────────
app.post('/api/datasets', (req, res) => {
  try {
    const { name, columns, rows } = req.body;
    if (!name || !columns) {
      return res.status(400).json({ success: false, error: 'name and columns are required' });
    }
    const result = importDataset(name, columns, rows || []);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/datasets/:id', (req, res) => {
  try {
    deleteDataset(Number(req.params.id));
    res.json({ success: true, message: 'Dataset deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Dataset Rows ────────────────────────────────────────────
app.get('/api/datasets/:datasetId/rows', (req, res) => {
  try {
    const data = getAllRows(Number(req.params.datasetId));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/datasets/:datasetId/rows', (req, res) => {
  try {
    const row = addRow(Number(req.params.datasetId), req.body || {});
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/datasets/:datasetId/rows/:id', (req, res) => {
  try {
    const row = getRowById(Number(req.params.datasetId), Number(req.params.id));
    if (!row) return res.status(404).json({ success: false, error: 'Row not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/datasets/:datasetId/rows/:id', (req, res) => {
  try {
    const changes = updateRow(Number(req.params.datasetId), Number(req.params.id), req.body);
    if (changes === 0) return res.status(404).json({ success: false, error: 'Row not found' });
    const updated = getRowById(Number(req.params.datasetId), Number(req.params.id));
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/datasets/:datasetId/rows/:id', (req, res) => {
  try {
    const changes = deleteRow(Number(req.params.datasetId), Number(req.params.id));
    if (changes === 0) return res.status(404).json({ success: false, error: 'Row not found' });
    res.json({ success: true, message: 'Row deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/datasets/transfer-row', (req, res) => {
  try {
    const { sourceDatasetId, targetDatasetId, rowId, operation } = req.body;
    if (!sourceDatasetId || !targetDatasetId || !rowId || !operation) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    if (Number(sourceDatasetId) === Number(targetDatasetId) && operation === 'move') {
      return res.status(400).json({ success: false, error: 'Cannot move a row to the same dataset' });
    }

    const sourceRow = getRowById(Number(sourceDatasetId), Number(rowId));
    if (!sourceRow) {
      return res.status(404).json({ success: false, error: 'Source row not found' });
    }

    const newRow = addRow(Number(targetDatasetId), sourceRow);

    if (operation === 'move') {
      deleteRow(Number(sourceDatasetId), Number(rowId));
    }

    res.json({ success: true, data: { newRow } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Dataset Columns ─────────────────────────────────────────
app.post('/api/datasets/:datasetId/columns', (req, res) => {
  try {
    const { columnName, columnType } = req.body;
    if (!columnName) return res.status(400).json({ success: false, error: 'columnName required' });
    const result = addColumn(Number(req.params.datasetId), columnName, columnType || 'text');
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/datasets/:datasetId/columns', (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ success: false, error: 'oldName and newName required' });
    const result = renameColumn(Number(req.params.datasetId), oldName, newName);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/datasets/:datasetId/columns/:columnName', (req, res) => {
  try {
    const result = deleteColumn(Number(req.params.datasetId), req.params.columnName);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/datasets/:datasetId/columns/reorder', (req, res) => {
  try {
    const { columns } = req.body;
    if (!columns || !Array.isArray(columns)) {
      return res.status(400).json({ success: false, error: 'columns array is required' });
    }
    const cols = updateColumnsOrder(Number(req.params.datasetId), columns);
    res.json({ success: true, data: cols });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/open-directory', (req, res) => {
  try {
    const { dirPath } = req.body;
    if (!dirPath) {
      return res.status(400).json({ success: false, error: 'dirPath is required' });
    }
    
    const { spawn } = require('child_process');
    let cmd = '';
    let args = [dirPath];
    
    if (process.platform === 'win32') {
      cmd = 'explorer.exe';
      args = [dirPath.replace(/\//g, '\\')];
    } else if (process.platform === 'darwin') {
      cmd = 'open';
    } else {
      cmd = 'xdg-open';
    }
    
    const proc = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    proc.unref();
    
    res.json({ success: true, message: 'Open directory command dispatched' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Database Backup and Progress ─────────────────────────────
app.post('/api/backup/start', (req, res) => {
  try {
    const db = getDb();
    // Flush WAL changes to main data.db file
    db.pragma('wal_checkpoint(TRUNCATE)');

    const dbPath = path.join(__dirname, 'data.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, error: 'Database file not found' });
    }

    // 1. Scan metadata and files to pack
    const datasets = db.prepare('SELECT * FROM _meta').all();
    const itemsToPack = []; // array of { type: 'file'|'buffer', source, zipPath, size }
    
    // Add data.db
    const dbSize = fs.statSync(dbPath).size;
    itemsToPack.push({
      type: 'file',
      source: dbPath,
      zipPath: 'data.db',
      size: dbSize
    });

    // Helper to sanitize name for filenames
    const sanitizeFilename = (name) => name.replace(/[^a-zA-Z0-9_\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g, '_');

    for (const meta of datasets) {
      const tableName = meta.table_name;
      const displayName = sanitizeFilename(meta.display_name || tableName);
      let columnTypes = {};
      try {
        columnTypes = JSON.parse(meta.column_types || '{}');
      } catch (e) {
        continue;
      }

      // Check if there are columns of interest
      const colEntries = Object.entries(columnTypes);
      const imageCols = colEntries.filter(([_, type]) => type === 'image').map(([name]) => name);
      const dirCols = colEntries.filter(([_, type]) => type === 'directory').map(([name]) => name);

      if (imageCols.length === 0 && dirCols.length === 0) {
        continue;
      }

      // Query rows for this table
      let rows = [];
      try {
        rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
      } catch (e) {
        console.error(`Failed to query table ${tableName}:`, e.message);
        continue;
      }

      for (const row of rows) {
        const rowId = row._id || row.id || Date.now();

        // 1. Process image columns
        for (const col of imageCols) {
          const val = row[col];
          if (val && typeof val === 'string' && val.startsWith('data:image/')) {
            const matches = val.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
              const base64Data = matches[2];
              const buffer = Buffer.from(base64Data, 'base64');
              itemsToPack.push({
                type: 'buffer',
                source: buffer,
                zipPath: `uploaded_images/${displayName}/row_${rowId}_${sanitizeFilename(col)}.${ext}`,
                size: buffer.length
              });
            }
          }
        }

        // 2. Process directory columns
        for (const col of dirCols) {
          const val = row[col];
          if (val && typeof val === 'string') {
            const resolvedPath = path.resolve(val);
            if (fs.existsSync(resolvedPath)) {
              try {
                const stat = fs.statSync(resolvedPath);
                if (stat.isDirectory()) {
                  // Recursively scan files
                  const filesList = [];
                  const scanDir = (dir, prefix) => {
                    const dirItems = fs.readdirSync(dir);
                    for (const item of dirItems) {
                      const fPath = path.join(dir, item);
                      const zPath = path.join(prefix, item);
                      const s = fs.statSync(fPath);
                      if (s.isDirectory()) {
                        scanDir(fPath, zPath);
                      } else if (s.isFile()) {
                        filesList.push({
                          localPath: fPath,
                          zipPath: zPath,
                          size: s.size
                        });
                      }
                    }
                  };
                  
                  const zipPrefix = `mentioned_directories/${displayName}/row_${rowId}_${sanitizeFilename(col)}`;
                  scanDir(resolvedPath, zipPrefix);
                  
                  for (const f of filesList) {
                    itemsToPack.push({
                      type: 'file',
                      source: f.localPath,
                      zipPath: f.zipPath,
                      size: f.size
                    });
                  }
                } else if (stat.isFile()) {
                  itemsToPack.push({
                    type: 'file',
                    source: resolvedPath,
                    zipPath: `mentioned_directories/${displayName}/row_${rowId}_${sanitizeFilename(col)}_${path.basename(resolvedPath)}`,
                    size: stat.size
                  });
                }
              } catch (e) {
                console.error(`Failed to pack path ${resolvedPath}:`, e.message);
              }
            }
          }
        }
      }
    }

    // Sum up total size
    const totalSize = itemsToPack.reduce((acc, item) => acc + item.size, 0);

    const taskId = String(Date.now());
    const backupsDir = path.join(__dirname, 'backups');
    
    // Ensure backups directory exists and clean stale backups
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    } else {
      try {
        const files = fs.readdirSync(backupsDir);
        const now = Date.now();
        for (const file of files) {
          if (file.startsWith('backup_') && file.endsWith('.zip')) {
            const filePath = path.join(backupsDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > 10 * 60 * 1000) {
              fs.unlinkSync(filePath);
            }
          }
        }
      } catch (e) {
        console.error('Failed to clean up stale backups:', e);
      }
    }

    const zipPath = path.join(backupsDir, `backup_${taskId}.zip`);
    
    // Initialize task state
    backupTasks[taskId] = {
      progress: 0,
      status: 'running',
      error: null,
      zipPath
    };

    // Run the backup zipping process asynchronously
    const output = fs.createWriteStream(zipPath);
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      if (backupTasks[taskId]) {
        backupTasks[taskId].progress = 100;
        backupTasks[taskId].status = 'done';
      }
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (backupTasks[taskId]) {
        backupTasks[taskId].status = 'failed';
        backupTasks[taskId].error = err.message;
      }
    });

    archive.pipe(output);

    // Add all compiled items to the zip
    for (const item of itemsToPack) {
      if (item.type === 'file') {
        archive.file(item.source, { name: item.zipPath });
      } else if (item.type === 'buffer') {
        archive.append(item.source, { name: item.zipPath });
      }
    }

    // Append a backup metadata info file
    const metaInfo = JSON.stringify({
      backupDate: new Date().toISOString(),
      app: 'Voide Form',
      description: 'Contains database, structured uploaded images, and recursively backed up directory columns.',
      statistics: {
        totalFilesPacked: itemsToPack.length,
        totalSizeRawBytes: totalSize
      }
    }, null, 2);
    archive.append(metaInfo, { name: 'backup_metadata.json' });

    // Track progress
    archive.on('progress', (progressData) => {
      if (backupTasks[taskId]) {
        const processed = progressData.fs.processedBytes || 0;
        const pct = Math.min(Math.round((processed / totalSize) * 100), 99);
        backupTasks[taskId].progress = pct;
      }
    });

    archive.finalize();

    res.json({ success: true, data: { taskId } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/backup/status/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = backupTasks[taskId];
  if (!task) {
    return res.status(404).json({ success: false, error: 'Backup task not found' });
  }
  res.json({
    success: true,
    data: {
      status: task.status,
      progress: task.progress,
      error: task.error
    }
  });
});

app.get('/api/backup/download/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = backupTasks[taskId];
  if (!task) {
    return res.status(404).json({ success: false, error: 'Backup task not found' });
  }

  if (task.status !== 'done') {
    return res.status(400).json({ success: false, error: 'Backup is not ready yet' });
  }

  const zipPath = task.zipPath;
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ success: false, error: 'Backup file not found' });
  }

  const downloadName = `voide_backup_${taskId}.zip`;
  res.download(zipPath, downloadName, (err) => {
    try {
      fs.unlinkSync(zipPath);
    } catch (e) {
      console.error('Failed to delete temp backup file:', e);
    }
    delete backupTasks[taskId];
  });
});

// ─── Serve Static Frontend Assets (Production Build) ──────────
const distPath = path.join(__dirname, '../client/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 Voide Form API Server`);
  console.log(`  ────────────────────────`);
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health\n`);
});
