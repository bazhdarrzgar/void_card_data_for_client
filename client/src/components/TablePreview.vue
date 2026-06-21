<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  selectedRow: { type: Object, default: null },
  isLoading: Boolean,
  columnsToPrint: { type: Array, default: null },
  columnTypes: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['select', 'add-row', 'add-column', 'rename-column', 'delete-column', 'reorder-columns', 'open-directory'])

const hasData = computed(() => props.columns.length > 0 && props.rows.length > 0)

const activePrintColumns = computed(() => {
  return props.columnsToPrint && props.columnsToPrint.length > 0
    ? props.columnsToPrint
    : props.columns
})

const chunkedRows = computed(() => {
  const chunks = []
  if (props.rows.length === 0) return chunks

  // First chunk has 25 rows
  chunks.push(props.rows.slice(0, 25))

  // Subsequent chunks have 26 rows each
  let i = 25
  while (i < props.rows.length) {
    chunks.push(props.rows.slice(i, i + 26))
    i += 26
  }
  return chunks
})

const isAddingColumn = ref(false)
const newColumnName = ref('')
const newColumnType = ref('text')
const newColumnOptions = ref('')
const columnInputRef = ref(null)

const editingColumn = ref(null)
const renamingColValue = ref('')

const lightboxUrl = ref(null)

function previewImage(url) {
  lightboxUrl.value = url
}

function getFolderName(path) {
  if (!path) return ''
  const parts = path.split(/[/\\]/)
  return parts[parts.length - 1] || path
}

function triggerOpenDirectory(path) {
  emit('open-directory', path)
}

// Drag & Drop State
const draggedColumn = ref(null)
const dragOverColumn = ref(null)

function handleDragStart(event, col) {
  if (editingColumn.value) {
    event.preventDefault()
    return
  }
  draggedColumn.value = col
  event.dataTransfer.effectAllowed = 'move'
  // Required for Firefox / Webkit drag-and-drop mechanics
  event.dataTransfer.setData('text/plain', col)
}

function handleDragOver(event, col) {
  if (draggedColumn.value && draggedColumn.value !== col) {
    event.preventDefault()
  }
}

function handleDragEnter(event, col) {
  if (draggedColumn.value && draggedColumn.value !== col) {
    dragOverColumn.value = col
  }
}

function handleDragLeave(event, col) {
  if (dragOverColumn.value === col) {
    dragOverColumn.value = null
  }
}

function handleDragEnd() {
  draggedColumn.value = null
  dragOverColumn.value = null
}

function handleDrop(event, targetCol) {
  event.preventDefault()
  if (!draggedColumn.value || draggedColumn.value === targetCol) return
  
  const fromIndex = props.columns.indexOf(draggedColumn.value)
  const toIndex = props.columns.indexOf(targetCol)
  
  if (fromIndex !== -1 && toIndex !== -1) {
    const updated = [...props.columns]
    // Remove the column from its original position
    updated.splice(fromIndex, 1)
    // Insert the column at the target position
    updated.splice(toIndex, 0, draggedColumn.value)
    
    emit('reorder-columns', updated)
  }
  
  draggedColumn.value = null
  dragOverColumn.value = null
}

function startAddingColumn() {
  isAddingColumn.value = true
  nextTick(() => {
    if (columnInputRef.value) {
      columnInputRef.value.focus()
    }
  })
}

function handleAddColumn() {
  if (!newColumnName.value.trim()) {
    isAddingColumn.value = false
    return
  }
  const type = newColumnType.value === 'select'
    ? `select:${newColumnOptions.value.trim() || 'Option 1,Option 2'}`
    : newColumnType.value

  emit('add-column', { name: newColumnName.value.trim(), type })
  newColumnName.value = ''
  newColumnType.value = 'text'
  newColumnOptions.value = ''
  isAddingColumn.value = false
}

function startRename(col) {
  editingColumn.value = col
  renamingColValue.value = col
}

function finishRename() {
  if (!editingColumn.value) return
  const newName = renamingColValue.value.trim()
  if (newName && newName !== editingColumn.value) {
    emit('rename-column', { oldName: editingColumn.value, newName })
  }
  editingColumn.value = null
}
</script>

