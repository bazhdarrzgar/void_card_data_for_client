<script setup>
defineProps({
  datasets: { type: Array, default: () => [] },
  currentDatasetId: { type: Number, default: null }
})

const emit = defineEmits(['select', 'delete'])
</script>

<template>
  <div class="w-64 flex-shrink-0 border-r border-surface-800/80 bg-surface-900/40 backdrop-blur-sm p-4 overflow-y-auto">
    <h2 class="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-4">Uploaded Datasets</h2>
    
    <div v-if="datasets.length === 0" class="text-xs text-surface-500 italic">
      No datasets uploaded yet.
    </div>
    
    <div class="flex flex-col gap-2">
      <div
        v-for="ds in datasets"
        :key="ds.id"
        class="group flex items-center justify-between px-3 py-2 rounded-lg transition-colors border text-sm"
        :class="currentDatasetId === ds.id ? 'bg-accent-500/10 border-accent-500/30 text-accent-400' : 'bg-surface-800/50 border-transparent text-surface-300 hover:bg-surface-700/50'"
      >
        <div class="flex-1 overflow-hidden cursor-pointer" @click="emit('select', ds.id)">
          <div class="truncate font-medium">{{ ds.displayName }}</div>
          <div class="text-[10px] opacity-60 mt-1 truncate">Table: {{ ds.tableName }}</div>
        </div>
        <button 
          @click.stop="emit('delete', ds.id)" 
          class="opacity-0 group-hover:opacity-100 p-1.5 text-surface-500 hover:text-danger-400 hover:bg-surface-600/50 rounded transition-all"
          title="Delete Dataset"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
