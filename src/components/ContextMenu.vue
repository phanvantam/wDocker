<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="fixed inset-0 z-[100]"
      @click="close"
      @contextmenu.prevent="close"
    >
      <div
        ref="menuRef"
        class="absolute bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg shadow-2xl py-1 min-w-[180px] overflow-hidden"
        :style="{ top: pos.y + 'px', left: pos.x + 'px' }"
        @click.stop
      >
        <template v-for="(item, i) in items" :key="i">
          <div v-if="item.separator" class="border-t border-[var(--color-border)] my-1"></div>
          <button
            v-else
            @click="handleClick(item)"
            class="cursor-pointer w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors text-left"
            :class="item.danger
              ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
              : 'text-gray-300 hover:bg-[var(--color-surface-hover)]'"
          >
            <AppIcon v-if="item.icon" :name="item.icon" :size="14" class="pointer-events-none" />
            <span>{{ item.label }}</span>
            <span v-if="item.shortcut" class="ml-auto text-[10px] text-[var(--color-muted)]">{{ item.shortcut }}</span>
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import AppIcon from './AppIcon.vue';

export interface MenuItem {
  label?: string;
  icon?: string;
  action?: () => void;
  danger?: boolean;
  separator?: boolean;
  shortcut?: string;
}

const props = defineProps<{
  visible: boolean;
  x: number;
  y: number;
  items: MenuItem[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const menuRef = ref<HTMLElement>();
const pos = ref({ x: 0, y: 0 });

watch(() => [props.visible, props.x, props.y], async () => {
  if (!props.visible) return;
  pos.value = { x: props.x, y: props.y };
  await nextTick();
  if (menuRef.value) {
    const rect = menuRef.value.getBoundingClientRect();
    if (rect.right > window.innerWidth) pos.value.x = window.innerWidth - rect.width - 8;
    if (rect.bottom > window.innerHeight) pos.value.y = window.innerHeight - rect.height - 8;
  }
});

function close() {
  emit('close');
}

function handleClick(item: MenuItem) {
  item.action?.();
  close();
}
</script>
