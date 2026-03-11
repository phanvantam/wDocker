<template>
  <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-6 mb-6 flex items-center gap-6">
    <div class="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" 
         :class="statusColorClass">
      <AppIcon name="server" :size="32" />
    </div>
    <div class="flex-1">
      <h2 class="text-lg font-bold mb-1">Router Service</h2>
      <div class="flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <span class="w-2 h-2 rounded-full" :class="statusDotClass"></span>
        Status: <strong class="text-white capitalize">{{ isInstalled ? containerStatus : 'Not Installed' }}</strong>
      </div>
      <div v-if="isInstalled" class="text-sm text-[var(--color-muted)] mt-1">
        Service: <code class="bg-[var(--color-surface)] px-1 py-0.5 rounded border border-[var(--color-border)]">wdocker-nginx-proxy</code>
      </div>
    </div>
    <div class="bg-[var(--color-surface)] border border-[var(--color-border)] p-4 rounded-xl text-sm cursor-pointer group" @click="$emit('toggle-port-editor')">
      <div class="text-[var(--color-muted)] mb-1 flex items-center gap-1">
        Mapped Ports
        <AppIcon name="edit" :size="12" class="opacity-0 group-hover:opacity-100 transition" />
      </div>
      <div class="font-mono text-white">{{ httpPort }}:80, {{ httpsPort }}:443</div>
    </div>
  </div>

  <!-- Port Editor -->
  <div v-if="showPortEditor" class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-5 mb-6 transition-all">
    <h3 class="text-sm font-bold mb-4 flex items-center gap-2">
      <AppIcon name="edit" :size="16" class="text-[var(--color-accent)]" />
      Edit Port Mapping
    </h3>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">HTTP (Host → Container :80)</label>
        <input :value="httpPort" @input="$emit('update:httpPort', ($event.target as HTMLInputElement).value)" type="text" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--color-accent)] transition" placeholder="80" />
      </div>
      <div>
        <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">HTTPS (Host → Container :443)</label>
        <input :value="httpsPort" @input="$emit('update:httpsPort', ($event.target as HTMLInputElement).value)" type="text" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--color-accent)] transition" placeholder="443" />
      </div>
    </div>
    <div class="flex items-center justify-between mt-4">
      <p class="text-[10px] text-[var(--color-muted)]">Save to apply immediately (will redeploy the container).</p>
      <div class="flex gap-2">
        <button @click="$emit('cancel-port-editor')" class="cursor-pointer px-3 py-1.5 border border-[var(--color-border)] text-gray-300 text-xs rounded-lg hover:bg-[var(--color-surface-hover)] transition">
          Cancel
        </button>
        <button @click="$emit('save-ports')" :disabled="processing" class="cursor-pointer px-3 py-1.5 bg-[var(--color-accent)] text-white text-xs font-medium rounded-lg hover:bg-[var(--color-accent-hover)] transition disabled:opacity-50">
          Save & Redeploy
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps<{
  isInstalled: boolean;
  containerStatus: string;
  httpPort: string;
  httpsPort: string;
  showPortEditor: boolean;
  processing: boolean;
}>();

defineEmits<{
  (e: 'toggle-port-editor'): void;
  (e: 'cancel-port-editor'): void;
  (e: 'save-ports'): void;
  (e: 'update:httpPort', value: string): void;
  (e: 'update:httpsPort', value: string): void;
}>();

const statusColorClass = computed(() => {
  if (!props.isInstalled) return 'bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]';
  if (props.containerStatus === 'running') return 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20';
  return 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20';
});

const statusDotClass = computed(() => {
  if (!props.isInstalled) return 'bg-gray-500';
  if (props.containerStatus === 'running') return 'bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]';
  return 'bg-[var(--color-danger)]';
});
</script>
