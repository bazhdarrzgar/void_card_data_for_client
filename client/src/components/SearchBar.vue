<script setup>
import { mapString } from '../utils/keyboardMap.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  totalCount: { type: Number, default: 0 },
  filteredCount: { type: Number, default: 0 },
  hasData: Boolean,
  currentLanguage: { type: String, default: 'en' },
  shortcut: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'assign-shortcut'])

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function onKeypress(e) {
  if (props.currentLanguage === 'en' || e.ctrlKey || e.altKey || e.metaKey) return;
  
  const mappedChar = mapString(e.key, props.currentLanguage);
  if (mappedChar !== e.key) {
    e.preventDefault();
    const el = e.target;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const newVal = val.substring(0, start) + mappedChar + val.substring(end);
    el.value = newVal;
    el.selectionStart = el.selectionEnd = start + mappedChar.length;
    emit('update:modelValue', newVal);
  }
}

function clear() {
  emit('update:modelValue', '')
}

import { ref } from 'vue'
const assigningShortcut = ref(false)

function handleShortcutKeydown(e) {
  e.preventDefault()
  e.stopPropagation()
  
  // ignore pure modifier keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

  let combo = []
  if (e.ctrlKey) combo.push('Ctrl')
  if (e.altKey) combo.push('Alt')
  if (e.shiftKey) combo.push('Shift')
  
  let keyStr = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key
  combo.push(keyStr)

  const finalCombo = combo.join('+')
  
  emit('assign-shortcut', { colName: '__search__', shortcut: finalCombo })
  assigningShortcut.value = false
}
</script>

<template>
  <div class="flex items-center gap-3">
    <div class="relative flex-1 max-w-md">
      <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <svg class="w-4 h-4 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        id="input-fuzzy-search"
        type="text"
        :value="modelValue"
        @input="onInput"
        @keypress="onKeypress"
        placeholder="Fuzzy Search — type to filter rows…"
        class="input-field pl-10 pr-10"
        :disabled="!hasData"
      />
      <button
        v-if="modelValue"
        class="absolute inset-y-0 right-0 pr-3 flex items-center text-surface-500 hover:text-surface-300 transition-colors"
        @click="clear"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    
    <!-- Shortcut assigner for search box -->
    <div class="flex items-center">
        <div v-if="assigningShortcut" class="text-[10px] text-accent-400 font-mono bg-accent-500/10 px-1 py-0.5 rounded outline-none" tabindex="0" @keydown="handleShortcutKeydown" @blur="assigningShortcut = false" :autofocus="true">
          Press Key...
        </div>
        <div v-else @click="assigningShortcut = true" class="cursor-pointer text-[10px] text-surface-500 font-mono hover:text-accent-400 px-1 rounded transition-colors" :class="{'bg-surface-800 border border-surface-700': shortcut}">
          {{ shortcut ? shortcut : '+ Search Shortcut' }}
        </div>
    </div>

    <!-- Filter Stats -->
    <div v-if="modelValue && hasData" class="text-xs text-surface-400 flex items-center gap-1.5 animate-fade-in">
      <span class="font-mono text-accent-400">{{ filteredCount }}</span>
      <span>/</span>
      <span class="font-mono">{{ totalCount }}</span>
      <span>matches</span>
    </div>
  </div>
</template>
