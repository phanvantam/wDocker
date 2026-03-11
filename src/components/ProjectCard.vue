<template>
  <div class="group bg-[var(--color-surface-alt)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 rounded-2xl p-5 transition-all hover:shadow-2xl hover:shadow-[var(--color-accent)]/5 shadow-lg flex flex-col h-full relative overflow-hidden">
    
    <!-- Proxy Status Ribbon -->
    <div v-if="project.config.services.some(s => s.isPublic)" 
         class="absolute top-0 right-0 px-8 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] text-[9px] font-bold uppercase tracking-wider rotate-45 translate-x-3 translate-y-1 pointer-events-none">
      Proxied
    </div>

    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)] group-hover:bg-[var(--color-accent)] group-hover:text-white transition-colors">
          <AppIcon name="code" :size="24" />
        </div>
        <div>
          <h3 class="font-bold text-base text-gray-100 group-hover:text-white">{{ project.name }}</h3>
          <div class="flex items-center gap-2 mt-1">
            <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass"></span>
            <span class="text-[10px] text-[var(--color-muted)] uppercase tracking-tight font-bold">{{ status || 'stopped' }}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1 group-hover:opacity-100 opacity-60 transition">
        <button @click="$emit('redeploy')" class="cursor-pointer p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-white hover:border-[var(--color-accent)] transition" title="Redeploy (Apply YAML & Build)">
          <AppIcon name="refresh" :size="14" />
        </button>
        <button @click="$emit('edit')" class="cursor-pointer p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-white hover:border-[var(--color-accent)] transition">
          <AppIcon name="edit" :size="14" />
        </button>
        <button @click="$emit('delete')" class="cursor-pointer p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition" title="Delete Project">
          <AppIcon name="close" :size="14" />
        </button>
      </div>
    </div>

    <div class="flex-1 space-y-3 mb-6">
      <div v-if="project.domain" class="bg-black/20 p-3 rounded-xl border border-[var(--color-border)] group-hover:border-[var(--color-accent)]/20 transition-colors">
        <div class="flex items-center justify-between mb-1">
          <span class="text-[9px] text-[var(--color-muted)] uppercase font-bold tracking-widest">Local Domain</span>
          <a :href="'http://' + project.domain" target="_blank" class="cursor-pointer text-[var(--color-accent)] hover:underline flex items-center gap-1 text-[10px] font-bold">
             Open <AppIcon name="terminal" :size="8" />
          </a>
        </div>
        <div class="font-mono text-xs text-white truncate">{{ project.domain }}</div>
      </div>
      
      <div class="grid grid-cols-2 gap-2">
        <div class="p-2 rounded-lg border border-[var(--color-border)] bg-black/10">
           <div class="text-[8px] text-[var(--color-muted)] uppercase font-bold mb-1">Services</div>
           <div class="text-xs font-bold text-white">{{ project.config.services.length }} Containers</div>
        </div>
        <div class="p-2 rounded-lg border border-[var(--color-border)] bg-black/10">
           <div class="text-[8px] text-[var(--color-muted)] uppercase font-bold mb-1">Status</div>
           <div class="text-xs font-bold group-hover:text-white transition" :class="isHealthy ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'">
              {{ isHealthy ? 'Active Stack' : 'Stopped' }}
           </div>
        </div>
      </div>
    </div>

    <!-- Bottom Actions -->
    <div class="flex items-center justify-between pt-4 border-t border-[var(--color-border)]/50">
       <button @click="$emit('inspect')" class="cursor-pointer text-[11px] font-bold text-[var(--color-muted)] hover:text-white transition flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5">
          <AppIcon name="terminal" :size="14" /> Inspect Stack
       </button>
       <button 
          v-if="status !== 'running'"
          @click="$emit('launch')" 
          class="cursor-pointer bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-[var(--color-accent)]/20"
       >
          Launch
       </button>
       <button 
          v-else
          @click="$emit('stop')" 
          class="cursor-pointer bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 px-4 py-1.5 rounded-lg text-xs font-bold transition"
       >
          Stop
       </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import type { Project } from '../composables/useDockerGenerator';

const props = defineProps<{
  project: Project;
  status: string;
}>();

defineEmits<{
  (e: 'edit'): void;
  (e: 'redeploy'): void;
  (e: 'inspect'): void;
  (e: 'launch'): void;
  (e: 'stop'): void;
  (e: 'delete'): void;
}>();

const isHealthy = computed(() => props.status === 'running');

const statusDotClass = computed(() => {
  if (props.status === 'running') return 'bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]';
  if (props.status === 'exited') return 'bg-[var(--color-danger)]';
  return 'bg-gray-600';
});
</script>