<template>
  <div class="glass-panel flex flex-col h-full overflow-hidden">
    <!-- Table Header Info -->
    <div class="flex-shrink-0 px-5 py-3 border-b border-surface-700/30 flex items-center justify-between no-print">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h2 class="text-sm font-semibold text-surface-200">Table Preview</h2>
        </div>
        
        <!-- Add Row Button -->
        <button 
          v-if="columns.length > 0"
          id="btn-add-row"
          @click="$emit('add-row')"
          class="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-accent-600 hover:bg-accent-500 text-white transition-all shadow-sm no-print"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Row
        </button>
      </div>
      <span v-if="columns.length > 0" class="text-xs text-surface-500 font-mono">
        {{ rows.length }} row{{ rows.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Table Content -->
    <div class="flex-1 overflow-auto no-print">
      <!-- Loading State -->
      <div v-if="isLoading && !columns.length" class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="spinner mx-auto mb-3"></div>
          <p class="text-sm text-surface-500">Loading dataset…</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!columns.length" class="flex items-center justify-center h-full">
        <div class="text-center px-6 max-w-md">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-800/60 border border-surface-700/40 flex items-center justify-center">
            <svg class="w-8 h-8 text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h3 class="text-base font-semibold text-surface-300 mb-1">No dataset loaded</h3>
          <p class="text-sm text-surface-500 leading-relaxed">
            Upload a <span class="text-accent-400 font-medium">.xlsx</span> or
            <span class="text-accent-400 font-medium">.csv</span> file to get started.
            Your data will be stored in a local SQLite database.
          </p>
        </div>
      </div>

      <!-- Data Table -->
      <table v-else class="data-table">
        <thead>
          <tr>
            <th class="w-16 text-center no-print">#</th>
            <th 
              v-for="col in columns" 
              :key="col" 
              class="relative group group/th transition-all duration-150"
              :class="{
                'opacity-30 border-2 border-dashed border-surface-600': draggedColumn === col,
                'bg-accent-600/30 border-l-4 border-l-accent-500': dragOverColumn === col
              }"
              draggable="true"
              @dragstart="handleDragStart($event, col)"
              @dragover="handleDragOver($event, col)"
              @dragenter="handleDragEnter($event, col)"
              @dragleave="handleDragLeave($event, col)"
              @drop="handleDrop($event, col)"
              @dragend="handleDragEnd"
            >
              <div class="flex items-center justify-between gap-2">
                <div v-if="editingColumn !== col" class="flex items-center gap-1.5 flex-1 min-w-0">
                  <div class="cursor-grab active:cursor-grabbing text-surface-500 hover:text-surface-300 transition-colors py-1 flex items-center no-print" title="Drag to reorder column">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 11.001 3.999A2 2 0 017 2zm0 6a2 2 0 11.001 3.999A2 2 0 017 8zm0 6a2 2 0 11.001 3.999A2 2 0 017 14zm6-12a2 2 0 11.001 3.999A2 2 0 0113 2zm0 6a2 2 0 11.001 3.999A2 2 0 0113 8zm0 6a2 2 0 11.001 3.999A2 2 0 0113 14z" />
                    </svg>
                  </div>
                  <div @dblclick="startRename(col)" class="flex-1 truncate cursor-text" title="Double click to rename">
                    {{ col }}
                  </div>
                </div>
                <input 
                  v-else 
                  v-model="renamingColValue" 
                  @blur="finishRename" 
                  @keyup.enter="finishRename" 
                  @keyup.esc="editingColumn = null" 
                  class="bg-surface-800 text-surface-100 px-1.5 py-0.5 rounded text-xs w-full border border-surface-600 focus:outline-none focus:border-accent-500 font-normal shadow-sm" 
                  autofocus
                />
                
                <button 
                  v-if="editingColumn !== col"
                  @click.stop="$emit('delete-column', col)" 
                  class="opacity-0 group-hover/th:opacity-100 text-surface-500 hover:text-danger-400 p-0.5 rounded hover:bg-surface-800 transition-all no-print"
                  title="Delete Column"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </th>
            <th class="w-56 bg-surface-900/40 no-print align-top pt-2.5">
              <div v-if="!isAddingColumn" @click="startAddingColumn" class="cursor-pointer text-accent-400 hover:text-accent-300 flex items-center gap-1.5 transition-colors group px-3 py-1">
                <div class="w-5 h-5 rounded-md bg-accent-500/10 flex items-center justify-center group-hover:bg-accent-500/20">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span class="text-xs font-semibold">Add Column</span>
              </div>
              <div v-else class="flex flex-col gap-2 p-2 bg-surface-900 border border-surface-700/60 rounded-lg shadow-xl w-48 mx-auto text-left">
                <div>
                  <label class="text-[10px] text-surface-400 block mb-1 font-semibold">Column Name</label>
                  <input 
                    ref="columnInputRef"
                    v-model="newColumnName" 
                    @keyup.enter="handleAddColumn" 
                    @keyup.esc="isAddingColumn = false"
                    class="bg-surface-800 text-surface-100 px-2 py-1 rounded text-xs w-full border border-surface-600 focus:outline-none focus:border-accent-500 shadow-sm font-normal" 
                    placeholder="Name" 
                  />
                </div>
                <div>
                  <label class="text-[10px] text-surface-400 block mb-1 font-semibold">Column Type</label>
                  <select 
                    v-model="newColumnType"
                    class="bg-surface-800 text-surface-200 px-2 py-1.5 rounded text-xs w-full border border-surface-600 focus:outline-none focus:border-accent-500 shadow-sm cursor-pointer font-normal"
                  >
                    <option value="text">📝 Text</option>
                    <option value="image">🖼️ Image</option>
                    <option value="directory">📁 Directory Path</option>
                    <option value="select">▼ Dropdown Select</option>
                  </select>
                </div>
                <div v-if="newColumnType === 'select'">
                  <label class="text-[10px] text-surface-400 block mb-1 font-semibold">Options (comma-separated)</label>
                  <input 
                    v-model="newColumnOptions"
                    @keyup.enter="handleAddColumn"
                    class="bg-surface-800 text-surface-100 px-2 py-1 rounded text-xs w-full border border-surface-600 focus:outline-none focus:border-accent-500 shadow-sm font-normal" 
                    placeholder="e.g. Yes, No, Maybe" 
                  />
                </div>
                <div class="flex items-center justify-end gap-1.5 mt-1">
                  <button @click="isAddingColumn = false" class="px-2 py-1 text-[10px] bg-surface-800 text-surface-400 hover:text-surface-200 border border-surface-700 rounded transition-colors">
                    Cancel
                  </button>
                  <button @click="handleAddColumn" class="px-2.5 py-1 text-[10px] bg-accent-600 hover:bg-accent-500 text-white rounded font-semibold transition-colors">
                    Create
                  </button>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0" class="no-print">
            <td :colspan="columns.length + 2" class="text-center py-8 text-surface-500 text-sm italic">
              No rows in this dataset. Click "Add Row" to start adding data.
            </td>
          </tr>
          <tr
            v-else
            v-for="(row, idx) in rows"
            :key="row._id"
            :class="{ 'selected-row': selectedRow?._id === row._id }"
            @click="$emit('select', row)"
          >
            <td class="text-center font-mono text-surface-500 text-xs no-print">{{ row._id }}</td>
            <td v-for="col in columns" :key="col" class="max-w-[200px] overflow-hidden">
              <!-- Image Preview -->
              <template v-if="columnTypes[col] === 'image'">
                <div class="flex items-center justify-center py-0.5">
                  <img 
                    v-if="row[col]" 
                    :src="row[col]" 
                    class="w-10 h-10 object-cover rounded border border-surface-700/50 hover:scale-[2.5] hover:z-20 transition-all duration-200 cursor-zoom-in" 
                    @click.stop="previewImage(row[col])" 
                  />
                  <span v-else class="text-[10px] text-surface-600 italic">No Image</span>
                </div>
              </template>
              
              <!-- Directory Link -->
              <template v-else-if="columnTypes[col] === 'directory'">
                <div v-if="row[col]" class="flex items-center gap-1.5 justify-center sm:justify-start">
                  <button 
                    @click.stop="triggerOpenDirectory(row[col])" 
                    class="text-xs text-accent-400 hover:text-accent-300 underline font-mono flex items-center gap-1 max-w-[170px] truncate"
                    title="Click to open this folder in your file manager"
                  >
                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span class="truncate">{{ getFolderName(row[col]) }}</span>
                  </button>
                </div>
                <span v-else class="text-xs text-surface-600 italic">-</span>
              </template>
              
              <!-- Text (default) -->
              <template v-else>
                <div class="truncate" :title="row[col]">
                  {{ row[col] }}
                </div>
              </template>
            </td>
            <td class="no-print"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Print Only Chunked View -->
    <div v-if="hasData" class="print-only-layout">
      <div 
        v-for="(chunk, pageIdx) in chunkedRows" 
        :key="pageIdx" 
        class="print-page"
      >
        <table class="data-table">
          <thead v-if="pageIdx === 0">
            <tr>
              <th v-for="col in activePrintColumns" :key="col">
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in chunk" :key="row._id">
              <td v-for="col in activePrintColumns" :key="col">
                <template v-if="columnTypes[col] === 'image'">
                  <img v-if="row[col]" :src="row[col]" class="w-12 h-12 object-cover rounded border border-surface-400 mx-auto" />
                  <span v-else class="text-xs text-gray-500 italic">No Image</span>
                </template>
                <template v-else-if="columnTypes[col] === 'directory'">
                  <span class="font-mono text-xs break-all">{{ row[col] || '-' }}</span>
                </template>
                <template v-else>
                  {{ row[col] }}
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="print-page-footer">
          {{ pageIdx + 1 }} - {{ chunkedRows.length }}
        </div>
      </div>
    </div>

    <!-- Image Lightbox Modal (no-print) -->
    <div v-if="lightboxUrl" @click="lightboxUrl = null" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm no-print cursor-zoom-out animate-fade-in">
      <img :src="lightboxUrl" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-surface-700/30" />
    </div>
  </div>
</template>
