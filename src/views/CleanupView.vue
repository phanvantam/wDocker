<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white">Storage Manager</h2>
        <p class="text-xs text-[var(--color-muted)] mt-1">Manage source code size and clear application logs</p>
      </div>
      <button 
        @click="refreshStorage" 
        class="cursor-pointer flex items-center justify-center p-2 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition"
      >
        <AppIcon name="refresh" :size="16" />
      </button>
    </div>

    <!-- Usage Grid -->
    <div v-if="loading" class="flex items-center justify-center p-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent)]"></div>
    </div>
    
    <div v-else class="space-y-6">
       <!-- Router Logs -->
       <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-4">
             <div class="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
                <AppIcon name="server" :size="24" />
             </div>
             <div>
                <h3 class="text-sm font-bold text-white">Nginx Proxy Logs</h3>
                <p class="text-xs text-[var(--color-muted)] mt-1">Access logs & Error logs (~/.wDocker/logs/router)</p>
             </div>
          </div>
          <div class="flex items-center gap-6">
             <div class="text-right">
                <p class="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">Size</p>
                <p class="text-lg font-bold text-white">{{ formatSize(routerLogsSize) }}</p>
             </div>
             <button @click="confirmClean('router', '~/.wDocker/logs/router')" class="cursor-pointer px-4 py-2 bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white rounded-lg text-sm transition font-medium border border-[var(--color-danger)]/20">
                Clear Logs
             </button>
          </div>
       </div>

       <!-- Web Projects -->
       <div>
          <h3 class="text-sm font-semibold text-[var(--color-muted)] mb-3">Managed Web Projects</h3>
          <div v-if="projects.length === 0" class="text-center p-10 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] text-[var(--color-muted)] text-sm">
             No Web Projects found. Create one in the Web Projects tab.
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <div v-for="item in projects" :key="item.id" class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div class="flex items-center justify-between mb-3">
                   <div class="flex items-center gap-2">
                     <AppIcon name="template" :size="16" class="text-[var(--color-accent)]" />
                     <span class="text-sm font-bold text-white truncate max-w-[150px]" :title="item.name">{{ item.name }}</span>
                   </div>
                   <span class="text-[10px] bg-[var(--color-surface)] px-1.5 py-0.5 rounded text-[var(--color-muted)] font-mono">{{ item.domain }}</span>
                </div>
                <div class="space-y-2 mt-4">
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-[var(--color-muted)] flex items-center gap-1.5"><AppIcon name="folder" :size="12"/> Source Code</span>
                    <span class="text-white font-medium">{{ formatSize(item.sourceSize) }}</span>
                  </div>
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-[var(--color-muted)] flex items-center gap-1.5"><AppIcon name="file" :size="12"/> Log Files</span>
                    <span class="text-white font-medium">{{ formatSize(item.logSize) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="mt-4 pt-4 border-t border-[var(--color-border)] flex gap-2">
                <button 
                  @click="confirmClean(item.name + ' Logs', `~/.wDocker/logs/${item.safeName}`)"
                  class="cursor-pointer flex-1 py-1.5 border border-[var(--color-border)] hover:bg-[var(--color-warning)]/10 text-[11px] text-[var(--color-muted)] hover:text-white hover:border-[var(--color-warning)]/50 rounded-lg transition"
                >
                  Clear Logs
                </button>
              </div>
            </div>
          </div>
       </div>
    </div>

    <!-- Output Console -->
    <div v-if="pruneOutput" class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl overflow-hidden mt-6">
      <div class="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 flex items-center justify-between">
        <span class="text-[11px] font-bold text-white tracking-widest flex items-center gap-2">
           <span class="w-2 h-2 rounded-full bg-[var(--color-accent)]"></span>
           Action Result
        </span>
        <button @click="pruneOutput = ''" class="cursor-pointer text-[var(--color-muted)] hover:text-white transition">
           Close
        </button>
      </div>
      <pre class="p-6 text-[11px] font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-64 leading-relaxed bg-[#0f111a] m-0">{{ pruneOutput }}</pre>
    </div>

    <!-- Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] backdrop-blur-sm">
        <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-8 w-[420px] shadow-2xl relative overflow-hidden">
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
          
          <div class="w-16 h-16 bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-full flex items-center justify-center mx-auto mb-6">
            <AppIcon name="prune" :size="32" />
          </div>
          <h3 class="text-xl text-center font-bold text-white mb-2">Confirm Action</h3>
          <p class="text-center text-sm text-[var(--color-muted)] mb-8 leading-relaxed px-4">
            Are you sure you want to clear <strong class="text-white">{{ modalTargetName }}</strong>?<br/>
            This will empty all log files at <br/>
            <code class="text-[10px] mt-2 inline-block bg-[#0f111a] px-2 py-1 rounded">{{ pendingPath }}</code>
          </p>
          <div class="flex gap-4">
            <button @click="showModal = false" class="cursor-pointer flex-1 py-3.5 rounded-xl text-sm font-medium text-gray-300 border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-white transition">Cancel</button>
            <button @click="runClean" class="cursor-pointer flex-1 py-3.5 rounded-xl text-sm font-bold bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] text-white transition shadow-lg shadow-[var(--color-danger)]/20">Clear Logs</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from '../components/AppIcon.vue';

interface ProjectUsage {
  id: string;
  name: string;
  safeName: string;
  domain: string;
  path: string;
  sourceSize: number;
  logSize: number;
}

const loading = ref(false);
const pruneOutput = ref('');
const showModal = ref(false);

const routerLogsSize = ref(0);
const projects = ref<ProjectUsage[]>([]);

const pendingTarget = ref('');
const pendingPath = ref('');
const modalTargetName = ref('');

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function fetchUsage() {
  loading.value = true;
  projects.value = [];
  try {
     // 1. Get Nginx Logs Size
     routerLogsSize.value = await invoke<number>('get_dir_size', { path: '~/.wDocker/logs/router' }).catch(() => 0);

     // 2. Load LocalStorage Projects
     const data = localStorage.getItem('wdocker_projects');
     if (data) {
        const stored = JSON.parse(data);
        for (const p of stored) {
           const safeName = p.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
           
           const sourceSize = await invoke<number>('get_dir_size', { path: p.path }).catch(() => 0);
           const logSize = await invoke<number>('get_dir_size', { path: `~/.wDocker/logs/${safeName}` }).catch(() => 0);
           
           projects.value.push({
              id: p.id,
              name: p.name,
              safeName: safeName,
              domain: p.domain,
              path: p.path,
              sourceSize,
              logSize
           });
        }
     }
  } catch (e: any) {
    console.error('Failed to fetch usage:', e);
  } finally {
    loading.value = false;
  }
}

function refreshStorage() {
   fetchUsage();
}

function confirmClean(name: string, path: string) {
  pendingTarget.value = name;
  pendingPath.value = path;
  modalTargetName.value = name;
  showModal.value = true;
}

async function runClean() {
  showModal.value = false;
  loading.value = true;
  pruneOutput.value = '';
  try {
    await invoke('clean_dir_contents', { path: pendingPath.value });
    pruneOutput.value = `Successfully cleared contents of ${pendingPath.value}`;
    await fetchUsage();
  } catch (e: any) {
    pruneOutput.value = `Error deleting files: ${e}`;
  } finally {
    loading.value = false;
  }
}

onMounted(() => fetchUsage());
</script>
