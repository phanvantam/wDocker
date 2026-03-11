<template>
  <div class="flex flex-col h-full bg-[var(--color-surface)]">
    <div class="flex items-center px-4 py-2 border-b border-[var(--color-border)]">
      <span class="text-xs font-medium text-white">Info — {{ name }}</span>
    </div>
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="animate-spin w-5 h-5 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>
    </div>
    <div v-else-if="!info" class="flex-1 flex flex-col items-center justify-center text-[var(--color-muted)] p-6 text-center">
       <AppIcon name="terminal" :size="32" class="opacity-20 mb-3" />
       <p class="text-xs">Container not found or deployment failed.</p>
       <p class="text-[10px] mt-1 opacity-50">Please ensure the service is deployed and running.</p>
    </div>
    <div v-else class="flex-1 overflow-auto p-4 space-y-4">
      <!-- General -->
      <Section title="General">
        <Row label="ID" :value="short(info?.Id)" />
        <Row label="Name" :value="info?.Name?.replace('/', '')" />
        <Row label="Image" :value="info?.Config?.Image" />
        <Row label="Status" :value="info?.State?.Status" />
        <Row label="Platform" :value="info?.Platform" />
        <Row label="Created" :value="formatDate(info?.Created)" />
        <Row label="Started" :value="formatDate(info?.State?.StartedAt)" />
      </Section>
      <!-- Network -->
      <Section title="Network Settings">
        <template v-for="(net, name) in info?.NetworkSettings?.Networks" :key="name">
          <Row :label="'Network'" :value="String(name)" />
          <Row label="  IP Address" :value="net?.IPAddress" />
          <Row label="  Gateway" :value="net?.Gateway" />
          <Row label="  MAC" :value="net?.MacAddress" />
        </template>
      </Section>
      <!-- Ports -->
      <Section title="Port Bindings">
        <template v-for="(bindings, port) in info?.HostConfig?.PortBindings" :key="port">
          <Row :label="String(port)" :value="bindings?.map((b: any) => `${b.HostIp || '0.0.0.0'}:${b.HostPort}`).join(', ')" />
        </template>
      </Section>
      <!-- Mounts -->
      <Section title="Mounts">
        <div v-for="m in info?.Mounts" :key="m.Source" class="text-[10px] text-gray-400 py-0.5">
          <span class="text-[var(--color-accent)]">{{ m.Type }}</span> {{ m.Source }} → {{ m.Destination }} <span class="text-[var(--color-muted)]">({{ m.Mode || 'rw' }})</span>
        </div>
      </Section>
      <!-- Environment -->
      <Section title="Environment Variables">
        <div v-for="env in info?.Config?.Env" :key="env" class="text-[10px] font-mono text-gray-400 py-0.5 break-all">{{ env }}</div>
      </Section>
      <!-- Labels -->
      <Section title="Labels">
        <Row v-for="(val, key) in info?.Config?.Labels" :key="String(key)" :label="String(key)" :value="String(val)" />
      </Section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, defineComponent, h } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import AppIcon from './AppIcon.vue';

const props = defineProps<{ containerId: string; name: string }>();
const info = ref<any>(null);
const loading = ref(true);

async function fetchInfo() {
  loading.value = true;
  try {
    info.value = await invoke<any>('inspect_container', { id: props.containerId });
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function short(id?: string) { return id?.slice(0, 12) || ''; }
function formatDate(d?: string) {
  if (!d || d === '0001-01-01T00:00:00Z') return '—';
  return new Date(d).toLocaleString();
}

watch(() => props.containerId, () => fetchInfo());
onMounted(() => fetchInfo());

// Sub-components
const Section = defineComponent({
  props: { title: String },
  setup(props, { slots }) {
    return () => h('div', {}, [
      h('h4', { class: 'text-[10px] uppercase tracking-wider text-[var(--color-muted)] mb-1.5 font-medium' }, props.title),
      h('div', { class: 'bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)] px-3 py-2 space-y-0.5' }, slots.default?.()),
    ]);
  },
});

const Row = defineComponent({
  props: { label: String, value: String },
  setup(props) {
    return () => h('div', { class: 'flex justify-between text-[10px] py-0.5' }, [
      h('span', { class: 'text-[var(--color-muted)]' }, props.label),
      h('span', { class: 'text-gray-300 font-mono text-right max-w-[60%] truncate', title: props.value }, props.value || '—'),
    ]);
  },
});
</script>
