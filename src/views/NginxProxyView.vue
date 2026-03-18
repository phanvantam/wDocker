<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header class="flex-none px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
      <div>
        <h1 class="text-xl font-bold flex items-center gap-2">
          <AppIcon name="server" :size="24" class="text-[var(--color-accent)]" />
          Router Service
        </h1>
        <p class="text-sm text-[var(--color-muted)] mt-1">
          Centralized proxy router for all your wDocker projects. Binds to port 80/443.
        </p>
      </div>
      <div>
        <button
          v-if="!isInstalled"
          @click="installNginx"
          :disabled="isProcessing"
          class="cursor-pointer flex items-center gap-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
        >
          <div v-if="isProcessing" class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
          <AppIcon v-else name="play" :size="16" />
          {{ isProcessing ? 'Installing...' : 'Install & Start Proxy' }}
        </button>

        <div v-else class="flex gap-2">
          <button
            v-if="containerStatus === 'running'"
            @click="stopNginx"
            :disabled="isProcessing"
            class="cursor-pointer flex items-center gap-2 bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            <div v-if="isProcessing" class="animate-spin w-3 h-3 border-2 border-[var(--color-danger)] border-t-transparent rounded-full"></div>
            <AppIcon v-else name="stop" :size="16" /> Stop
          </button>
          <button
            v-else
            @click="startNginx"
            :disabled="isProcessing"
            class="cursor-pointer flex items-center gap-2 bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/20 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
          >
            <div v-if="isProcessing" class="animate-spin w-3 h-3 border-2 border-[var(--color-success)] border-t-transparent rounded-full"></div>
            <AppIcon v-else name="play" :size="16" /> Start
          </button>

          <button
            @click="redeployNginx"
            :disabled="isProcessing"
            class="cursor-pointer flex items-center gap-2 bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50"
            title="Stop, remove, and redeploy with current config"
          >
            <div v-if="isProcessing" class="animate-spin w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>
            <AppIcon v-else name="restart" :size="16" /> Redeploy
          </button>
          
          <button
            @click="checkStatus"
            :disabled="isFetching"
            class="cursor-pointer flex items-center justify-center p-2 rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition disabled:opacity-50"
            title="Refresh status"
          >
            <div v-if="isFetching" class="animate-spin w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>
            <AppIcon v-else name="refresh" :size="16" />
          </button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-6 relative">
      <!-- Status Card -->
      <RouterStatusCard
        :is-installed="isInstalled"
        :container-status="containerStatus"
        :http-port="httpPort"
        :https-port="httpsPort"
        :show-port-editor="showPortEditor"
        :processing="isProcessing"
        @toggle-port-editor="showPortEditor = !showPortEditor"
        @cancel-port-editor="showPortEditor = false"
        @save-ports="savePortsAndRedeploy"
        @update:http-port="(v: string) => httpPort = v"
        @update:https-port="(v: string) => httpsPort = v"
      />

      <div v-if="!isInstalled" class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] border-dashed rounded-2xl p-12 text-center">
         <div class="w-16 h-16 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
            <AppIcon name="server" :size="32" />
         </div>
         <h3 class="text-lg font-bold mb-2 text-gray-400">Not Configured</h3>
         <p class="text-sm text-[var(--color-muted)] max-w-sm mx-auto">
            Install the central Nginx proxy to start routing traffic to your local web projects.
         </p>
         <button @click="installNginx" class="cursor-pointer mt-6 px-6 py-2.5 bg-[var(--color-accent)] text-white rounded-xl font-bold shadow-lg shadow-[var(--color-accent)]/20">Initialize Service</button>
      </div>
      
      <!-- Registered Routes -->
      <div v-if="isInstalled" class="mt-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold flex items-center gap-2 text-white">
            <AppIcon name="link" :size="18" class="text-[var(--color-accent)]" />
            Registered Project Routes
          </h3>
          <span class="text-[10px] text-[var(--color-muted)] uppercase tracking-widest font-bold">{{ routerFiles.filter(f => f.endsWith('.conf')).length }} Active / {{ routerFiles.length }} Total</span>
          <div class="flex gap-2">
            <button 
              @click="reloadConfig"
              :disabled="isReloading"
              class="cursor-pointer flex items-center gap-1.5 bg-[var(--color-surface-hover)] text-[var(--color-muted)] hover:text-white hover:bg-[var(--color-border)] px-3 py-1.5 rounded-lg text-xs font-bold transition border border-[var(--color-border)] disabled:opacity-50"
              title="Reload all Nginx configs"
            >
              <div v-if="isReloading" class="animate-spin w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>
              <AppIcon v-else name="refresh" :size="14" />
              Reload Nginx
            </button>
            <button 
              @click="showAddRoute = true"
              class="cursor-pointer flex items-center gap-1.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-[var(--color-accent)]/20"
            >
              <AppIcon name="plus" :size="14" />
              Add Route
            </button>
          </div>
        </div>

        <div v-if="routerFiles.length === 0" class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] border-dashed rounded-2xl p-12 text-center">
           <AppIcon name="template" :size="32" class="mx-auto mb-3 opacity-20" />
           <p class="text-xs text-[var(--color-muted)]">No project routing rules found. Deploy a project to see it here.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <RouterRouteCard
            v-for="file in routerFiles" :key="file"
            :file-name="file"
            @view-logs="openLogViewer(file)"
            @edit-config="openConfigEditor(file)"
            @delete="deleteRouteConfig(file)"
            @toggle="toggleRouteConfig(file)"
          />
        </div>
      </div>
    </div>

    <!-- Resizable Drawer for Container Details -->
    <ServiceDrawer
      :is-open="isDrawerOpen"
      v-model:active-tab="activeTab"
      :tabs="drawerTabs"
      icon="server"
      @close="isDrawerOpen = false"
      @open="isDrawerOpen = true"
    >
      <template #logs>
        <ContainerLogs
          v-if="activeTab === 'logs' && isInstalled"
          container-id="wdocker-nginx-proxy"
          name="wdocker-nginx-proxy"
          class="h-full"
        />
        <div v-else-if="activeTab === 'logs'" class="h-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] font-mono text-xs">
          <div class="text-center">
            <AppIcon name="server" :size="48" class="mx-auto mb-4 opacity-20" />
            Install the Router Service to view logs.
          </div>
        </div>
      </template>

      <template #terminal>
        <ContainerTerminal
          v-if="containerStatus === 'running' && activeTab === 'terminal'"
          container-id="wdocker-nginx-proxy"
          name="wdocker-nginx-proxy"
          class="h-full"
        />
        <div v-else class="h-full bg-black flex items-center justify-center text-[var(--color-muted)] font-mono text-xs">
           <div class="text-center">
              <AppIcon name="terminal" :size="48" class="mx-auto mb-4 opacity-20" />
              Container must be running to open terminal.
           </div>
        </div>
      </template>

      <template #info>
        <ContainerInfo
          v-if="activeTab === 'info' && isInstalled"
          container-id="wdocker-nginx-proxy"
          name="wdocker-nginx-proxy"
          class="h-full"
        />
        <div v-else-if="activeTab === 'info'" class="h-full bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-muted)] font-mono text-xs">
          <div class="text-center">
            <AppIcon name="server" :size="48" class="mx-auto mb-4 opacity-20" />
            Install the Router Service to view info.
          </div>
        </div>
      </template>
    </ServiceDrawer>

    <!-- Manual Config Editor Modal -->
    <ConfigEditorModal
      :show="showEditor"
      :file-name="editingFileName"
      v-model="editingContent"
      :saving="isSavingConfig"
      @close="showEditor = false"
      @save="saveManualConfig"
    />

    <!-- Log Viewer Modal -->
    <LogViewerModal
      :show="showLogViewer"
      :file-name="logFileName"
      :active-tab="activeLogTab"
      :content="logContent"
      :refreshing="isRefreshingLogs"
      @close="showLogViewer = false"
      @refresh="refreshLogs"
      @switch-tab="(tab: 'access' | 'error') => { activeLogTab = tab; refreshLogs(); }"
    />

    <!-- Add Route Modal -->
    <AddRouteModal
      :show="showAddRoute"
      :saving="isAddingRoute"
      @close="showAddRoute = false"
      @create="addRouteConfig"
    />

    <!-- Deploy Modal -->
    <DeployModal
      :show="showDeployModal"
      target-name="Router Service"
      :logs="deployLogs"
      :launching="isProcessing"
      :log-filename="deployLogFilename"
      @close="showDeployModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import AppIcon from '../components/AppIcon.vue';
