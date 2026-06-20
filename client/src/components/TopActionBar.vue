<script setup>
import { ref } from 'vue'

const props = defineProps({
  hasData: Boolean,
  isLoading: Boolean,
})

const emit = defineEmits(['upload', 'export', 'print'])

const fileInput = ref(null)
const isDragOver = ref(false)

function triggerUpload() {
  fileInput.value?.click()
}

function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (file) {
    emit('upload', file)
    event.target.value = ''
  }
}

function onDrop(event) {
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      emit('upload', file)
    }
  }
}
</script>

<template>
  <div
    class="glass-panel-sm px-5 py-4 flex items-center justify-between flex-wrap gap-3"
    :class="{ 'ring-2 ring-accent-500/40': isDragOver }"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
  >
    <div class="flex items-center gap-3">
      <!-- Upload Button -->
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        class="hidden"
        @change="onFileSelected"
      />
      <button
        id="btn-upload"
        class="btn-primary"
        :disabled="isLoading"
        @click="triggerUpload"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload (Xlsx, Csv)
      </button>

      <!-- Print Button -->
      <button
        class="btn-secondary text-xs h-9 px-4 flex items-center gap-2 border-surface-600 hover:border-surface-500 bg-surface-800 text-surface-200 rounded-lg"
        :disabled="!hasData || isLoading"
        :class="{ 'opacity-50 cursor-not-allowed': !hasData || isLoading }"
        @click="$emit('print')"
      >
        <svg class="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        <span class="hidden sm:inline">Print</span>
      </button>

      <!-- Export Button -->
      <button
        id="btn-export"
        class="btn-ghost border border-surface-600/50"
        :disabled="!hasData || isLoading"
        :class="{ 'opacity-40 cursor-not-allowed': !hasData }"
        @click="$emit('export')"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export as XLSX
      </button>
    </div>

    <!-- Drag & Drop Hint -->
    <div class="flex-1 text-right">
      <span class="text-xs text-surface-500 italic">
        {{ isDragOver ? 'Drop file here…' : 'or drag & drop a file anywhere on this bar' }}
      </span>
    </div>
  </div>
</template>
