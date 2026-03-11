<template>
  <div 
    v-if="isOpen"
    class="flex flex-col border-t border-[var(--color-border)] bg-[var(--color-surface-alt)] shadow-2xl relative transition-[height] duration-75"
    :style="{ height: drawerHeight + 'px' }"
  >
    <!-- Resize Handle -->
    <div 
      class="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize hover:bg-[var(--color-accent)]/30 z-30 transition-colors"
      @mousedown="startResize"
    ></div>

    <!-- Header -->
    <div class="px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex justify-between items-center shrink-0">
      <div class="flex gap-4">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          @click="$emit('update:activeTab', tab.id)"
          class="cursor-pointer px-2 py-1 text-[11px] font-bold uppercase tracking-wider transition relative"
          :class="activeTab === tab.id ? 'text-white' : 'text-[var(--color-muted)] hover:text-gray-300'"
        >
          {{ tab.label }}
          <div v-if="activeTab === tab.id" class="absolute -bottom-2 left-0 right-0 h-0.5 bg-[var(--color-accent)]"></div>
        </button>
      </div>
      <div class="flex items-center gap-2">
        <slot name="header-extra"></slot>
        <button @click="$emit('close')" class="cursor-pointer p-1 hover:bg-[var(--color-surface-hover)] rounded transition text-[var(--color-muted)] hover:text-white">
          <AppIcon name="close" :size="14" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden relative">
      <slot :name="activeTab"></slot>
    </div>
  </div>

  <!-- Open Toggle (when closed) -->
  <button 
    v-else 
    @click="$emit('open')"
    class="cursor-pointer absolute bottom-6 right-6 p-4 bg-[var(--color-accent)] text-white rounded-2xl shadow-xl hover:bg-[var(--color-accent-hover)] transition-all transform hover:scale-110 z-40 border border-white/10"
  >
    <AppIcon :name="icon || 'dashboard'" :size="24" />
  </button>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps<{
  isOpen: boolean;
  activeTab: string;
  tabs: { id: string, label: string }[];
  icon?: string;
  initialHeight?: number;
}>();

const emit = defineEmits(['close', 'open', 'update:activeTab']);

const drawerHeight = ref(props.initialHeight || 300);
const isResizing = ref(false);

function startResize(_e: MouseEvent) {
  isResizing.value = true;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'ns-resize';
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return;
  // Calculate height from bottom of window
  const newHeight = window.innerHeight - e.clientY;
  if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
    drawerHeight.value = newHeight;
  }
}

function stopResize() {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}

onUnmounted(() => {
  stopResize();
});
</script>
