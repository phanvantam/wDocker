<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-6 w-[600px] shadow-2xl">
        <h3 class="text-sm font-bold text-white mb-3">Generated System Configuration for: {{ title }}</h3>
        <pre class="bg-[#0f111a] border border-[var(--color-border)] rounded-lg p-4 text-[11px] text-gray-300 font-mono whitespace-pre-wrap overflow-y-auto max-h-[60vh] leading-relaxed">{{ content }}</pre>
        <div class="flex justify-end mt-4">
          <button @click="$emit('close')" class="cursor-pointer px-4 py-2 text-xs rounded-xl border border-[var(--color-border)] text-white hover:bg-[var(--color-surface-hover)] transition">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ show: boolean; title: string; content: string }>();
defineEmits<{ (e: 'close'): void }>();
</script>
