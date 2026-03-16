<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <AppIcon name="plus" :size="18" class="text-[var(--color-accent)]" />
            Add Route
          </h3>
          <button @click="$emit('close')" class="cursor-pointer text-[var(--color-muted)] hover:text-white transition">
            <AppIcon name="close" :size="18" />
          </button>
        </div>

        <!-- Mode Tabs -->
        <div class="px-6 pt-4 flex gap-2">
          <button 
            @click="mode = 'manual'" 
            class="cursor-pointer px-4 py-2 text-xs font-bold rounded-lg transition"
            :class="mode === 'manual' 
              ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20' 
              : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-white border border-[var(--color-border)]'"
          >
            Manual
          </button>
          <button 
            @click="mode = 'project'" 
            class="cursor-pointer px-4 py-2 text-xs font-bold rounded-lg transition"
            :class="mode === 'project' 
              ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20' 
              : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-white border border-[var(--color-border)]'"
          >
            From Project
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4">
          <!-- Manual Mode -->
          <template v-if="mode === 'manual'">
            <div>
              <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Domain (server_name)</label>
              <input v-model="domain" placeholder="api.myapp.test" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none" />
            </div>
            <div>
              <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Route Name <span class="normal-case opacity-50">(config filename)</span></label>
              <input v-model="routeName" @input="routeNameTouched = true" placeholder="api-myapp" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none font-mono" />
            </div>
            <div>
              <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Upstream (container:port)</label>
              <input v-model="upstream" placeholder="wdocker-myapp-web:80" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-[var(--color-accent)] outline-none" />
              <p class="text-[10px] text-[var(--color-muted)] mt-1 opacity-70">Container name and port that Nginx should proxy to.</p>
            </div>
          </template>

          <!-- From Project Mode -->
          <template v-else>
            <div>
              <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Select Project</label>
              <AppSelect 
                :model-value="selectedProjectId" 
                @update:model-value="(v) => selectedProjectId = String(v)"
                :options="projectOptions"
                placeholder="-- Choose a project --"
              />
            </div>

            <div v-if="selectedProject">
              <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Select Service</label>
              <AppSelect 
                :model-value="selectedServiceIdx" 
                @update:model-value="(v) => selectedServiceIdx = Number(v)"
                :options="serviceOptions"
                placeholder="-- Choose a service --"
              />
            </div>

            <div v-if="selectedProject">
              <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">New Domain</label>
              <input v-model="domain" placeholder="api.myapp.test" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none" />
            </div>

            <div v-if="selectedProject">
              <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Route Name <span class="normal-case opacity-50">(config filename)</span></label>
              <input v-model="routeName" @input="routeNameTouched = true" placeholder="api-myapp" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none font-mono" />
            </div>

            <div v-if="selectedProject && upstream" class="bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 rounded-lg p-3">
              <div class="text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Upstream (auto-filled)</div>
              <div class="text-sm text-[var(--color-accent)] font-mono">{{ upstream }}</div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
          <span class="text-[10px] text-[var(--color-muted)]">{{ routeName ? routeName + '.conf' : '' }}</span>
          <div class="flex gap-3">
            <button @click="$emit('close')" class="cursor-pointer px-4 py-2 text-xs text-gray-400 hover:text-white transition rounded-xl border border-[var(--color-border)]">Cancel</button>
            <button 
              @click="createRoute" 
              :disabled="!canSave || saving"
              class="cursor-pointer bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-[var(--color-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div v-if="saving" class="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
              Create Route
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AppIcon from '../AppIcon.vue';
import AppSelect from '../AppSelect.vue';
import type { Project } from '../../composables/useDockerGenerator';

const STORAGE_KEY = 'wdocker_projects';

const props = defineProps<{
  show: boolean;
  saving: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'create', data: { routeName: string; domain: string; upstream: string }): void;
}>();

const mode = ref<'manual' | 'project'>('manual');
const routeName = ref('');
const routeNameTouched = ref(false);
const domain = ref('');
const upstream = ref('');
const selectedProjectId = ref('');
const selectedServiceIdx = ref(0);
const projects = ref<Project[]>([]);

const selectedProject = computed(() => {
  if (!selectedProjectId.value) return null;
  return projects.value.find(p => p.id === selectedProjectId.value) || null;
});

const canSave = computed(() => {
  return routeName.value.trim() && domain.value.trim() && upstream.value.trim();
});

const projectOptions = computed(() => 
  projects.value.map(p => ({
    value: p.id,
    label: `${p.name} (${p.domain || 'no domain'})`
  }))
);

const serviceOptions = computed(() => {
  if (!selectedProject.value) return [];
  return selectedProject.value.config.services.map((svc, idx) => ({
    value: idx,
    label: `${svc.name} — ${svc.image} (port ${svc.port || '80'})`
  }));
});

// Auto-generate route name from domain
watch(domain, (val) => {
  if (!routeNameTouched.value && val) {
    routeName.value = val
      .replace(/\.(test|local|localhost|dev)$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
});

// Auto-fill upstream when project/service selection changes
watch([selectedProject, selectedServiceIdx], () => {
  if (mode.value === 'project' && selectedProject.value) {
    const proj = selectedProject.value;
    const svc = proj.config.services[selectedServiceIdx.value];
    if (svc) {
      const safeName = proj.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      upstream.value = `wdocker-${safeName}-${svc.name}:${svc.port || '80'}`;
    }
  }
});

// Reset service index when project changes
watch(selectedProjectId, () => {
  selectedServiceIdx.value = 0;
});

// Reset fields when switching modes
watch(mode, () => {
  routeName.value = '';
  routeNameTouched.value = false;
  domain.value = '';
  upstream.value = '';
  selectedProjectId.value = '';
  selectedServiceIdx.value = 0;
});

// Load projects & reset state when modal opens
watch(() => props.show, (val) => {
  if (val) {
    mode.value = 'manual';
    routeName.value = '';
    routeNameTouched.value = false;
    domain.value = '';
    upstream.value = '';
    selectedProjectId.value = '';
    selectedServiceIdx.value = 0;

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      projects.value = data ? JSON.parse(data) : [];
    } catch {
      projects.value = [];
    }
  }
});

function createRoute() {
  if (!canSave.value) return;
  emit('create', {
    routeName: routeName.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    domain: domain.value.trim(),
    upstream: upstream.value.trim(),
  });
}
</script>
