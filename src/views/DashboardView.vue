<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white">Dashboard</h2>
        <p class="text-xs text-[var(--color-muted)] mt-1">Web Environment Overview</p>
      </div>
      <button @click="refreshAll" class="cursor-pointer flex items-center gap-1.5 bg-[var(--color-surface-alt)] hover:bg-[var(--color-surface-hover)] text-white text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] transition">
        <AppIcon name="refresh" :size="13" class="pointer-events-none" /> Refresh
      </button>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="stat in stats" :key="stat.label" class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-4 flex items-center gap-4 hover:border-[var(--color-border-hover)] transition group">
        <div class="p-3 rounded-lg bg-[var(--color-surface)] text-[var(--color-accent-hover)] group-hover:scale-110 transition-transform">
          <AppIcon :name="stat.icon" :size="24" />
        </div>
        <div>
          <p class="text-[10px] uppercase tracking-wider text-[var(--color-muted)] font-medium">{{ stat.label }}</p>
          <p class="text-2xl font-bold text-white leading-none mt-1">{{ stat.value }}</p>
          <p class="text-[10px] text-[var(--color-muted)] mt-1.5">{{ stat.subtext }}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Nginx Status Panel -->
      <div class="lg:col-span-2 space-y-4">
         <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl overflow-hidden p-6 flex items-center gap-6">
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" 
                 :class="nginxInstalled && nginxRunning ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20'">
              <AppIcon name="server" :size="32" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold mb-1 text-white">Nginx Proxy Router</h3>
              <div class="flex items-center gap-2 text-sm text-[var(--color-muted)]">
                <span class="w-2 h-2 rounded-full" :class="nginxInstalled && nginxRunning ? 'bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]' : 'bg-[var(--color-danger)]'"></span>
                Status: <strong class="text-white capitalize">{{ !nginxInstalled ? 'Not Installed' : (nginxRunning ? 'Active & Routing' : 'Stopped') }}</strong>
              </div>
            </div>
            <router-link to="/nginx" class="cursor-pointer px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm hover:bg-[var(--color-surface-hover)] transition">
               Manage Router
            </router-link>
         </div>

         <!-- DNS Notice -->
         <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-6">
            <div class="flex items-start gap-4">
               <div class="p-3 rounded-xl bg-blue-500/10 text-blue-400 mt-1">
                  <AppIcon name="info" :size="20" />
               </div>
               <div>
                  <h3 class="text-sm font-semibold text-white mb-1">Local DNS Mapping is crucial</h3>
                  <p class="text-xs text-[var(--color-muted)] mb-3 leading-relaxed">
                     To access your Web Projects via local domains (like <code>myapp.test</code>), you must add them to your host OS DNS settings to point to 127.0.0.1.
                  </p>
                  <router-link to="/dns" class="cursor-pointer text-xs text-[var(--color-accent)] hover:underline inline-flex items-center gap-1">
                     Open built-in DNS Manager <AppIcon name="play" :size="10" />
                  </router-link>
               </div>
            </div>
         </div>
      </div>

      <!-- Quick Actions / Quick Links -->
      <div class="space-y-6">
        <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-4">
          <h3 class="text-sm font-semibold text-white mb-4">Quick Links</h3>
          <div class="grid grid-cols-2 gap-2">
            <router-link to="/projects" class="cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition gap-2">
              <AppIcon name="template" :size="20" class="text-[var(--color-accent)]" />
              <span class="text-[11px] text-gray-300">Web Projects</span>
            </router-link>
            <router-link to="/settings" class="cursor-pointer flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition gap-2">
              <AppIcon name="settings" :size="20" class="text-[var(--color-muted)]" />
              <span class="text-[11px] text-gray-300">Settings</span>
            </router-link>
            <router-link to="/cleanup" class="cursor-pointer col-span-2 flex flex-col items-center justify-center p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] transition gap-2">
              <AppIcon name="prune" :size="20" class="text-[var(--color-warning)]" />
              <span class="text-[11px] text-gray-300">Storage Cleanup</span>
            </router-link>
          </div>
        </div>

        <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-4">
          <div class="flex items-center justify-between mb-4">
             <h3 class="text-sm font-semibold text-white">System Host</h3>
             <span class="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20">Active</span>
          </div>
          <div class="space-y-3">
             <div class="flex items-center justify-between text-[11px]">
               <span class="text-[var(--color-muted)]">Engine</span>
               <span class="text-white font-mono">{{ infoRaw?.ServerVersion || '—' }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
               <span class="text-[var(--color-muted)]">Cores</span>
               <span class="text-white font-mono">{{ infoRaw?.NCPU || 0 }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
               <span class="text-[var(--color-muted)]">Memory</span>
               <span class="text-white font-mono">{{ formatSize(infoRaw?.MemTotal || 0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from '../components/AppIcon.vue';

const loading = ref(true);
const containers = ref<any[]>([]);
const infoRaw = ref<any>(null);

const nginxInstalled = ref(false);
const nginxRunning = ref(false);

const localProjectsCount = ref(0);

const stats = computed(() => [
  {
    label: 'Web Projects Configured',
    value: localProjectsCount.value,
    icon: 'template',
    subtext: `Managed by wDocker`
  },
  {
    label: 'Active System Services',
    value: containers.value.filter(c => c.State === 'running').length,
    icon: 'server',
    subtext: `Background processes`
  },
  {
    label: 'Engine Memory Limit',
    value: formatSize(infoRaw.value?.MemTotal || 0),
    icon: 'layer',
    subtext: `Allocated capability`
  }
]);

function formatSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

async function refreshAll() {
  loading.value = true;
  try {
    const [c, info] = await Promise.all([
      invoke<any[]>('list_containers'),
      invoke<any>('get_docker_info')
    ]);
    containers.value = c;
    infoRaw.value = info;

    // Check Nginx Status
    try {
       const nginxInfo = await invoke<any>('inspect_container', { id: 'wdocker-nginx-proxy' });
       nginxInstalled.value = true;
       nginxRunning.value = nginxInfo.State?.Status === 'running';
    } catch {
       nginxInstalled.value = false;
       nginxRunning.value = false;
    }

    // Load projects count from localstorage MVP
    const data = localStorage.getItem('wdocker_projects');
    if (data) {
       localProjectsCount.value = JSON.parse(data).length;
    }

  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => refreshAll());
</script>
