<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)] shrink-0">
          <div>
            <h3 class="text-sm font-bold text-white uppercase tracking-widest">{{ fileName }}</h3>
            <p class="text-[10px] text-[var(--color-muted)] mt-0.5">Edit router configuration for this project</p>
          </div>
          <button @click="$emit('close')" class="cursor-pointer text-[var(--color-muted)] hover:text-white"><AppIcon name="close" :size="18" /></button>
        </div>

        <!-- Editor Area -->
        <div class="flex-1 min-h-0 relative bg-black/30 flex overflow-hidden">
          <!-- Line Numbers -->
          <div ref="lineNumbersRef" class="w-12 bg-black/20 border-r border-[var(--color-border)] py-8 flex-shrink-0 text-right pr-3 select-none pointer-events-none overflow-hidden shrink-0">
            <div v-for="n in (modelValue || '').split('\n').length" :key="n" class="text-[11px] leading-relaxed text-[var(--color-muted)] font-mono">
              {{ n }}
            </div>
          </div>

          <!-- Editor -->
          <textarea 
            ref="editorRef"
            :value="modelValue"
            @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
            spellcheck="false"
            @scroll="syncScroll"
            @keydown="(e: KeyboardEvent) => handleKeyDown(e, { get value() { return modelValue }, set value(v) { $emit('update:modelValue', v) } })"
            class="flex-1 h-full p-8 font-mono text-[13px] text-gray-300 resize-none focus:outline-none leading-relaxed overflow-auto"
          ></textarea>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3 bg-[var(--color-surface)] shrink-0">
          <button @click="$emit('close')" class="cursor-pointer px-4 py-2 text-xs text-gray-400 hover:text-white transition">Cancel</button>
          <button @click="$emit('save')" :disabled="saving" class="cursor-pointer bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-6 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-[var(--color-accent)]/20">
            <div v-if="saving" class="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
            Save & Reload Nginx
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue';
import { useCodeEditor } from '../../composables/useCodeEditor';

defineProps<{
  show: boolean;
  fileName: string;
  modelValue: string;
  saving: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save'): void;
  (e: 'update:modelValue', value: string): void;
}>();

const { lineNumbersRef, editorRef, syncScroll, handleKeyDown } = useCodeEditor(() => emit('save'));
</script>
