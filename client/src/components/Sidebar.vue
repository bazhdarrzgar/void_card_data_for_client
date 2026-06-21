<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  datasets: { type: Array, default: () => [] },
  folders: { type: Array, default: () => [] },
  currentDatasetId: { type: Number, default: null }
})

const emit = defineEmits([
  'select', 'delete', 'rename-dataset', 'move-dataset', 
  'create-folder', 'rename-folder', 'delete-folder', 'open-global-search'
])

const editingDatasetId = ref(null)
const editingDatasetName = ref('')
const editingFolderId = ref(null)
const editingFolderName = ref('')
const isCreatingFolder = ref(false)
const newFolderName = ref('')
const expandedFolders = ref(new Set())

// Organize datasets
const rootDatasets = computed(() => {
  return props.datasets.filter(ds => !ds.folderId)
})

const datasetsByFolder = computed(() => {
  const map = {}
  props.folders.forEach(f => {
    map[f.id] = props.datasets.filter(ds => ds.folderId === f.id)
  })
  return map
})

function toggleFolder(id) {
  const newSet = new Set(expandedFolders.value)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  expandedFolders.value = newSet
}

function startCreateFolder() {
  isCreatingFolder.value = true
  newFolderName.value = ''
}

function confirmCreateFolder() {
  if (newFolderName.value.trim()) {
    emit('create-folder', newFolderName.value.trim())
  }
  isCreatingFolder.value = false
}

function startRenameFolder(folder) {
  editingFolderId.value = folder.id
  editingFolderName.value = folder.name
}

function confirmRenameFolder() {
  if (editingFolderName.value.trim() && editingFolderId.value) {
    emit('rename-folder', { id: editingFolderId.value, name: editingFolderName.value.trim() })
  }
  editingFolderId.value = null
}

function startRenameDataset(ds) {
  editingDatasetId.value = ds.id
  editingDatasetName.value = ds.displayName
}

function confirmRenameDataset() {
  if (editingDatasetName.value.trim() && editingDatasetId.value) {
    emit('rename-dataset', { id: editingDatasetId.value, newName: editingDatasetName.value.trim() })
  }
  editingDatasetId.value = null
}

function handleDragStart(e, datasetId) {
  e.dataTransfer.setData('text/plain', datasetId)
  e.dataTransfer.effectAllowed = 'move'
}

function handleDropOnFolder(e, folderId) {
  const datasetId = e.dataTransfer.getData('text/plain')
  if (datasetId) {
    emit('move-dataset', { id: Number(datasetId), folderId })
  }
}

function handleDropOnRoot(e) {
  const datasetId = e.dataTransfer.getData('text/plain')
  if (datasetId) {
    emit('move-dataset', { id: Number(datasetId), folderId: null })
  }
}

function allowDrop(e) {
  e.preventDefault()
}
</script>

