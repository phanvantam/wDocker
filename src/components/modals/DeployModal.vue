<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-6 w-[600px] shadow-2xl flex flex-col">
        <h3 class="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <AppIcon name="play" :size="16" class="text-[var(--color-accent)]" />
          Deploying {{ targetName }}...
        </h3>
        <pre class="bg-[#0f111a] border border-[var(--color-border)] rounded-lg p-4 text-[11px] text-gray-300 font-mono whitespace-pre-wrap overflow-y-auto h-64 mt-2 leading-relaxed">{{ logs }}</pre>
        <div class="flex gap-2 justify-end mt-4">
          <button 
            v-if="launching"
            disabled
            class="px-5 py-2 text-xs rounded-xl bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] flex items-center gap-2"
          >
            <div class="animate-spin w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>
            Deploying Stack...
          </button>
          <button 
            v-else
            @click="$emit('close')" 
            class="px-5 py-2 text-xs rounded-xl bg-[var(--color-accent)] text-white font-medium hover:opacity-90 transition shadow-lg shadow-[var(--color-accent)]/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue';

defineProps<{ show: boolean; targetName: string; logs: string; launching: boolean }>();
defineEmits<{ (e: 'close'): void }>();
</script>
