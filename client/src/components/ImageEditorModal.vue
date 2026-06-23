<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  src: String,
  show: Boolean
})

const emit = defineEmits(['close', 'save'])

const canvasRef = ref(null)
const temperature = ref(0)
const imageObj = ref(null)

const cropRect = ref({ x: 0, y: 0, w: 0, h: 0 })
const isCropping = ref(false)
const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

function loadImage() {
  if (!props.src) return
  const img = new Image()
  img.onload = () => {
    imageObj.value = img
    cropRect.value = { x: 0, y: 0, w: img.width, h: img.height }
    drawCanvas()
  }
  img.src = props.src
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    temperature.value = 0
    isCropping.value = false
    loadImage()
  }
})

watch(temperature, () => {
  drawCanvas()
})

function drawCanvas() {
  const canvas = canvasRef.value
  const img = imageObj.value
  if (!canvas || !img) return
  
  const ctx = canvas.getContext('2d')
  canvas.width = img.width
  canvas.height = img.height
  
  ctx.drawImage(img, 0, 0)
  
  // Apply Temperature
  if (temperature.value != 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    const tempVal = parseInt(temperature.value) * 1.5
    
    for (let i = 0; i < data.length; i += 4) {
      if (tempVal > 0) {
        data[i] = Math.min(255, data[i] + tempVal)
        data[i+1] = Math.min(255, data[i+1] + (tempVal * 0.4))
        data[i+2] = Math.max(0, data[i+2] - (tempVal * 0.8))
      } else {
        data[i] = Math.max(0, data[i] + tempVal)
        data[i+1] = Math.min(255, data[i+1] - (tempVal * 0.2))
        data[i+2] = Math.min(255, data[i+2] - tempVal)
      }
    }
    ctx.putImageData(imageData, 0, 0)
  }

  // Dim outside crop rect
  if (isCropping.value) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(0, 0, canvas.width, cropRect.value.y)
    ctx.fillRect(0, cropRect.value.y + cropRect.value.h, canvas.width, canvas.height - (cropRect.value.y + cropRect.value.h))
    ctx.fillRect(0, cropRect.value.y, cropRect.value.x, cropRect.value.h)
    ctx.fillRect(cropRect.value.x + cropRect.value.w, cropRect.value.y, canvas.width - (cropRect.value.x + cropRect.value.w), cropRect.value.h)
    
    // Draw crop border
    ctx.strokeStyle = '#0ea5e9'
    ctx.lineWidth = 2
    ctx.strokeRect(cropRect.value.x, cropRect.value.y, cropRect.value.w, cropRect.value.h)
  }
}

function getMousePos(evt) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY
  }
}

function handleMouseDown(e) {
  if (!isCropping.value) return
  isDragging.value = true
  const pos = getMousePos(e)
  dragStart.value = pos
  cropRect.value = { x: pos.x, y: pos.y, w: 0, h: 0 }
  drawCanvas()
}

function handleMouseMove(e) {
  if (!isDragging.value || !isCropping.value) return
  const pos = getMousePos(e)
  
  cropRect.value = {
    x: Math.min(dragStart.value.x, pos.x),
    y: Math.min(dragStart.value.y, pos.y),
    w: Math.abs(pos.x - dragStart.value.x),
    h: Math.abs(pos.y - dragStart.value.y)
  }
  drawCanvas()
}

function handleMouseUp() {
  if (!isCropping.value) return
  isDragging.value = false
  if (cropRect.value.w === 0 || cropRect.value.h === 0) {
    if (imageObj.value) {
      cropRect.value = { x: 0, y: 0, w: imageObj.value.width, h: imageObj.value.height }
      drawCanvas()
    }
  }
}

function toggleCrop() {
  isCropping.value = !isCropping.value
  if (!isCropping.value && imageObj.value) {
    cropRect.value = { x: 0, y: 0, w: imageObj.value.width, h: imageObj.value.height }
  }
  drawCanvas()
}

