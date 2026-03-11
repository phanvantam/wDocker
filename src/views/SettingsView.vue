<template>
  <div class="p-6 space-y-6">
    <div>
      <h2 class="text-xl font-semibold text-white">Settings</h2>
      <p class="text-xs text-[var(--color-muted)] mt-1">Configure application and wDocker engine connection</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Docker Connection Settings -->
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl overflow-hidden self-start">
        <div class="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 flex items-center gap-2">
          <AppIcon name="docker" :size="16" class="text-[var(--color-accent)]" />
          <h3 class="text-sm font-semibold text-white">Docker Engine Connection</h3>
        </div>
        <div class="p-4 space-y-4">
          <div class="space-y-1.5">
            <label class="text-[11px] font-medium text-[var(--color-muted)] uppercase tracking-wider">Connection Host</label>
            <div class="relative">
              <input 
                v-model="config.docker_host" 
                type="text" 
                placeholder="unix:///var/run/docker.sock"
                class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition"
              />
            </div>
            <p class="text-[10px] text-[var(--color-muted)]">
              Unix socket path (e.g. <code>unix:///var/run/docker.sock</code>) or TCP URL (e.g. <code>tcp://localhost:2375</code>).
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button 
              @click="saveSettings" 
              :disabled="saving"
              class="cursor-pointer bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {{ saving ? 'Saving...' : 'Save Settings' }}
            </button>
            <span v-if="saveStatus" :class="saveStatus.type === 'success' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'" class="text-[11px]">
              {{ saveStatus.message }}
            </span>
          </div>
        </div>
      </div>

      <!-- Help / Information -->
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-4 self-start">
        <h3 class="text-sm font-semibold text-white mb-3">Connection Guide</h3>
        <div class="space-y-4 text-xs text-gray-300 leading-relaxed">
          <div>
            <p class="font-medium text-white mb-1">MacOS / Linux (Default)</p>
            <p class="font-mono bg-[var(--color-surface)] p-1.5 rounded text-[10px]">unix:///var/run/docker.sock</p>
          </div>
          <div>
            <p class="font-medium text-white mb-1">Windows (WSL2)</p>
            <p class="font-mono bg-[var(--color-surface)] p-1.5 rounded text-[10px]">npipe:////./pipe/docker_engine</p>
          </div>
          <div>
            <p class="font-medium text-white mb-1">Remote Host</p>
            <p class="font-mono bg-[var(--color-surface)] p-1.5 rounded text-[10px]">tcp://192.168.1.100:2375</p>
          </div>
          <div class="pt-2">
             <div class="flex items-start gap-2 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/20 p-3 rounded-lg">
               <AppIcon name="info" :size="14" class="text-[var(--color-accent)] mt-0.5" />
               <p class="text-[10px] text-[var(--color-muted)]">
                 Changing the connection host will cause wDocker to attempt to reconnect immediately. If the connection fails, the app will show a blocking error screen.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from '../components/AppIcon.vue';

const config = ref({
  docker_host: ''
});

const saving = ref(false);
const saveStatus = ref<{ message: string, type: 'success' | 'error' } | null>(null);

async function fetchSettings() {
  try {
    config.value = await invoke('get_docker_config');
  } catch (e) {
    console.error('Failed to fetch settings:', e);
  }
}

async function saveSettings() {
  saving.value = true;
  saveStatus.value = null;
  try {
    await invoke('update_docker_config', { config: config.value });
    saveStatus.value = { message: 'Settings saved successfully!', type: 'success' };
    
    // Automatic clear status
    setTimeout(() => {
      saveStatus.value = null;
    }, 3000);
  } catch (e: any) {
    saveStatus.value = { message: `Error: ${e}`, type: 'error' };
  } finally {
    saving.value = false;
  }
}

onMounted(() => fetchSettings());
</script>
