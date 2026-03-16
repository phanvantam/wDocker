<template>
  <div 
    class="border rounded-xl overflow-hidden transition group flex flex-col"
    :class="isActive 
      ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)] hover:border-[var(--color-accent)]/30' 
      : 'bg-[var(--color-surface-alt)]/50 border-[var(--color-border)]/50 opacity-60'"
  >
    <div class="p-4 flex-1">
      <div class="flex items-center justify-between mb-3">
         <div class="w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center" :class="isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'">
           <AppIcon name="template" :size="16" />
         </div>
         <div class="flex gap-1">
           <button @click="$emit('view-logs')" class="cursor-pointer p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-muted)] hover:text-white transition" title="View Logs">
              <AppIcon name="terminal" :size="14" />
           </button>
           <button @click="$emit('edit-config')" class="cursor-pointer p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-muted)] hover:text-white transition" title="Edit Config">
              <AppIcon name="edit" :size="14" />
           </button>
           <button @click="confirmDelete" class="cursor-pointer p-1.5 rounded-lg hover:bg-[var(--color-danger)]/10 text-[var(--color-muted)] hover:text-[var(--color-danger)] transition" title="Delete Route">
              <AppIcon name="trash" :size="14" />
           </button>
         </div>
      </div>
      <h4 class="text-sm font-bold truncate mb-1" :class="isActive ? 'text-gray-100' : 'text-gray-400'">{{ displayName }}</h4>
      <div class="font-mono text-[10px] text-[var(--color-muted)] truncate">{{ fileName }}</div>
    </div>

    <!-- Confirm Delete Bar -->
    <div v-if="showConfirm" class="px-4 py-2 bg-[var(--color-danger)]/10 border-t border-[var(--color-danger)]/20 flex items-center justify-between">
      <span class="text-[10px] text-[var(--color-danger)] font-bold">Delete this route?</span>
      <div class="flex gap-2">
        <button @click="showConfirm = false" class="cursor-pointer text-[9px] font-bold text-[var(--color-muted)] hover:text-white uppercase tracking-tight">Cancel</button>
        <button @click="doDelete" class="cursor-pointer text-[9px] font-bold text-[var(--color-danger)] hover:underline uppercase tracking-tight">Confirm</button>
      </div>
    </div>

    <!-- Normal Footer -->
    <div v-else class="px-4 py-2 bg-black/10 border-t border-[var(--color-border)]/30 flex items-center justify-between">
       <span class="text-[10px] flex items-center gap-1.5" :class="isActive ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]'">
          <span class="w-1.5 h-1.5 rounded-full" :class="isActive ? 'bg-[var(--color-success)]' : 'bg-[var(--color-muted)]'"></span>
          {{ isActive ? 'Active' : 'Disabled' }}
       </span>
       <button 
         @click="$emit('toggle')" 
         class="cursor-pointer text-[9px] font-bold uppercase tracking-tight flex items-center gap-1"
         :class="isActive 
           ? 'text-[var(--color-muted)] hover:text-[var(--color-danger)]' 
           : 'text-[var(--color-accent)] hover:underline'"
       >
         {{ isActive ? 'Disable' : 'Enable' }}
       </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps<{
  fileName: string;
}>();

const emit = defineEmits<{
  (e: 'view-logs'): void;
  (e: 'edit-config'): void;
  (e: 'delete'): void;
  (e: 'toggle'): void;
}>();

const isActive = computed(() => !props.fileName.endsWith('.disabled'));
const displayName = computed(() => props.fileName.replace('.conf.disabled', '').replace('.conf', ''));

const showConfirm = ref(false);

function confirmDelete() {
  showConfirm.value = true;
}

function doDelete() {
  showConfirm.value = false;
  emit('delete');
}
</script>
