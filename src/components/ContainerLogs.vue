<template>
  <div class="flex flex-col h-full bg-[var(--color-surface)]">
    <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
      <span class="text-xs font-medium text-white">Logs — {{ name }}</span>
      <div class="flex gap-1">
        <button @click="fetchLogs" class="cursor-pointer p-1 rounded text-[var(--color-muted)] hover:text-white transition"><AppIcon name="refresh" :size="14" class="pointer-events-none" /></button>
        <button @click="logs = ''" class="cursor-pointer p-1 rounded text-[var(--color-muted)] hover:text-white transition"><AppIcon name="trash" :size="14" class="pointer-events-none" /></button>
      </div>
    </div>
    <pre class="flex-1 overflow-auto p-3 text-[11px] font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">{{ logs || 'No logs available.' }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ containerId: string; name: string }>();
const logs = ref('');

async function fetchLogs() {
  try {
    logs.value = await invoke<string>('container_logs', { id: props.containerId, tail: '500' });
  } catch (e: any) {
    logs.value = `Error: ${e}`;
  }
}

watch(() => props.containerId, () => fetchLogs());
onMounted(() => fetchLogs());
</script>