<template>
  <div class="w-72 flex-shrink-0 border-r border-surface-800/80 bg-surface-900/40 backdrop-blur-sm p-4 flex flex-col h-full overflow-hidden">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xs font-semibold text-surface-400 uppercase tracking-wider">Workspace</h2>
      <div class="flex items-center gap-1">
        <button 
          @click="emit('open-global-search')" 
          class="p-1 text-surface-400 hover:text-accent-400 hover:bg-surface-800 rounded transition-colors"
          title="Global Search"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button 
          @click="startCreateFolder" 
          class="p-1 text-surface-400 hover:text-accent-400 hover:bg-surface-800 rounded transition-colors"
          title="New Folder"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </div>
    
    <div v-if="isCreatingFolder" class="mb-3 px-2 py-1 bg-surface-800/50 rounded flex gap-2">
      <input 
        v-model="newFolderName" 
        @keyup.enter="confirmCreateFolder"
        @keyup.esc="isCreatingFolder = false"
        type="text" 
        class="bg-transparent border-none outline-none text-sm text-surface-200 flex-1 min-w-0" 
        placeholder="Folder name..."
        autofocus
      />
      <button @click="confirmCreateFolder" class="text-accent-400">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto flex flex-col gap-1 pr-1" @dragover="allowDrop" @drop.stop="handleDropOnRoot">
      <!-- Folders -->
      <div v-for="folder in folders" :key="'f-'+folder.id" class="flex flex-col gap-1 mb-1">
        <div 
          class="group flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:bg-surface-800/40 text-sm"
          @dragover="allowDrop"
          @drop.stop="handleDropOnFolder($event, folder.id)"
        >
          <div class="flex items-center gap-2 flex-1 overflow-hidden cursor-pointer" @click="toggleFolder(folder.id)">
            <svg 
              class="w-4 h-4 text-surface-500 transition-transform" 
              :class="{ 'rotate-90': expandedFolders.has(folder.id) }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <svg class="w-4 h-4 text-accent-500/70" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" />
            </svg>
            
            <div v-if="editingFolderId === folder.id" class="flex-1" @click.stop>
              <input 
                v-model="editingFolderName" 
                @keyup.enter="confirmRenameFolder"
                @keyup.esc="editingFolderId = null"
                @blur="confirmRenameFolder"
                type="text" 
                class="bg-surface-900 border border-accent-500 rounded px-1 w-full text-sm outline-none text-white" 
                autofocus
              />
            </div>
            <div v-else class="truncate font-medium text-surface-300 select-none">
              {{ folder.name }}
            </div>
          </div>
          
          <div class="opacity-0 group-hover:opacity-100 flex items-center text-surface-500 gap-1">
            <button @click.stop="startRenameFolder(folder)" class="p-1 hover:text-accent-400 hover:bg-surface-600/50 rounded" title="Rename Folder">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button @click.stop="emit('delete-folder', folder.id)" class="p-1 hover:text-danger-400 hover:bg-surface-600/50 rounded" title="Delete Folder">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        <!-- Folder contents -->
        <div v-show="expandedFolders.has(folder.id)" class="pl-6 flex flex-col gap-1">
          <div v-if="datasetsByFolder[folder.id]?.length === 0" class="text-[11px] text-surface-600 italic py-1 px-2">
            Empty folder
          </div>
          <div
            v-for="ds in datasetsByFolder[folder.id]"
            :key="ds.id"
            draggable="true"
            @dragstart="handleDragStart($event, ds.id)"
            class="group flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors border text-sm"
            :class="currentDatasetId === ds.id ? 'bg-accent-500/10 border-accent-500/30 text-accent-400' : 'bg-surface-800/30 border-transparent text-surface-400 hover:bg-surface-700/50'"
          >
            <div class="flex-1 overflow-hidden cursor-pointer" @click="emit('select', ds.id)">
              <div v-if="editingDatasetId === ds.id" @click.stop>
                <input 
                  v-model="editingDatasetName" 
                  @keyup.enter="confirmRenameDataset"
                  @keyup.esc="editingDatasetId = null"
                  @blur="confirmRenameDataset"
                  type="text" 
                  class="bg-surface-900 border border-accent-500 rounded px-1 w-full text-sm outline-none text-white" 
                  autofocus
                />
              </div>
              <div v-else class="truncate font-medium flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {{ ds.displayName }}
              </div>
              <div class="text-[10px] text-surface-400 mt-0.5 truncate" v-if="ds.originalName && ds.originalName !== ds.displayName">Original: {{ ds.originalName }}</div>
            </div>
            <div class="opacity-0 group-hover:opacity-100 flex items-center text-surface-500 gap-1 pl-1">
              <button @click.stop="startRenameDataset(ds)" class="p-1 hover:text-accent-400 hover:bg-surface-600/50 rounded" title="Rename Dataset">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button @click.stop="emit('delete', ds.id)" class="p-1 hover:text-danger-400 hover:bg-surface-600/50 rounded" title="Delete Dataset">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Root Datasets -->
      <div
        v-for="ds in rootDatasets"
        :key="ds.id"
        draggable="true"
        @dragstart="handleDragStart($event, ds.id)"
        class="group flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors border text-sm mb-1"
        :class="currentDatasetId === ds.id ? 'bg-accent-500/10 border-accent-500/30 text-accent-400' : 'bg-surface-800/50 border-transparent text-surface-300 hover:bg-surface-700/50'"
      >
        <div class="flex-1 overflow-hidden cursor-pointer" @click="emit('select', ds.id)">
          <div v-if="editingDatasetId === ds.id" @click.stop>
            <input 
              v-model="editingDatasetName" 
              @keyup.enter="confirmRenameDataset"
              @keyup.esc="editingDatasetId = null"
              @blur="confirmRenameDataset"
              type="text" 
              class="bg-surface-900 border border-accent-500 rounded px-1 w-full text-sm outline-none text-white" 
              autofocus
            />
          </div>
          <div v-else class="truncate font-medium flex items-center gap-1.5">
            <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {{ ds.displayName }}
          </div>
          <div class="text-[10px] text-surface-400 mt-0.5 truncate" v-if="ds.originalName && ds.originalName !== ds.displayName">Original: {{ ds.originalName }}</div>
        </div>
        <div class="opacity-0 group-hover:opacity-100 flex items-center text-surface-500 gap-1 pl-1">
          <button @click.stop="startRenameDataset(ds)" class="p-1 hover:text-accent-400 hover:bg-surface-600/50 rounded" title="Rename Dataset">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button @click.stop="emit('delete', ds.id)" class="p-1 hover:text-danger-400 hover:bg-surface-600/50 rounded" title="Delete Dataset">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      <div v-if="datasets.length === 0 && folders.length === 0" class="text-xs text-surface-500 italic mt-2 text-center">
        No datasets or folders. Upload an Excel file.
      </div>
      
      <!-- Drop zone helper -->
      <div class="flex-1 min-h-[50px] border-2 border-dashed border-transparent hover:border-surface-700/50 rounded-lg flex items-center justify-center mt-2 transition-colors">
        <span class="text-[10px] text-surface-600 font-medium">Drop outside folder to root</span>
      </div>
    </div>
  </div>
</template>
