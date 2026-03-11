<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-0 w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        <div class="px-6 py-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]">
           <h3 class="text-lg font-bold text-white flex items-center gap-2">
             <AppIcon :name="isEditing ? 'edit' : 'plus'" :size="20" class="text-[var(--color-accent)]" />
             {{ isEditing ? 'Edit' : 'New' }} wDocker Project
           </h3>
           <button @click="$emit('close')" class="cursor-pointer text-[var(--color-muted)] hover:text-white"><AppIcon name="close" :size="20" /></button>
        </div>

        <div class="p-6 overflow-y-auto space-y-5 flex-1">
          
          <!-- Project Base Info -->
          <div class="space-y-3">
            <div class="text-[10px] text-[var(--color-accent)] uppercase tracking-widest font-bold">Project Info</div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                 <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Project Name</label>
                 <input :value="wizard.name" @input="$emit('update:wizard', { ...wizard, name: ($event.target as HTMLInputElement).value }); $emit('auto-domain')" placeholder="my-laravel-app" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none" />
              </div>
              <div>
                 <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Primary Domain</label>
                 <input :value="wizard.domain" @input="$emit('update:wizard', { ...wizard, domain: ($event.target as HTMLInputElement).value })" placeholder="my-app.test" class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white focus:border-[var(--color-accent)] outline-none" />
              </div>
              <div>
                 <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Source Code Path</label>
                 <div class="flex items-center gap-1">
                    <input :value="wizard.path" @input="$emit('update:wizard', { ...wizard, path: ($event.target as HTMLInputElement).value })" placeholder="/path/to/source" class="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12px] text-white focus:border-[var(--color-accent)] outline-none font-mono" />
                    <button @click="$emit('browse')" class="shrink-0 p-2 bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-gray-300 hover:text-white rounded-lg hover:bg-[var(--color-border)] transition cursor-pointer">
                       <AppIcon name="folder" :size="14" />
                    </button>
                 </div>
              </div>
            </div>
          </div>

          <!-- Services (Dynamic) -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-[10px] text-[var(--color-accent)] uppercase tracking-widest font-bold">Services</div>
              <div class="flex gap-1">
                <button @click="$emit('add-preset', 'laravel')" class="cursor-pointer text-[10px] px-2 py-1 rounded bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 transition border border-orange-500/20">+ Laravel</button>
                <button @click="$emit('add-preset', 'php')" class="cursor-pointer text-[10px] px-2 py-1 rounded bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition border border-purple-500/20">+ PHP</button>
                <button @click="$emit('add-preset', 'node')" class="cursor-pointer text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-300 hover:bg-green-500/20 transition border border-green-500/20">+ Node</button>
              </div>
            </div>

            <ServiceConfigBlock 
              v-for="(svc, idx) in wizard.services" :key="idx"
              :service="svc"
              :index="idx"
              :php-extension-categories="phpExtensionCategories"
              :get-available-tags="getAvailableTagsForImage"
              :is-ext-incompatible="isExtIncompatible"
              :wizard-path="wizard.path"
              @toggle-expand="$emit('toggle-expand', idx)"
              @remove="$emit('remove-service', idx)"
              @open-library="$emit('open-library', idx)"
              @update-tag="(tag: string) => $emit('update-tag', idx, tag)"
            />

            <div v-if="wizard.services.length === 0" class="text-center py-8 text-[var(--color-muted)] text-xs border border-dashed border-[var(--color-border)] rounded-xl">
              Add a service to get started. Use the presets above or add a custom one.
            </div>
          </div>

          <!-- Info -->
          <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-[11px] text-blue-200 leading-relaxed flex gap-2">
             <AppIcon name="info" :size="20" class="text-blue-400 shrink-0" />
             <p>All services connect to <code>wdocker_network</code>. Set <code>VIRTUAL_HOST</code> env var per service to route domains via Nginx Router.</p>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex justify-between items-center">
           <span class="text-[11px] text-[var(--color-muted)]">{{ wizard.services.length }} service(s)</span>
           <div class="flex gap-3">
             <button @click="$emit('close')" class="cursor-pointer px-4 py-2 text-sm rounded-xl border border-[var(--color-border)] text-gray-300 hover:bg-[var(--color-surface-hover)] transition">Cancel</button>
             <button @click="$emit('save')" :disabled="!wizard.name || !wizard.path || wizard.services.length === 0" class="cursor-pointer px-4 py-2 text-sm rounded-xl bg-[var(--color-accent)] text-white font-medium hover:opacity-90 transition shadow-lg shadow-[var(--color-accent)]/20 disabled:opacity-50 disabled:cursor-not-allowed">
                Save & Generate
             </button>
           </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import AppIcon from '../AppIcon.vue';
import ServiceConfigBlock from '../ServiceConfigBlock.vue';
import type { ServiceConfig } from '../../composables/useDockerGenerator';

defineProps<{
  show: boolean;
  isEditing: boolean;
  wizard: {
    name: string;
    domain: string;
    path: string;
    services: ServiceConfig[];
  };
  phpExtensionCategories: any[];
  getAvailableTagsForImage: (imageName: string) => string[];
  isExtIncompatible: (ext: any, image: string) => boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'save'): void;
  (e: 'browse'): void;
  (e: 'auto-domain'): void;
  (e: 'add-preset', type: string): void;
  (e: 'toggle-expand', idx: number): void;
  (e: 'remove-service', idx: number): void;
  (e: 'open-library', idx: number): void;
  (e: 'update-tag', idx: number, tag: string): void;
  (e: 'update:wizard', wizard: any): void;
}>();
</script>
