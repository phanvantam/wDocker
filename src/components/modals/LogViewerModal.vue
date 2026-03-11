<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)] shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center">
              <AppIcon name="terminal" :size="16" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white uppercase tracking-widest">{{ fileName.replace('.conf', '') }} Logs</h3>
              <div class="flex gap-4 mt-1">
                <button @click="$emit('switchTab', 'access')" :class="activeTab === 'access' ? 'text-[var(--color-accent)] border-b border-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-white'" class="cursor-pointer text-[9px] font-bold uppercase tracking-widest transition pb-0.5">Access Log</button>
                <button @click="$emit('switchTab', 'error')" :class="activeTab === 'error' ? 'text-[var(--color-accent)] border-b border-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:text-white'" class="cursor-pointer text-[9px] font-bold uppercase tracking-widest transition pb-0.5">Error Log</button>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <button @click="$emit('refresh')" class="cursor-pointer text-[var(--color-muted)] hover:text-white transition flex items-center gap-1.5 text-xs">
              <AppIcon name="refresh" :size="14" /> Refresh
            </button>
            <button @click="$emit('close')" class="cursor-pointer text-[var(--color-muted)] hover:text-white"><AppIcon name="close" :size="18" /></button>
          </div>
        </div>

        <!-- Log Area -->
        <div class="flex-1 min-h-0 relative bg-black/50 overflow-auto p-6">
          <div v-if="refreshing" class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-10">
            <div class="animate-spin w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>
          </div>
          <pre class="font-mono text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap">{{ content }}</pre>
        </div>
        
        <!-- Footer -->
        <div class="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex justify-between items-center shrink-0">
          <span class="text-[9px] text-[var(--color-muted)] font-mono italic">Showing last 100 lines from host: ~/.wDocker/logs/router/</span>
          <button @click="$emit('close')" class="cursor-pointer px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue';

defineProps<{
  show: boolean;
  fileName: string;
  activeTab: 'access' | 'error';
  content: string;
  refreshing: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'refresh'): void;
  (e: 'switchTab', tab: 'access' | 'error'): void;
}>();
</script>
