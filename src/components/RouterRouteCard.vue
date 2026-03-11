<template>
  <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl overflow-hidden hover:border-[var(--color-accent)]/30 transition group flex flex-col">
    <div class="p-4 flex-1">
      <div class="flex items-center justify-between mb-3">
         <div class="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-accent)]">
           <AppIcon name="template" :size="16" />
         </div>
         <div class="flex gap-1">
           <button @click="$emit('view-logs')" class="cursor-pointer p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-muted)] hover:text-white transition" title="View Logs">
              <AppIcon name="terminal" :size="14" />
           </button>
           <button @click="$emit('edit-config')" class="cursor-pointer p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-muted)] hover:text-white transition" title="Edit Config">
              <AppIcon name="edit" :size="14" />
           </button>
         </div>
      </div>
      <h4 class="text-sm font-bold text-gray-100 truncate mb-1">{{ fileName.replace('.conf', '') }}</h4>
      <div class="font-mono text-[10px] text-[var(--color-muted)] truncate">{{ fileName }}</div>
    </div>
    <div class="px-4 py-2 bg-black/10 border-t border-[var(--color-border)]/30 flex items-center justify-between">
       <span class="text-[10px] flex items-center gap-1.5 text-[var(--color-success)]">
          <span class="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]"></span>
          Active
       </span>
       <button @click="$emit('reload')" :disabled="reloading" class="cursor-pointer text-[9px] font-bold text-[var(--color-accent)] hover:underline uppercase tracking-tight flex items-center gap-1 disabled:opacity-50">
          <div v-if="reloading" class="animate-spin w-2 h-2 border border-[var(--color-accent)] border-t-transparent rounded-full"></div>
          Reload Nginx
       </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue';

defineProps<{
  fileName: string;
  reloading: boolean;
}>();

defineEmits<{
  (e: 'view-logs'): void;
  (e: 'edit-config'): void;
  (e: 'reload'): void;
}>();
</script>
