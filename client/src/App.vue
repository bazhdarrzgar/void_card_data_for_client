<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Fuse from 'fuse.js'
import * as XLSX from 'xlsx'
import { useApi } from './composables/useApi'
import TopActionBar from './components/TopActionBar.vue'
import DataManipulation from './components/DataManipulation.vue'
import SearchBar from './components/SearchBar.vue'
import TablePreview from './components/TablePreview.vue'
import ToastNotification from './components/ToastNotification.vue'
import Sidebar from './components/Sidebar.vue'

const api = useApi()

// ─── State ───────────────────────────────────────────────
const datasets = ref([])
const currentDatasetId = ref(null)

// ─── Print Configuration State ───────────────────────────
const showPrintModal = ref(false)
const printOption = ref('all') // 'all' or 'custom'
const printSelection = ref([])
const columnsToPrint = ref(null)

const columns = ref([])
const columnTypes = ref({})
const rows = ref([])
const selectedRow = ref(null)
const searchQuery = ref('')
const isLoading = ref(false)
const toasts = ref([])

const currentLanguage = ref('en')
const fontSizeMultiplier = ref(1)

watch(fontSizeMultiplier, (val) => {
  document.documentElement.style.setProperty('--font-scale', val);
}, { immediate: true })

function increaseFontSize() {
  if (fontSizeMultiplier.value < 1.5) fontSizeMultiplier.value += 0.1
}

function decreaseFontSize() {
  if (fontSizeMultiplier.value > 0.7) fontSizeMultiplier.value -= 0.1
}

// ─── Fuzzy Search ────────────────────────────────────────
const fuseInstance = computed(() => {
  if (columns.value.length === 0) return null
  return new Fuse(rows.value, {
    keys: columns.value,
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  })
})

const filteredRows = computed(() => {
  if (!searchQuery.value.trim() || !fuseInstance.value) {
    return rows.value
  }
  return fuseInstance.value.search(searchQuery.value).map(r => r.item)
})

const shortcuts = ref({}) // { "colName": "Ctrl+A" }

// ─── Shortcuts ───────────────────────────────────────────
function handleKeydown(e) {
  if (!selectedRow.value) return;

  // Format the typed key into our combo format
  let combo = []
  if (e.ctrlKey) combo.push('Ctrl')
  if (e.altKey) combo.push('Alt')
  if (e.shiftKey) combo.push('Shift')
  
  let keyStr = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
  
  // Ignore pure modifier keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

  combo.push(keyStr)
  const finalCombo = combo.join('+')

  for (const [colName, shortcutCombo] of Object.entries(shortcuts.value)) {
    if (shortcutCombo === finalCombo) {
      e.preventDefault();
      const el = document.getElementById('cell-' + colName);
      if (el) el.focus();
      return;
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
})

function handleAssignShortcut({ colName, shortcut }) {
  shortcuts.value[colName] = shortcut;
  showToast(`Shortcut ${shortcut} assigned to ${colName}`, 'success');
}

// ─── Toast System ────────────────────────────────────────
let toastId = 0
function showToast(message, type = 'success') {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3500)
}

// ─── Load Datasets ───────────────────────────────────────
async function loadDatasets() {
  try {
    const metas = await api.getDatasets();
    datasets.value = metas || [];
    if (!currentDatasetId.value && datasets.value.length > 0) {
      await selectDataset(datasets.value[0].id);
    }
  } catch (err) {
    showToast(`Failed to load datasets: ${err.message}`, 'error')
  }
}

async function selectDataset(id) {
  currentDatasetId.value = id;
  selectedRow.value = null;
  searchQuery.value = '';
  await loadCurrentDataset();
}

async function loadCurrentDataset() {
  if (!currentDatasetId.value) return;
  try {
    isLoading.value = true
    const data = await api.getRows(currentDatasetId.value)
    columns.value = data.columns || []
    columnTypes.value = data.columnTypes || {}
    rows.value = data.rows || []
  } catch (err) {
    columns.value = []
    columnTypes.value = {}
    rows.value = []
  } finally {
    isLoading.value = false
  }
}

