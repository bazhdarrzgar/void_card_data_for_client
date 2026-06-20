<script setup>
defineProps({
  message: { type: String, required: true },
  type: { type: String, default: 'success' }, // success | error | info
})

const icons = {
  success: 'M5 13l4 4L19 7',
  error: 'M6 18L18 6M6 6l12 12',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

const colors = {
  success: 'border-success-500/40 bg-success-500/10 text-success-400',
  error: 'border-danger-500/40 bg-danger-500/10 text-danger-400',
  info: 'border-accent-500/40 bg-accent-500/10 text-accent-400',
}
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg min-w-72 animate-slide-up"
    :class="colors[type]"
  >
    <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" :d="icons[type]" />
    </svg>
    <span class="text-sm font-medium">{{ message }}</span>
  </div>
</template>
