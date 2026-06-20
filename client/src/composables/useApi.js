const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.data;
}

export function useApi() {
  const getDatasets = () => request('/datasets');
  const getDatasetMeta = (datasetId) => request(`/datasets/${datasetId}/meta`);
  const deleteDataset = (datasetId) => request(`/datasets/${datasetId}`, { method: 'DELETE' });
  const getRows = (datasetId) => request(`/datasets/${datasetId}/rows`);
  const getRow = (datasetId, rowId) => request(`/datasets/${datasetId}/rows/${rowId}`);

  const importDataset = (name, columns, rows) =>
    request('/datasets', {
      method: 'POST',
      body: JSON.stringify({ name, columns, rows }),
    });

  const updateRow = (datasetId, rowId, updates) =>
    request(`/datasets/${datasetId}/rows/${rowId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

  const deleteRow = (datasetId, rowId) =>
    request(`/datasets/${datasetId}/rows/${rowId}`, {
      method: 'DELETE',
    });

  const addColumn = (datasetId, columnName) =>
    request(`/datasets/${datasetId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ columnName }),
    });

  const renameColumn = (datasetId, oldName, newName) =>
    request(`/datasets/${datasetId}/columns`, {
      method: 'PUT',
      body: JSON.stringify({ oldName, newName }),
    });

  const deleteColumn = (datasetId, columnName) =>
    request(`/datasets/${datasetId}/columns/${encodeURIComponent(columnName)}`, {
      method: 'DELETE',
    });

  return {
    getDatasets,
    getDatasetMeta,
    deleteDataset,
    getRows,
    getRow,
    importDataset,
    updateRow,
    deleteRow,
    addColumn,
    renameColumn,
    deleteColumn
  };
}