import ServiceDrawer from '../components/ServiceDrawer.vue';
import ContainerTerminal from '../components/ContainerTerminal.vue';
import ContainerInfo from '../components/ContainerInfo.vue';
import ContainerLogs from '../components/ContainerLogs.vue';
import ConfigEditorModal from '../components/modals/ConfigEditorModal.vue';
import LogViewerModal from '../components/modals/LogViewerModal.vue';
import AddRouteModal from '../components/modals/AddRouteModal.vue';
import DeployModal from '../components/modals/DeployModal.vue';
import RouterStatusCard from '../components/RouterStatusCard.vue';
import RouterRouteCard from '../components/RouterRouteCard.vue';
import { useNginxProxy } from '../composables/useNginxProxy';

const {
  isFetching, isInstalled, containerStatus, isProcessing,
  routerFiles, showPortEditor, httpPort, httpsPort,
  showEditor, editingFileName, editingContent, isSavingConfig, isReloading,
  showAddRoute, isAddingRoute,
  showLogViewer, logFileName, activeLogTab, logContent, isRefreshingLogs,
  isDrawerOpen, activeTab, drawerTabs,
  showDeployModal, deployLogs, deployLogFilename,
  checkStatus, openConfigEditor, saveManualConfig, reloadConfig, addRouteConfig, deleteRouteConfig, toggleRouteConfig,
  openLogViewer, refreshLogs, savePortsAndRedeploy,
  installNginx, redeployNginx, startNginx, stopNginx,
  setupListeners,
} = useNginxProxy();

setupListeners();
</script>
