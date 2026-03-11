<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
        <div class="flex items-center gap-3 text-red-500 mb-2">
          <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AppIcon name="close" :size="20" />
          </div>
          <h3 class="text-lg font-bold text-white">Delete Project?</h3>
        </div>
        
        <p class="text-sm text-[var(--color-muted)] leading-relaxed">
          Are you sure you want to remove <strong>{{ projectName }}</strong>?
          <br><br>
          <span class="text-xs italic bg-red-500/5 p-2 rounded block border border-red-500/10">Note: This only removes the wDocker configuration. Active containers will not be stopped.</span>
        </p>

        <div class="flex gap-3 pt-2">
          <button @click="$emit('close')" class="cursor-pointer flex-1 px-4 py-2 text-sm rounded-xl border border-[var(--color-border)] text-gray-300 hover:bg-[var(--color-surface-hover)] transition">
            Cancel
          </button>
          <button @click="$emit('confirm')" class="cursor-pointer flex-1 px-4 py-2 text-sm rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition shadow-lg shadow-red-500/20">
            Delete
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue';

defineProps<{ show: boolean; projectName: string }>();
defineEmits<{ (e: 'close'): void; (e: 'confirm'): void }>();
</script>