// ─── Upload Handler ──────────────────────────────────────
async function handleUpload(file) {
  try {
    isLoading.value = true
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (jsonData.length === 0) {
      showToast('The file appears to be empty', 'error')
      return
    }

    const cols = Object.keys(jsonData[0])
    const result = await api.importDataset(file.name, cols, jsonData)
    
    await loadDatasets()
    await selectDataset(result.id)
    
    showToast(`Imported ${jsonData.length} rows with ${cols.length} columns`, 'success')
  } catch (err) {
    showToast(`Upload failed: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// ─── Delete Dataset ──────────────────────────────────────
async function handleDeleteDataset(id) {
  if (!confirm('Are you sure you want to delete this dataset? This cannot be undone.')) return;
  
  try {
    isLoading.value = true
    await api.deleteDataset(id)
    showToast('Dataset deleted successfully', 'success')
    
    if (currentDatasetId.value === id) {
      currentDatasetId.value = null
      columns.value = []
      rows.value = []
      selectedRow.value = null
    }
    await loadDatasets()
  } catch (err) {
    showToast(`Failed to delete dataset: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// ─── Export Handler ──────────────────────────────────────
function handleExport() {
  try {
    const exportData = filteredRows.value.map(row => {
      const clean = { ...row }
      delete clean._id
      return clean
    })

    if (exportData.length === 0) {
      showToast('No data to export', 'error')
      return
    }

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dataset')
    XLSX.writeFile(wb, `voide_export_${Date.now()}.xlsx`)
    showToast(`Exported ${exportData.length} rows`, 'success')
  } catch (err) {
    showToast(`Export failed: ${err.message}`, 'error')
  }
}

// ─── Row Selection ───────────────────────────────────────
function handleRowSelect(row) {
  selectedRow.value = row._id === selectedRow.value?._id ? null : { ...row }
}

// ─── Update Row ──────────────────────────────────────────
async function handleUpdate(updates) {
  if (!selectedRow.value || !currentDatasetId.value) return
  try {
    isLoading.value = true
    await api.updateRow(currentDatasetId.value, selectedRow.value._id, updates)
    await loadCurrentDataset()
    // Re-select the updated row
    const updated = rows.value.find(r => r._id === selectedRow.value._id)
    selectedRow.value = updated ? { ...updated } : null
    showToast('Row updated successfully', 'success')
  } catch (err) {
    showToast(`Update failed: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// ─── Delete Row ──────────────────────────────────────────
async function handleDelete() {
  if (!selectedRow.value || !currentDatasetId.value) return
  try {
    isLoading.value = true
    await api.deleteRow(currentDatasetId.value, selectedRow.value._id)
    selectedRow.value = null
    await loadCurrentDataset()
    showToast('Row deleted', 'success')
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

function handleDeselect() {
  selectedRow.value = null
}

// ─── Add Row ─────────────────────────────────────────────
async function handleAddRow() {
  if (!currentDatasetId.value) return
  try {
    isLoading.value = true
    const newRow = await api.addRow(currentDatasetId.value)
    await loadCurrentDataset()
    // Re-select the newly added row so the user can immediately edit it!
    const inserted = rows.value.find(r => r._id === newRow._id)
    selectedRow.value = inserted ? { ...inserted } : null
    showToast('New row added successfully', 'success')
  } catch (err) {
    showToast(`Failed to add row: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// ─── Column Actions ──────────────────────────────────────
async function handleAddColumn(colData) {
  if (!currentDatasetId.value) return;
  try {
    isLoading.value = true;
    const name = typeof colData === 'object' ? colData.name : colData;
    const type = typeof colData === 'object' ? colData.type : 'text';
    await api.addColumn(currentDatasetId.value, name, type);
    await loadCurrentDataset();
    showToast(`Added column "${name}" (${type})`, 'success');
  } catch (err) {
    showToast(`Failed to add column: ${err.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}

async function handleOpenDirectory(dirPath) {
  try {
    await api.openDirectory(dirPath);
  } catch (err) {
    showToast(`Failed to open directory: ${err.message}`, 'error');
  }
}

async function handleRenameColumn({ oldName, newName }) {
  if (!currentDatasetId.value) return;
  try {
    isLoading.value = true;
    await api.renameColumn(currentDatasetId.value, oldName, newName);
    await loadCurrentDataset();
    showToast(`Renamed ${oldName} to ${newName}`, 'success');
  } catch (err) {
    showToast(`Failed to rename column: ${err.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}

async function handleDeleteColumn(columnName) {
  if (!currentDatasetId.value) return;
  if (!confirm(`Are you sure you want to delete the column "${columnName}"? This action cannot be undone.`)) return;
  try {
    isLoading.value = true;
    await api.deleteColumn(currentDatasetId.value, columnName);
    await loadCurrentDataset();
    showToast(`Deleted column ${columnName}`, 'success');
  } catch (err) {
    showToast(`Failed to delete column: ${err.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}

async function handleReorderColumns(newColumnsOrder) {
  if (!currentDatasetId.value) return;
  const previousColumns = [...columns.value];
  columns.value = newColumnsOrder;
  try {
    await api.reorderColumns(currentDatasetId.value, newColumnsOrder);
    showToast('Column order updated successfully', 'success');
  } catch (err) {
    columns.value = previousColumns;
    showToast(`Failed to reorder columns: ${err.message}`, 'error');
  }
}

function handlePrint() {
  printOption.value = 'all'
  printSelection.value = [...columns.value]
  showPrintModal.value = true
}

function selectAllColumnsForPrint() {
  printSelection.value = [...columns.value]
}

function clearAllColumnsForPrint() {
  printSelection.value = []
}

async function confirmAndPrint() {
  if (printOption.value === 'all') {
    columnsToPrint.value = null
  } else {
    if (printSelection.value.length === 0) return
    columnsToPrint.value = [...printSelection.value]
  }
  
  showPrintModal.value = false
  await nextTick()
  window.print()
}

// Initial load
loadDatasets()
</script>

<template>
  <div class="h-screen flex flex-col overflow-hidden relative">
    <!-- Background Gradient Blobs -->
    <div class="fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-accent-600/8 rounded-full blur-3xl"></div>
      <div class="absolute top-1/3 -right-20 w-80 h-80 bg-purple-600/5 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-32 left-1/3 w-72 h-72 bg-accent-500/5 rounded-full blur-3xl"></div>
    </div>

    <!-- Header -->
    <header class="flex-shrink-0 border-b border-surface-800/80 bg-surface-950/80 backdrop-blur-sm">
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-semibold text-white tracking-tight">Voide Form</h1>
            <p class="text-xs text-surface-500">Dataset Studio</p>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Font Size Controls -->
          <div class="flex items-center bg-surface-800/60 rounded-lg p-1 border border-surface-700/40">
            <button @click="decreaseFontSize" class="w-7 h-7 flex items-center justify-center text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded transition-colors text-xs font-semibold">A-</button>
            <div class="w-px h-4 bg-surface-700/60 mx-1"></div>
            <button @click="increaseFontSize" class="w-7 h-7 flex items-center justify-center text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded transition-colors text-sm font-semibold">A+</button>
          </div>

          <!-- Language Selector -->
          <select v-model="currentLanguage" class="bg-surface-800/60 border border-surface-700/40 text-surface-300 text-xs rounded-lg focus:ring-accent-500 focus:border-accent-500 block px-2.5 py-1.5 outline-none cursor-pointer">
            <option value="en">English (EN)</option>
            <option value="ar">Arabic (AR)</option>
            <option value="ckb">Kurdish (CKB)</option>
          </select>

          <div v-if="rows.length" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-800/60 border border-surface-700/40 text-xs text-surface-500">
            <span class="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse-soft"></span>
            {{ rows.length }} rows · {{ columns.length }} columns
          </div>
          <div v-if="isLoading" class="spinner"></div>
        </div>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <Sidebar
        class="no-print"
        :datasets="datasets"
        :current-dataset-id="currentDatasetId"
        @select="selectDataset"
        @delete="handleDeleteDataset"
      />

      <!-- Main Content -->
      <main class="flex-1 overflow-hidden flex flex-col gap-4 p-6 print-main">
        <!-- Top Section: Action Bar + Data Manipulation -->
        <div class="flex-shrink-0 flex flex-col gap-4 animate-fade-in no-print">
          <TopActionBar
            :has-data="rows.length > 0"
            :is-loading="isLoading"
            @upload="handleUpload"
            @export="handleExport"
            @print="handlePrint"
          />

          <DataManipulation
            :columns="columns"
            :selected-row="selectedRow"
            :shortcuts="shortcuts"
            :current-language="currentLanguage"
            :column-types="columnTypes"
            @update="handleUpdate"
            @delete="handleDelete"
            @deselect="handleDeselect"
            @rename-column="handleRenameColumn"
            @assign-shortcut="handleAssignShortcut"
          />

          <SearchBar
            v-model="searchQuery"
            :total-count="rows.length"
            :filtered-count="filteredRows.length"
            :has-data="rows.length > 0"
            :current-language="currentLanguage"
          />
        </div>

        <!-- Table Preview -->
        <div class="flex-1 min-h-0">
          <TablePreview
            :columns="columns"
            :rows="filteredRows"
            :selected-row="selectedRow"
            :is-loading="isLoading"
            :columns-to-print="columnsToPrint"
            :column-types="columnTypes"
            @select="handleRowSelect"
            @add-row="handleAddRow"
            @add-column="handleAddColumn"
            @rename-column="handleRenameColumn"
            @delete-column="handleDeleteColumn"
            @reorder-columns="handleReorderColumns"
            @open-directory="handleOpenDirectory"
          />
        </div>
      </main>
    </div>

    <!-- Print Configuration Modal (no-print) -->
    <div v-if="showPrintModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-md no-print animate-fade-in">
      <div class="glass-panel w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl border border-surface-700/50">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-surface-800/80 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <svg class="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <h3 class="text-base font-semibold text-white">Print Configuration</h3>
          </div>
          <button @click="showPrintModal = false" class="text-surface-400 hover:text-surface-200 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto space-y-6">
          <!-- Option Selection -->
          <div class="grid grid-cols-2 gap-4">
            <label 
              @click="printOption = 'all'"
              class="flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all duration-200"
              :class="printOption === 'all' 
                ? 'bg-accent-500/10 border-accent-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                : 'bg-surface-900/40 border-surface-800 text-surface-400 hover:border-surface-700/60 hover:bg-surface-800/40'"
            >
              <svg class="w-7 h-7 mb-2 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-sm font-semibold">Print Entire Sheet</span>
              <span class="text-[11px] text-surface-500 mt-1">All {{ columns.length }} columns</span>
            </label>

            <label 
              @click="printOption = 'custom'"
              class="flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all duration-200"
              :class="printOption === 'custom' 
                ? 'bg-accent-500/10 border-accent-500 text-white shadow-[0_0_15px_rgba(14,165,233,0.15)]' 
                : 'bg-surface-900/40 border-surface-800 text-surface-400 hover:border-surface-700/60 hover:bg-surface-800/40'"
            >
              <svg class="w-7 h-7 mb-2 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span class="text-sm font-semibold">Select Custom Columns</span>
              <span class="text-[11px] text-surface-500 mt-1">Choose specific columns</span>
            </label>
          </div>

          <!-- Custom Columns Selection List -->
          <div v-if="printOption === 'custom'" class="space-y-3 animate-slide-down">
            <div class="flex items-center justify-between px-1">
              <span class="text-xs font-semibold text-surface-400">Columns ({{ printSelection.length }} selected)</span>
              <div class="flex gap-2">
                <button @click="selectAllColumnsForPrint" class="text-[10px] text-accent-400 hover:underline">Select All</button>
                <span class="text-surface-700 text-[10px]">•</span>
                <button @click="clearAllColumnsForPrint" class="text-[10px] text-accent-400 hover:underline">Clear All</button>
              </div>
            </div>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-surface-950/40 border border-surface-800/80 rounded-xl p-4 max-h-[220px] overflow-y-auto">
              <label 
                v-for="col in columns" 
                :key="col"
                class="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-800 bg-surface-900/20 hover:bg-surface-800/40 cursor-pointer select-none transition-all duration-150"
                :class="printSelection.includes(col) ? 'border-accent-500/30 bg-accent-500/5 text-surface-100' : 'text-surface-400'"
              >
                <input 
                  type="checkbox" 
                  :value="col" 
                  v-model="printSelection"
                  class="rounded border-surface-700 text-accent-600 focus:ring-accent-500 bg-surface-800 w-3.5 h-3.5"
                />
                <span class="text-xs truncate font-mono">{{ col }}</span>
              </label>
            </div>
            <p v-if="printSelection.length === 0" class="text-xs text-danger-400 text-center italic mt-2">
              ⚠️ Please select at least one column to print.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-surface-950/30 border-t border-surface-800/80 flex items-center justify-end gap-3">
          <button 
            @click="showPrintModal = false" 
            class="btn-ghost py-2 text-xs"
          >
            Cancel
          </button>
          <button 
            @click="confirmAndPrint" 
            class="btn-primary py-2 text-xs px-6"
            :disabled="printOption === 'custom' && printSelection.length === 0"
            :class="{ 'opacity-50 cursor-not-allowed': printOption === 'custom' && printSelection.length === 0 }"
          >
            Confirm & Print
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <TransitionGroup name="toast">
        <ToastNotification
          v-for="toast in toasts"
          :key="toast.id"
          :message="toast.message"
          :type="toast.type"
        />
      </TransitionGroup>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');

.print-only-layout {
  display: none;
}

@font-face {
  font-family: 'Unikurd Jino';
  src: url('/fonts/UnikurdJino.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

:root {
  --font-scale: 1;
}

/* Override Tailwind text sizes to only scale text, not layout */
.text-xs { font-size: calc(0.75rem * var(--font-scale)) !important; line-height: calc(1rem * var(--font-scale)) !important; }
.text-sm { font-size: calc(0.875rem * var(--font-scale)) !important; line-height: calc(1.25rem * var(--font-scale)) !important; }
.text-base { font-size: calc(1rem * var(--font-scale)) !important; line-height: calc(1.5rem * var(--font-scale)) !important; }
.text-lg { font-size: calc(1.125rem * var(--font-scale)) !important; line-height: calc(1.75rem * var(--font-scale)) !important; }
.text-xl { font-size: calc(1.25rem * var(--font-scale)) !important; line-height: calc(1.75rem * var(--font-scale)) !important; }

/* Keep icons relatively stable if they use relative sizes or just let them be */
@media print {
  /* Hide UI elements that shouldn't be printed */
  .no-print, header, .fixed.inset-0, .fixed.bottom-6, button, input {
    display: none !important;
  }
  
  @page {
    margin: 0;
  }
  
  /* Aggressive reset for dark mode printing */
  * {
    color: #000000 !important;
    text-shadow: none !important;
    box-shadow: none !important;
  }

  /* Reset all container layouts so they don't restrict heights or hide overflow */
  html, body, #app, #app > div, main, .print-main, .glass-panel, .min-h-0 {
    background: transparent !important;
    background-color: transparent !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
    display: block !important;
    position: static !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    font-family: 'Unikurd Jino', 'Noto Sans Arabic', Arial, sans-serif !important;
  }

  body {
    padding: 0 !important;
  }

  .print-main {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .print-only-layout {
    display: block !important;
  }

  .print-page {
    page-break-after: always !important;
    break-after: page !important;
    height: 100vh !important;
    box-sizing: border-box !important;
    position: relative !important;
    padding: 1cm 1cm 1.2cm 1cm !important;
    background-color: #ffffff !important;
  }

  .print-page-footer {
    display: block !important;
    position: absolute !important;
    bottom: 1cm !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    font-size: 11pt !important;
    font-family: Arial, sans-serif !important;
    color: #000000 !important;
    font-weight: bold !important;
    text-align: center !important;
  }
  
  .data-table {
    display: table !important;
    border-collapse: collapse !important;
    width: 100% !important;
    font-family: 'Unikurd Jino', 'Noto Sans Arabic', Arial, sans-serif !important;
    font-size: 11pt !important;
    border: 2px solid #000000 !important;
    background-color: #ffffff !important;
  }
  
  .data-table thead {
    display: table-header-group !important;
  }
  
  .data-table tbody {
    display: table-row-group !important;
  }
  
  .data-table tr {
    page-break-inside: avoid !important;
  }
  
  .data-table thead, .data-table tr, .data-table th, .data-table td {
    background-color: transparent !important;
  }
  
  .data-table th {
    background-color: #000000 !important; /* Black background */
    color: #ffffff !important; /* White text */
    font-weight: bold !important;
    border: 1px solid #000000 !important;
    padding: 10px !important;
    text-align: center !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    position: static !important;
  }
  
  .data-table td {
    border: 1px solid #000000 !important;
    color: #000000 !important;
    padding: 8px !important;
    white-space: normal !important; /* Allow wrapping in printed view */
    word-break: break-word !important;
    overflow: visible !important;
    text-overflow: clip !important;
    max-width: none !important;
  }
  
  /* Striped rows */
  .data-table tbody tr:nth-child(odd) td {
    background-color: #ffffff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .data-table tbody tr:nth-child(even) td {
    background-color: #f3f4f6 !important; /* Light gray row */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* Ultimate fallback override at the very end to guarantee no-print utility always wins */
  .no-print, .no-print * {
    display: none !important;
  }
}
</style>
