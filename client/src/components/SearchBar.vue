<script setup>
import { mapString } from '../utils/keyboardMap.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  totalCount: { type: Number, default: 0 },
  filteredCount: { type: Number, default: 0 },
  hasData: Boolean,
  currentLanguage: { type: String, default: 'en' }
})

const emit = defineEmits(['update:modelValue'])

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

    <!-- Filter Stats -->
    <div v-if="modelValue && hasData" class="text-xs text-surface-400 flex items-center gap-1.5 animate-fade-in">
      <span class="font-mono text-accent-400">{{ filteredCount }}</span>
      <span>/</span>
      <span class="font-mono">{{ totalCount }}</span>
      <span>matches</span>
    </div>
  </div>
</template>
