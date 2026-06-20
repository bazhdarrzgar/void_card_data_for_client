<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  columns: { type: Array, default: () => [] },
  selectedRow: { type: Object, default: null },
  shortcuts: { type: Object, default: () => ({}) }, // { colName: "key" }
  currentLanguage: { type: String, default: 'en' }
})

import { mapString } from '../utils/keyboardMap.js'

const emit = defineEmits(['update', 'delete', 'deselect', 'rename-column', 'assign-shortcut'])

// Local copy of cell values for editing
const cellValues = ref({})

// Sync cell values when selectedRow changes
watch(
  () => props.selectedRow,
  (row) => {
    if (row) {
      const vals = {}
      for (const col of props.columns) {
        vals[col] = row[col] ?? ''
      }
      cellValues.value = vals
    } else {
      cellValues.value = {}
    }
  },
  { immediate: true, deep: true }
)

const hasChanges = computed(() => {
  if (!props.selectedRow) return false
  for (const col of props.columns) {
    if (String(cellValues.value[col] ?? '') !== String(props.selectedRow[col] ?? '')) {
      return true
    }
  }
  return false
})

function handleUpdate() {
  emit('update', { ...cellValues.value })
}

function handleDelete() {
  emit('delete')
}

function handleDeselect() {
  emit('deselect')
}

// Column Management State
const editingColumn = ref(null)
const editingColumnNewName = ref('')
const assigningShortcutFor = ref(null)

function startRename(col) {
  editingColumn.value = col
  editingColumnNewName.value = col
}

function confirmRename() {
  if (!editingColumnNewName.value.trim() || editingColumnNewName.value === editingColumn.value) {
    editingColumn.value = null
    return
  }
  emit('rename-column', { oldName: editingColumn.value, newName: editingColumnNewName.value.trim() })
  editingColumn.value = null
}

function startAssignShortcut(col) {
  assigningShortcutFor.value = col
}

function handleShortcutKeydown(e, col) {
  if (assigningShortcutFor.value !== col) return
  
  e.preventDefault()
  e.stopPropagation()
  
  // ignore pure modifier keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

  // Format combo (e.g., Ctrl+A)
  let combo = []
  if (e.ctrlKey) combo.push('Ctrl')
  if (e.altKey) combo.push('Alt')
  if (e.shiftKey) combo.push('Shift')
  
  // Handle spacebar explicitly
  let keyStr = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
  combo.push(keyStr)

  const finalCombo = combo.join('+')
  
  emit('assign-shortcut', { colName: col, shortcut: finalCombo })
  assigningShortcutFor.value = null
}

function onCellKeypress(e, col) {
  if (props.currentLanguage === 'en' || e.ctrlKey || e.altKey || e.metaKey) return;
  
  const mappedChar = mapString(e.key, props.currentLanguage);
  if (mappedChar !== e.key) {
    e.preventDefault();
    const el = e.target;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const newVal = val.substring(0, start) + mappedChar + val.substring(end);
    
    cellValues.value[col] = newVal;
    
    // Update input display and cursor manually via nextTick or inline
    el.value = newVal;
    el.selectionStart = el.selectionEnd = start + mappedChar.length;
  }
}
</script>

<template>
  <div class="glass-panel-sm overflow-visible transition-all duration-300" :class="selectedRow ? 'opacity-100' : 'max-h-14 opacity-70'">
    <!-- Header -->
    <div class="px-5 py-3 flex items-center justify-between border-b border-surface-700/30">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <h2 class="text-sm font-semibold text-surface-200">
          {{ selectedRow ? 'Edit Row' : 'Load the raw as cell' }}
        </h2>
        <span v-if="selectedRow" class="text-xs text-accent-400 font-mono bg-accent-500/10 px-2 py-0.5 rounded-md">
          ID: {{ selectedRow._id }}
        </span>
      </div>

      <div v-if="selectedRow" class="flex items-center gap-2">
        <span v-if="hasChanges" class="text-xs text-warn-400 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-warn-400"></span>
          Unsaved changes
        </span>
        <button class="btn-ghost text-xs py-1.5 px-3" @click="handleDeselect">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Deselect
        </button>
      </div>
    </div>

    <!-- Cell Inputs -->
    <div v-if="selectedRow" class="p-5 animate-slide-down">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        <div
          v-for="(col, idx) in columns"
          :key="col"
          class="group"
        >
          <div class="flex items-center justify-between mb-1.5">
            <label class="flex items-center gap-1.5 text-xs font-medium text-surface-400 group-focus-within:text-accent-400 transition-colors">
              <span v-if="editingColumn !== col">{{ col }}</span>
              <input v-else v-model="editingColumnNewName" @blur="confirmRename" @keyup.enter="confirmRename" class="bg-surface-800 text-accent-400 border border-accent-500/50 rounded px-1 py-0.5 w-full max-w-[100px] focus:outline-none" />
              
              <button v-if="editingColumn !== col" @click="startRename(col)" class="text-surface-600 hover:text-accent-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </label>
            
            <div class="flex items-center">
              <div v-if="assigningShortcutFor === col" class="text-[10px] text-accent-400 font-mono bg-accent-500/10 px-1 py-0.5 rounded outline-none" tabindex="0" @keydown="e => handleShortcutKeydown(e, col)" @blur="assigningShortcutFor = null" ref="assignInput" :autofocus="true">
                Press Key...
              </div>
              <div v-else @click="startAssignShortcut(col)" class="cursor-pointer text-[10px] text-surface-500 font-mono hover:text-accent-400 px-1 rounded transition-colors" :class="{'bg-surface-800 border border-surface-700': shortcuts[col]}">
                {{ shortcuts[col] ? shortcuts[col] : '+ shortcut' }}
              </div>
            </div>
          </div>
          
          <input
            v-model="cellValues[col]"
            :id="`cell-${col}`"
            type="text"
            @keypress="(e) => onCellKeypress(e, col)"
            class="input-field font-mono text-xs"
            :placeholder="`Enter ${col}…`"
          />
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-3 mt-4 pt-4 border-t border-surface-700/30">
        <button
          id="btn-update-row"
          class="btn-primary text-xs py-2"
          :disabled="!hasChanges"
          :class="{ 'opacity-40 cursor-not-allowed': !hasChanges }"
          @click="handleUpdate"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Update Row
        </button>
        <button
          id="btn-delete-row"
          class="btn-danger text-xs py-2"
          @click="handleDelete"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Row
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="px-5 py-2">
      <p class="text-xs text-surface-500">Click a row in the table below to load it for editing</p>
    </div>
  </div>
</template>

<style scoped>
[autofocus] {
  animation: pulse-border 1.5s infinite;
}
@keyframes pulse-border {
  0% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.4); }
  70% { box-shadow: 0 0 0 2px rgba(14, 165, 233, 0); }
  100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0); }
}
</style>
