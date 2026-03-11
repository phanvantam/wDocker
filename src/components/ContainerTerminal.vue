<template>
  <div class="flex flex-col h-full bg-[#0d0f17]">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <span class="text-xs font-medium text-white">Terminal — {{ name }}</span>
      <div class="flex items-center gap-2">
        <span v-if="state === 'connecting'" class="text-[10px] text-[var(--color-accent)] animate-pulse">Connecting...</span>
        <span v-else-if="state === 'connected'" class="text-[10px] text-[var(--color-success)]">Connected</span>
        <span v-else-if="state === 'error'" class="text-[10px] text-[var(--color-danger)]">Failed to connect</span>
        
        <button v-if="state === 'connected'" @click="reconnect" class="cursor-pointer p-1 rounded text-[var(--color-muted)] hover:text-white transition" title="Reconnect">
          <AppIcon name="refresh" :size="14" class="pointer-events-none" />
        </button>
      </div>
    </div>
    
    <!-- Terminal Container -->
    <div class="flex-1 w-full h-full relative overflow-hidden p-2" ref="terminalContainerRef"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Terminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import AppIcon from './AppIcon.vue';
import 'xterm/css/xterm.css';

const props = defineProps<{ containerId: string; name: string }>();

const terminalContainerRef = ref<HTMLElement | null>(null);
const state = ref<'loading' | 'connecting' | 'connected' | 'error' | 'disconnected'>('loading');

let term: Terminal | null = null;
let fitAddon: FitAddon | null = null;
let unlistenOutput: (() => void) | null = null;
let execId: string | null = null;
let resizeObserver: ResizeObserver | null = null;

async function initTerminal() {
  if (!terminalContainerRef.value) return;
  
  // Clean up existing
  await cleanup();

  // Initialize xterm
  term = new Terminal({
    cursorBlink: true,
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: 12,
    theme: {
      background: '#0d0f17',
      foreground: '#aeb3c4',
      cursor: '#aeb3c4',
      black: '#000000',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#bbbbbb',
    }
  });

  fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(terminalContainerRef.value);
  fitAddon.fit();

  // Handle Resize
  resizeObserver = new ResizeObserver(() => {
    if (fitAddon && term && execId) {
      fitAddon.fit();
      invoke('resize_terminal', { 
        execId, 
        cols: term.cols, 
        rows: term.rows 
      }).catch(console.error);
    }
  });
  resizeObserver.observe(terminalContainerRef.value);

  // Handle User Input
  term.onData(async (data: string) => {
    if (state.value !== 'connected' || !execId) return;
    try {
      // Send raw bytes as array to Rust
      const bytes = Array.from(new TextEncoder().encode(data));
      await invoke('write_terminal', { execId, data: bytes });
    } catch (e) {
      console.error('Failed to write to terminal:', e);
    }
  });

  await connectToDocker();
}

async function connectToDocker() {
  state.value = 'connecting';
  if (term) term.write('\x1b[33mConnecting to container shell...\x1b[0m\r\n');

  try {
    // Register listener FIRST using containerId (known upfront) to avoid race condition
    unlistenOutput = await listen<number[]>(`terminal-output-${props.containerId}`, (event: { payload: number[] }) => {
       if (term) {
         const str = new TextDecoder().decode(new Uint8Array(event.payload));
         term.write(str);
       }
    });

    // THEN start backend process - output will be captured by the listener above
    execId = await invoke<string>('start_terminal', { 
      containerId: props.containerId,
      cols: term?.cols || 80,
      rows: term?.rows || 24
    });

    state.value = 'connected';
  } catch (e) {
    console.error('Terminal connection failed:', e);
    state.value = 'error';
    if (term) term.write(`\x1b[31m\r\nConnection failed: ${e}\x1b[0m\r\n`);
  }
}

async function reconnect() {
  await initTerminal();
}

async function cleanup() {
  state.value = 'disconnected';
  if (resizeObserver) resizeObserver.disconnect();
  if (unlistenOutput) {
    unlistenOutput();
    unlistenOutput = null;
  }
  if (term) {
    term.dispose();
    term = null;
  }
  if (execId) {
    execId = null;
  }
}

watch(() => props.containerId, () => {
  initTerminal();
});

onMounted(() => {
  // Slight delay to ensure DOM is ready for terminal measurement
  setTimeout(initTerminal, 50);
});

onBeforeUnmount(() => {
  cleanup();
});
</script>
