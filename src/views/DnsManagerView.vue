<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="flex-none px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
      <div>
        <h1 class="text-xl font-bold flex items-center gap-2">
          <AppIcon name="link" :size="24" class="text-[var(--color-accent)]" />
          Local DNS Manager
        </h1>
        <p class="text-sm text-[var(--color-muted)] mt-1">
          Map your local domains (e.g., myapp.test) to 127.0.0.1. Modifies system hosts file.
        </p>
      </div>
      <div>
        <button
          @click="saveHosts"
          :disabled="isSaving || hostsContent === originalContent"
          class="cursor-pointer flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          <div v-if="isSaving" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          <AppIcon v-else name="save" :size="16" />
          {{ isSaving ? 'Applying...' : 'Save & Apply' }}
        </button>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 flex flex-col">
      <!-- Error / Success msg -->
      <div v-if="saveMessage" :class="saveError ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20' : 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20'" class="border px-4 py-3 rounded-xl text-sm mb-4 flex justify-between items-center">
        <span>{{ saveMessage }}</span>
        <button @click="saveMessage = ''" class="cursor-pointer hover:opacity-70"><AppIcon name="close" :size="16" /></button>
      </div>

      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
         <h3 class="text-sm font-bold mb-4 flex items-center justify-between">
           <span>Quick Map</span>
         </h3>
         <div class="flex gap-4 items-end">
            <div class="flex-1">
              <label class="block text-xs text-[var(--color-muted)] mb-1 uppercase tracking-wider font-semibold">IP Address</label>
              <input v-model="quickIp" type="text" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent)] transition" placeholder="127.0.0.1" />
            </div>
            <div class="flex-1">
              <label class="block text-xs text-[var(--color-muted)] mb-1 uppercase tracking-wider font-semibold">Domain Name</label>
              <input v-model="quickDomain" @keyup.enter="appendQuickMap" type="text" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--color-accent)] transition" placeholder="project.test" />
            </div>
            <button @click="appendQuickMap" class="cursor-pointer bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              Add Line
            </button>
         </div>
      </div>

      <div class="flex-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl flex flex-col relative overflow-hidden">
        <div class="px-4 py-2 bg-[var(--color-border)]/50 border-b border-[var(--color-border)] font-mono text-xs flex justify-between items-center">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
            System Hosts File
          </div>
          <span class="text-[var(--color-muted)]">Requires Administrator Privileges to Save</span>
        </div>
        
        <div v-if="isLoading" class="flex-1 flex items-center justify-center">
          <div class="animate-spin w-6 h-6 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>
        </div>
        
        <div v-else class="flex-1 flex overflow-hidden">
          <!-- Line Numbers -->
          <div ref="lineNumbersRef" class="w-12 bg-black/10 border-r border-[var(--color-border)] py-4 flex-shrink-0 text-right pr-3 select-none pointer-events-none overflow-hidden shrink-0 font-mono text-[11px] text-[var(--color-muted)]">
            <div v-for="n in (hostsContent || '').split('\n').length" :key="n" class="leading-relaxed">
              {{ n }}
            </div>
          </div>
          
          <textarea
            ref="editorRef"
            v-model="hostsContent"
            spellcheck="false"
            @scroll="syncScroll"
            @keydown="handleKeyDown"
            class="flex-1 bg-transparent resize-none p-4 font-mono text-[13px] text-gray-300 focus:outline-none leading-relaxed overflow-auto"
            placeholder="# Loading /etc/hosts..."
          ></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from '../components/AppIcon.vue';
import { useCodeEditor } from '../composables/useCodeEditor';

const isLoading = ref(true);
const isSaving = ref(false);
const saveError = ref(false);
const saveMessage = ref('');

const originalContent = ref('');
const hostsContent = ref('');

const quickIp = ref('127.0.0.1');
const quickDomain = ref('');

const { lineNumbersRef, editorRef, syncScroll, handleKeyDown: baseHandleKeyDown } = useCodeEditor(() => saveHosts());

function handleKeyDown(e: KeyboardEvent) {
  baseHandleKeyDown(e, hostsContent);
}

async function loadHosts() {
  isLoading.value = true;
  try {
    const content = await invoke<string>('read_hosts_file');
    originalContent.value = content;
    hostsContent.value = content;
  } catch (e: any) {
    saveError.value = true;
    saveMessage.value = 'Failed to load hosts file: ' + e?.toString();
  } finally {
    isLoading.value = false;
  }
}

function appendQuickMap() {
  if (!quickDomain.value || !quickIp.value) return;
  const newLine = `${quickIp.value.trim()}\t${quickDomain.value.trim()}\n`;
  
  // Create a clean append string without trailing multiple newlines
  if (!hostsContent.value.endsWith('\n')) {
     hostsContent.value += '\n';
  }
  hostsContent.value += newLine;
  
  quickDomain.value = ''; // Reset domain field
}

async function saveHosts() {
  isSaving.value = true;
  saveMessage.value = '';
  try {
    const result = await invoke<string>('write_hosts_file', { content: hostsContent.value });
    originalContent.value = hostsContent.value;
    saveError.value = false;
    saveMessage.value = 'Hosts file updated successfully! ' + result;
  } catch (e: any) {
    saveError.value = true;
    saveMessage.value = e?.toString() || 'Permission denied or failed to save.';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  loadHosts();
});
</script>