function applyCrop() {
  if (cropRect.value.w === 0 || cropRect.value.h === 0) return
  
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  
  isCropping.value = false
  drawCanvas()
  
  const croppedData = ctx.getImageData(cropRect.value.x, cropRect.value.y, cropRect.value.w, cropRect.value.h)
  
  canvas.width = cropRect.value.w
  canvas.height = cropRect.value.h
  ctx.putImageData(croppedData, 0, 0)
  
  const img = new Image()
  img.onload = () => {
    imageObj.value = img
    cropRect.value = { x: 0, y: 0, w: img.width, h: img.height }
    temperature.value = 0
    drawCanvas()
  }
  img.src = canvas.toDataURL('image/png')
}

function saveEdit() {
  const oldCrop = isCropping.value
  isCropping.value = false
  drawCanvas()
  
  const dataUrl = canvasRef.value.toDataURL('image/png')
  emit('save', dataUrl)
  
  isCropping.value = oldCrop
}

function resetImage() {
  temperature.value = 0
  isCropping.value = false
  loadImage()
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
    <div class="glass-panel w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl border border-surface-700/50">
      
      <!-- Header -->
      <div class="px-6 py-4 border-b border-surface-800/80 flex items-center justify-between shrink-0">
        <h3 class="text-base font-semibold text-white flex items-center gap-2">
          <svg class="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Edit Image
        </h3>
        <button @click="emit('close')" class="text-surface-400 hover:text-surface-200 transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
        <!-- Canvas Container -->
        <div class="flex-1 flex items-center justify-center bg-surface-900/50 p-4 overflow-hidden">
          <canvas 
            ref="canvasRef" 
            class="max-w-full max-h-full object-contain cursor-crosshair shadow-lg rounded"
            @mousedown="handleMouseDown"
            @mousemove="handleMouseMove"
            @mouseup="handleMouseUp"
            @mouseleave="handleMouseUp"
          ></canvas>
        </div>

        <!-- Controls Sidebar -->
        <div class="w-full md:w-80 bg-surface-950/50 border-l border-surface-800/80 p-6 flex flex-col gap-6 overflow-y-auto shrink-0">
          
          <!-- Temperature Slider -->
          <div>
            <label class="flex justify-between items-center text-xs font-semibold text-surface-300 mb-2">
              Color Temperature
              <span class="text-accent-400 font-mono">{{ temperature }}</span>
            </label>
            <input 
              type="range" 
              min="-100" max="100" 
              v-model="temperature"
              class="w-full h-1.5 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-accent-500"
            />
            <div class="flex justify-between text-[10px] text-surface-500 mt-1">
              <span>Cooler</span>
              <span>Warmer</span>
            </div>
          </div>

          <!-- Crop Tools -->
          <div class="border-t border-surface-800/80 pt-6">
            <h4 class="text-xs font-semibold text-surface-300 mb-3">Crop Image</h4>
            <div class="flex gap-2">
              <button 
                @click="toggleCrop"
                class="flex-1 py-2 text-xs rounded transition-all duration-200 flex items-center justify-center gap-1.5 border"
                :class="isCropping ? 'bg-accent-500/10 border-accent-500/50 text-accent-400' : 'bg-surface-800/50 border-surface-700 hover:bg-surface-800 hover:text-white text-surface-400'"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
                {{ isCropping ? 'Cancel Crop' : 'Start Crop' }}
              </button>

              <button 
                v-if="isCropping"
                @click="applyCrop"
                class="flex-1 py-2 text-xs bg-accent-600 hover:bg-accent-500 text-white rounded transition-colors duration-200 flex items-center justify-center gap-1.5 shadow-lg shadow-accent-500/20"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Apply Crop
              </button>
            </div>
            <p v-if="isCropping" class="text-[10px] text-surface-500 mt-2">
              Click and drag on the image to select a region, then click "Apply Crop".
            </p>
          </div>

          <div class="mt-auto pt-6 border-t border-surface-800/80 flex flex-col gap-2">
            <button 
              @click="resetImage"
              class="w-full py-2.5 text-xs text-surface-400 hover:text-white bg-surface-800/50 hover:bg-surface-800 rounded transition-colors"
            >
              Reset All Edits
            </button>
            <button 
              @click="saveEdit"
              class="w-full py-2.5 text-xs font-semibold bg-accent-600 hover:bg-accent-500 text-white rounded transition-all duration-200 shadow-lg shadow-accent-500/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
