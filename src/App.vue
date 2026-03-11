<template>
  <div class="flex h-screen bg-[var(--color-surface)] text-gray-200 font-sans overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-56 bg-[var(--color-surface-alt)] border-r border-[var(--color-border)] flex flex-col shrink-0">
      <!-- Logo -->
      <div class="px-4 py-4 border-b border-[var(--color-border)]">
        <h1 class="text-xl font-bold tracking-tight">
          <span class="text-[var(--color-accent)]">w</span>Docker
        </h1>
        <p class="text-[10px] text-[var(--color-muted)] mt-1 font-medium">Web Studio Environment</p>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 group relative"
          :class="$route.path === item.path
            ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent-hover)] font-bold'
            : 'text-gray-400 hover:bg-[var(--color-surface-hover)] hover:text-gray-200'"
        >
          <AppIcon :name="item.icon" :size="18" :class="$route.path === item.path ? 'text-[var(--color-accent)]' : 'text-gray-500 group-hover:text-gray-300'" />
          <span>{{ item.label }}</span>
          <span
            v-if="item.badge !== undefined && item.badge > 0"
            class="ml-auto text-[9px] bg-[var(--color-accent)] px-1.5 py-0.5 rounded-md text-white font-bold"
          >{{ item.badge }}</span>
        </router-link>
      </nav>

      <!-- Docker Status -->
      <div class="px-4 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)]/30">
        <div class="flex items-center justify-between mb-2">
           <span class="text-[9px] uppercase tracking-widest text-[var(--color-muted)] font-bold">Engine Status</span>
           <span class="w-2 h-2 rounded-full animate-pulse" :class="dockerConnected ? 'bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]' : 'bg-[var(--color-danger)] shadow-[0_0_8px_var(--color-danger)]'"></span>
        </div>
        <div class="text-[11px] font-medium truncate" :class="dockerConnected ? 'text-gray-300' : 'text-[var(--color-danger)]'">
           {{ dockerConnected ? 'Docker Connected' : 'Disconnected' }}
        </div>
      </div>
    </aside>

    <!-- Main Content Area Wrapper -->
    <div class="flex-1 flex flex-col min-w-0 bg-[var(--color-surface)] relative">
      <main class="flex-1 overflow-y-auto">
        <router-view />
      </main>
    </div>

    <!-- Connection Error Modal -->
    <Teleport to="body">
      <div v-if="!dockerConnected" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md">
        <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-8 w-[440px] shadow-2xl text-center">
          <div class="w-16 h-16 bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-full flex items-center justify-center mx-auto mb-6">
            <AppIcon name="close" :size="32" />
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Docker Disconnected</h2>
          <p class="text-sm text-[var(--color-muted)] mb-5">
            {{ dockerError || 'Unable to connect to Docker engine. Please ensure Docker Desktop is running.' }}
          </p>

          <!-- Docker Host Input -->
          <div class="mb-5 text-left">
            <label class="block text-[11px] text-[var(--color-muted)] mb-1.5 font-medium uppercase tracking-wider">Docker Host</label>
            <input
              v-model="modalDockerHost"
              type="text"
              placeholder="Leave empty for default, or enter custom host..."
              class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-accent)] transition"
            />
            <p class="text-[10px] text-[var(--color-muted)] mt-1.5 leading-relaxed">
              <span class="text-[var(--color-accent)]">macOS/Linux:</span> unix:///var/run/docker.sock<br/>
              <span class="text-[var(--color-accent)]">Windows:</span> npipe:////./pipe/docker_engine
            </p>
          </div>

          <div class="flex gap-2">
            <button 
              @click="saveHostAndRetry" 
              :disabled="retrying"
              class="flex-1 flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium py-2.5 rounded-xl transition shadow-lg shadow-[var(--color-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div v-if="retrying" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <AppIcon v-else name="refresh" :size="16" />
              {{ retrying ? 'Connecting...' : (modalDockerHost !== currentDockerHost ? 'Save & Reconnect' : 'Retry Connection') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from './components/AppIcon.vue';

const dockerConnected = ref(true);
const dockerError = ref('');
const modalDockerHost = ref('');
const currentDockerHost = ref('');
const retrying = ref(false);
let checkInterval: any = null;

const navItems = ref([
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', badge: undefined as number | undefined },
  { path: '/projects', label: 'Web Projects', icon: 'template', badge: undefined as number | undefined },
  { path: '/nginx', label: 'Router Service', icon: 'server', badge: undefined as number | undefined },
  { path: '/dns', label: 'Local DNS', icon: 'dns', badge: undefined as number | undefined },
  { path: '/cleanup', label: 'Storage Manager', icon: 'prune', badge: undefined as number | undefined },
  { path: '/settings', label: 'Settings', icon: 'settings', badge: undefined as number | undefined },
]);



async function checkDocker() {
  try {
    // Load current config to populate input
    const config = await invoke<any>('get_docker_config');
    currentDockerHost.value = config.docker_host || '';
    if (!dockerConnected.value) {
      modalDockerHost.value = currentDockerHost.value;
    }

    await invoke('get_docker_info');
    dockerConnected.value = true;
    dockerError.value = '';
    
    // Update Web Projects badge from local storage
    const projData = localStorage.getItem('wdocker_projects');
    if (projData) {
       navItems.value[1].badge = JSON.parse(projData).length;
    } else {
       navItems.value[1].badge = 0;
    }
  } catch (e: any) {
    dockerConnected.value = false;
    dockerError.value = e?.toString() || 'Connection failed';
  }
}

async function saveHostAndRetry() {
  retrying.value = true;
  // Save the new host if changed
  if (modalDockerHost.value !== currentDockerHost.value) {
    try {
      await invoke('update_docker_config', { config: { docker_host: modalDockerHost.value } });
      currentDockerHost.value = modalDockerHost.value;
    } catch (e: any) {
      dockerError.value = 'Failed to save config: ' + e?.toString();
      retrying.value = false;
      return;
    }
  }
  await checkDocker();
  retrying.value = false;
}

onMounted(() => {
  checkDocker();
  checkInterval = setInterval(checkDocker, 15000);
  window.addEventListener('storage', checkDocker);
  window.addEventListener('projects_updated', checkDocker);
});

onUnmounted(() => {
  if (checkInterval) clearInterval(checkInterval);
  window.removeEventListener('storage', checkDocker);
  window.removeEventListener('projects_updated', checkDocker);
});
</script>