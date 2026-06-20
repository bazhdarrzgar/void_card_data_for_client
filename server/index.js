const express = require('express');
const cors = require('cors');
const {
  importDataset,
  getAllMeta,
  getMeta,
  getAllRows,
  getRowById,
  updateRow,
  deleteRow,
  addColumn,
  renameColumn,
  deleteColumn,
  deleteDataset
} = require('./database');

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

// ─── Dataset Columns ─────────────────────────────────────────
app.post('/api/datasets/:datasetId/columns', (req, res) => {
  try {
    const { columnName } = req.body;
    if (!columnName) return res.status(400).json({ success: false, error: 'columnName required' });
    const cols = addColumn(Number(req.params.datasetId), columnName);
    res.json({ success: true, data: cols });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/datasets/:datasetId/columns', (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ success: false, error: 'oldName and newName required' });
    const cols = renameColumn(Number(req.params.datasetId), oldName, newName);
    res.json({ success: true, data: cols });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/datasets/:datasetId/columns/:columnName', (req, res) => {
  try {
    const cols = deleteColumn(Number(req.params.datasetId), req.params.columnName);
    res.json({ success: true, data: cols });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Serve Static Frontend Assets (Production Build) ──────────
const path = require('path');
const fs = require('fs');
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
