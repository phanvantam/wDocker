<template>
  <div class="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
    <!-- Service Header -->
    <div class="px-4 py-2.5 border-b border-[var(--color-border)]/50 flex items-center justify-between bg-[var(--color-surface-alt)]/50">
      <div class="flex items-center gap-2">
        <input v-model="service.name" class="bg-transparent border-none text-sm font-bold text-white outline-none w-32" placeholder="service-name" />
        <span class="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] uppercase font-semibold">{{ service.type }}</span>
      </div>
       <div class="flex items-center gap-1">
        <button @click="$emit('toggle-expand')" class="cursor-pointer p-1 text-[var(--color-muted)] hover:text-white transition">
          <AppIcon :name="service.expanded ? 'chevron-up' : 'chevron-down'" :size="14" />
        </button>
        <button @click="$emit('remove')" class="cursor-pointer p-1 text-red-400 hover:bg-red-500/10 rounded transition">
          <AppIcon name="close" :size="12" />
        </button>
      </div>
    </div>

    <div v-if="service.expanded" class="p-4 space-y-3">
      <!-- Row 1: Image + Command -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold">Docker Image</label>
            <button @click="$emit('open-library')" class="cursor-pointer text-[10px] text-[var(--color-accent)] hover:underline flex items-center gap-1">
              <AppIcon name="template" :size="10" />
              Library
            </button>
          </div>
          <div class="flex flex-col gap-2">
            <input v-model="service.image" readonly placeholder="php:8.2-apache" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-gray-400 font-mono outline-none cursor-not-allowed" />
            
            <div v-if="getAvailableTags(service.image).length > 0" class="flex flex-wrap gap-1">
                 <span class="text-[9px] text-[var(--color-muted)] w-full mb-0.5">Recommended Tags:</span>
                 <button 
                    v-for="tag in getAvailableTags(service.image)" 
                    :key="tag" 
                    @click="$emit('update-tag', tag)"
                    class="cursor-pointer px-1.5 py-0.5 rounded text-[9px] border transition"
                    :class="service.image.endsWith(':' + tag) ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] text-gray-400 hover:border-gray-500'"
                 >
                   {{ tag }}
                 </button>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Command (optional)</label>
          <input v-model="service.command" placeholder="e.g. npm run dev" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-[var(--color-accent)] outline-none" />
        </div>
      </div>

      <!-- Row 2: Working Dir + Routing Toggle -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Working Dir</label>
          <input v-model="service.workingDir" placeholder="/var/www/html" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-[var(--color-accent)] outline-none" />
        </div>
        <div>
            <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Public Router Access</label>
            <div class="flex items-center justify-between bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 h-[34px]">
              <span class="text-[10px] font-medium" :class="service.isPublic ? 'text-[var(--color-accent)]' : 'text-gray-400'">{{ service.isPublic ? 'Enabled' : 'Disabled' }}</span>
              <button @click="service.isPublic = !service.isPublic" class="cursor-pointer w-9 h-5 rounded-full transition-colors relative" :class="service.isPublic ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'">
                <span class="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform" :class="service.isPublic ? 'translate-x-4' : 'translate-x-0'"></span>
              </button>
            </div>
        </div>
      </div>

      <div v-if="service.isPublic">
        <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Virtual Port (Exposed inside Docker)</label>
        <input v-model="service.port" placeholder="80" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-[var(--color-accent)] outline-none" />
      </div>

      <!-- Volumes -->
      <div>
        <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Volumes (one per line, host:container)</label>
        <textarea v-model="service.volumes" rows="2" :placeholder="wizardPath + ':/var/www/html\n~/.wDocker/logs:/var/log'" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-[var(--color-accent)] outline-none resize-none leading-relaxed"></textarea>
      </div>

      <!-- Environment Variables -->
      <div>
        <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Environment Variables (KEY=value, one per line)</label>
        <textarea v-model="service.environment" rows="2" placeholder="VIRTUAL_HOST=myapp.test&#10;APP_ENV=local" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-[var(--color-accent)] outline-none resize-none leading-relaxed"></textarea>
      </div>

      <!-- PHP extras -->
      <div v-if="service.type === 'php' || service.type === 'laravel'" class="space-y-3 border-t border-[var(--color-border)]/50 pt-3">
        <div class="text-[10px] text-purple-400 uppercase tracking-widest font-bold">PHP Options</div>
        <div class="space-y-4">
          <div v-for="cat in phpExtensionCategories" :key="cat.name">
            <label class="block text-[9px] text-[var(--color-muted)] uppercase tracking-wider font-bold mb-1.5 opacity-80">{{ cat.name }}</label>
            <div class="grid grid-cols-4 gap-1.5">
              <label v-for="ext in cat.extensions" :key="ext.name" 
                     class="flex items-center gap-1.5 text-[10px] bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded px-2 py-1 cursor-pointer hover:border-[var(--color-accent)]/50 transition whitespace-nowrap overflow-hidden text-ellipsis relative group" 
                     :class="[
                       service.phpExtensions?.includes(ext.name) ? 'border-purple-500/50 bg-purple-500/5' : '',
                       isExtIncompatible(ext, service.image) ? 'opacity-50 grayscale select-none' : 'text-gray-300'
                     ]" 
                     :title="isExtIncompatible(ext, service.image) ? `Requires PHP >= ${ext.minPhp}` : ext.name">
                <input type="checkbox" :value="ext.name" v-model="service.phpExtensions" :disabled="isExtIncompatible(ext, service.image)" class="accent-purple-500 w-3 h-3 shrink-0" />
                {{ ext.name }}
                <div v-if="ext.minPhp" class="ml-auto opacity-0 group-hover:opacity-100 transition text-[8px] text-purple-400 font-bold">
                    >{{ ext.minPhp }}
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-center justify-between bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-3 py-2">
            <span class="text-xs text-white">Composer</span>
            <button @click="service.installComposer = !service.installComposer" class="cursor-pointer w-9 h-5 rounded-full transition-colors relative" :class="service.installComposer ? 'bg-purple-500' : 'bg-[var(--color-border)]'">
              <span class="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow transition-transform" :class="service.installComposer ? 'translate-x-4' : 'translate-x-0'"></span>
            </button>
          </div>
          <div>
            <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Document Root</label>
            <input v-model="service.documentRoot" placeholder="/var/www/html" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-[var(--color-accent)] outline-none" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Custom php.ini</label>
          <textarea v-model="service.phpIni" rows="2" placeholder="upload_max_filesize = 64M&#10;memory_limit = 256M" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-[var(--color-accent)] outline-none resize-none leading-relaxed"></textarea>
        </div>
      </div>

      <!-- Custom Nginx Proxy Config -->
      <div v-if="service.isPublic">
        <label class="block text-[10px] text-[var(--color-muted)] uppercase tracking-wider font-semibold mb-1">Custom Nginx Proxy Config (inserted into server block)</label>
        <textarea v-model="service.customNginx" rows="3" placeholder="# Example: Custom block for Laravel /index.php&#10;location ~ \.php$ {&#10;    # ...&#10;}" class="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 text-[11px] text-white font-mono focus:border-[var(--color-accent)] outline-none resize-none leading-relaxed"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from './AppIcon.vue';
import type { ServiceConfig } from '../composables/useDockerGenerator';

defineProps<{
  service: ServiceConfig;
  index: number;
  phpExtensionCategories: any[];
  getAvailableTags: (imageName: string) => string[];
  isExtIncompatible: (ext: any, image: string) => boolean;
  wizardPath: string;
}>();

defineEmits<{
  (e: 'toggle-expand'): void;
  (e: 'remove'): void;
  (e: 'open-library'): void;
  (e: 'update-tag', tag: string): void;
}>();
</script>
