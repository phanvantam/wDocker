<template>
  <div class="relative" ref="containerRef">
    <!-- Trigger Button -->
    <button 
      type="button"
      @click="toggle"
      class="cursor-pointer w-full bg-[var(--color-surface)] border rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition outline-none"
      :class="isOpen 
        ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/30' 
        : 'border-[var(--color-border)] hover:border-[var(--color-muted)]'"
    >
      <span :class="modelValue !== '' && modelValue !== null && modelValue !== undefined ? 'text-white' : 'text-[var(--color-muted)]'">
        {{ displayLabel }}
      </span>
      <svg 
        class="w-3.5 h-3.5 text-[var(--color-muted)] shrink-0 transition-transform duration-200" 
        :class="{ 'rotate-180': isOpen }"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-1 scale-[0.98]"
    >
      <div 
        v-if="isOpen" 
        class="absolute z-50 mt-1.5 w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
      >
        <div class="max-h-52 overflow-y-auto py-1 scrollbar-thin">
          <!-- Placeholder option -->
          <div
            v-if="placeholder"
            class="px-3 py-2 text-sm text-[var(--color-muted)] cursor-default italic"
          >
            {{ placeholder }}
          </div>

          <!-- Options -->
          <button
            v-for="opt in options" :key="String(opt.value)"
            type="button"
            @click="selectOption(opt.value)"
            class="cursor-pointer w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition"
            :class="opt.value === modelValue 
              ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' 
              : 'text-gray-300 hover:bg-white/5 hover:text-white'"
          >
            <span class="flex-1 truncate">{{ opt.label }}</span>
            <svg 
              v-if="opt.value === modelValue"
              class="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface SelectOption {
  value: string | number;
  label: string;
}

const props = defineProps<{
  modelValue: string | number;
  options: SelectOption[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const displayLabel = computed(() => {
  if (props.modelValue === '' || props.modelValue === null || props.modelValue === undefined) {
    return props.placeholder || 'Select...';
  }
  const found = props.options.find(o => o.value === props.modelValue);
  return found ? found.label : String(props.modelValue);
});

function toggle() {
  isOpen.value = !isOpen.value;
}

function selectOption(value: string | number) {
  emit('update:modelValue', value);
  isOpen.value = false;
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside));
onUnmounted(() => document.removeEventListener('click', handleClickOutside));
</script>
