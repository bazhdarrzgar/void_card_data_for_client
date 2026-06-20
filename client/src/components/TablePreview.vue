<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  selectedRow: { type: Object, default: null },
  isLoading: Boolean,
})

const emit = defineEmits(['select', 'add-row', 'add-column', 'rename-column', 'delete-column'])

const hasData = computed(() => props.columns.length > 0 && props.rows.length > 0)

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
const columnInputRef = ref(null)

const editingColumn = ref(null)
const renamingColValue = ref('')

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
  emit('add-column', newColumnName.value.trim())
  newColumnName.value = ''
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
            <th v-for="col in columns" :key="col" class="relative group group/th">
              <div class="flex items-center justify-between gap-2">
                <div v-if="editingColumn !== col" @dblclick="startRename(col)" class="flex-1 truncate cursor-text" title="Double click to rename">
                  {{ col }}
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
            <th class="w-40 bg-surface-900/40 no-print">
              <div v-if="!isAddingColumn" @click="startAddingColumn" class="cursor-pointer text-accent-400 hover:text-accent-300 flex items-center gap-1.5 transition-colors group">
                <div class="w-5 h-5 rounded-md bg-accent-500/10 flex items-center justify-center group-hover:bg-accent-500/20">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                Add Column
              </div>
              <div v-else class="flex items-center gap-1.5">
                <input 
                  ref="columnInputRef"
                  v-model="newColumnName" 
                  @keyup.enter="handleAddColumn" 
                  @keyup.esc="isAddingColumn = false"
                  class="bg-surface-800 text-surface-100 px-2 py-1 rounded text-xs w-24 border border-surface-600 focus:outline-none focus:border-accent-500 shadow-sm" 
                  placeholder="Name" 
                />
                <button @click="handleAddColumn" class="w-6 h-6 flex items-center justify-center bg-success-500/20 text-success-400 hover:bg-success-500/30 rounded transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button @click="isAddingColumn = false" class="w-6 h-6 flex items-center justify-center bg-surface-700 text-surface-300 hover:bg-surface-600 rounded transition-colors">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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
            <td v-for="col in columns" :key="col" :title="row[col]">
              {{ row[col] }}
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
              <th v-for="col in columns" :key="col">
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in chunk" :key="row._id">
              <td v-for="col in columns" :key="col">
                {{ row[col] }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="print-page-footer">
          {{ pageIdx + 1 }} - {{ chunkedRows.length }}
        </div>
      </div>
    </div>
  </div>
</template>
