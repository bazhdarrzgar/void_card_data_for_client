<script setup>
import { ref, watch, onMounted } from 'vue'
import { useApi } from '../composables/useApi'

const props = defineProps({
  folders: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'select-result'])

const api = useApi()
const query = ref('')
const selectedFolderId = ref('')
const results = ref([])
const isSearching = ref(false)
const inputRef = ref(null)

let searchTimeout = null

watch([query, selectedFolderId], () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!query.value.trim()) {
    results.value = []
    return
  }
  
  isSearching.value = true
  searchTimeout = setTimeout(async () => {
    try {
      const res = await api.globalSearch(query.value.trim(), selectedFolderId.value || null)
      results.value = res || []
    } catch (err) {
      console.error('Global search error', err)
      results.value = []
    } finally {
      isSearching.value = false
    }
  }, 300)
})

onMounted(() => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
})

function formatResult(row) {
  // Try to find the values that matched by looking at the query, 
  // but for simplicity we can just show a summary of the row
  const vals = Object.values(row).filter(v => v !== null && v !== '').join(' · ')
  return vals.length > 100 ? vals.substring(0, 100) + '...' : vals
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-surface-950/80 backdrop-blur-md animate-fade-in" @click.self="emit('close')">
    <div class="glass-panel w-full max-w-3xl flex flex-col max-h-[70vh] shadow-2xl border border-surface-700/50 rounded-xl overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 flex items-center gap-4 border-b border-surface-800 bg-surface-900/50">
        <svg class="w-6 h-6 text-accent-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          ref="inputRef"
          v-model="query"
          type="text" 
          placeholder="Global fuzzy search..." 
          class="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder-surface-500"
          @keydown.esc="emit('close')"
        />
        <select v-model="selectedFolderId" class="bg-surface-800/60 border border-surface-700/40 text-surface-300 text-sm rounded-lg focus:ring-accent-500 focus:border-accent-500 block px-3 py-2 outline-none cursor-pointer max-w-[200px]">
          <option value="">All Database</option>
          <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
        <button @click="emit('close')" class="text-surface-400 hover:text-surface-200 transition-colors p-1 bg-surface-800/50 rounded-md">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <!-- Results -->
      <div class="flex-1 overflow-y-auto p-2 bg-surface-950/50">
        <div v-if="isSearching" class="p-8 flex justify-center">
          <div class="spinner"></div>
        </div>
        <div v-else-if="query.trim() && results.length === 0" class="p-8 text-center text-surface-500">
          No results found for "{{ query }}"
        </div>
        <div v-else-if="!query.trim()" class="p-8 text-center text-surface-500 flex flex-col items-center gap-3">
          <svg class="w-12 h-12 text-surface-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p>Type to search across your datasets using fuzzy matching.</p>
        </div>
        
        <div v-else class="flex flex-col gap-1">
          <div 
            v-for="(res, idx) in results" 
            :key="idx"
            @click="emit('select-result', res)"
            class="p-3 hover:bg-surface-800/60 cursor-pointer rounded-lg border border-transparent hover:border-surface-700/50 transition-colors"
          >
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded">{{ res.datasetName }}</span>
                <span v-if="res.originalName && res.originalName !== res.datasetName" class="text-[10px] text-surface-500">{{ res.originalName }}</span>
              </div>
              <span class="text-[10px] text-surface-600 font-mono">Score: {{ res.score.toFixed(3) }}</span>
            </div>
            <div class="text-sm text-surface-300 truncate" dir="auto">
              {{ formatResult(res.row) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-2 bg-surface-900 border-t border-surface-800 flex justify-between items-center text-[11px] text-surface-500">
        <span>Fuzzy matching powered by Fuse.js</span>
        <span v-if="results.length > 0">Showing top {{ results.length }} results</span>
      </div>
    </div>
  </div>
</template>
