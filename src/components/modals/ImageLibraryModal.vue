<template>
  <Teleport to="body">
    <div v-if="serviceIdx !== null" class="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-6 w-[700px] shadow-2xl flex flex-col max-h-[80vh]">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <AppIcon name="template" :size="20" class="text-[var(--color-accent)]" />
            Docker Image Library
          </h3>
          <button @click="$emit('close')" class="cursor-pointer text-[var(--color-muted)] hover:text-white transition">
             <AppIcon name="close" :size="16" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
          <div v-for="cat in categories" :key="cat.name" class="space-y-3">
            <h4 class="text-[10px] text-[var(--color-muted)] uppercase tracking-widest font-bold">{{ cat.name }}</h4>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="img in cat.images" 
                   :key="img.name" 
                   @click="$emit('select', serviceIdx!, img.name, img.tags[0])"
                   class="cursor-pointer group p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:border-[var(--color-accent)]/50 transition relative overflow-hidden">
                <div class="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition">
                   <AppIcon name="play" :size="12" class="text-[var(--color-accent)]" />
                </div>
                <div class="text-xs font-bold text-white mb-1 group-hover:text-[var(--color-accent)] transition">{{ img.name }}</div>
                <div class="text-[10px] text-[var(--color-muted)] leading-relaxed">{{ img.description }}</div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <span v-for="tag in img.tags.slice(0, 3)" :key="tag" class="text-[8px] bg-[var(--color-surface-alt)] px-1 py-0.5 rounded text-gray-400">{{ tag }}</span>
                  <span v-if="img.tags.length > 3" class="text-[8px] text-gray-500">+{{ img.tags.length - 3 }} more</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 pt-4 border-t border-[var(--color-border)] text-center text-[10px] text-[var(--color-muted)]">
          Can't find what you need? You can always type the image name manually in the input field.
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue';

defineProps<{
  serviceIdx: number | null;
  categories: { name: string; images: { name: string; description: string; tags: string[] }[] }[];
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'select', idx: number, imageName: string, tag: string): void;
}>();
</script>
