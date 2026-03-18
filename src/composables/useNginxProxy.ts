/**
 * Composable for Nginx Proxy container lifecycle:
 * install, start, stop, redeploy, status checking,
 * config editing, log viewing, and compose YAML generation.
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export function useNginxProxy() {
  const isFetching = ref(true);
  const isInstalled = ref(false);
  const containerStatus = ref('stopped');
  const isProcessing = ref(false);
  const containerLogs = ref<string[]>([]);
  const containerInfo = ref('');
  const logsContainer = ref<HTMLElement | null>(null);
  const routerFiles = ref<string[]>([]);

  // Port config
  const showPortEditor = ref(false);
  const httpPort = ref(localStorage.getItem('wdocker_http_port') || '80');
  const httpsPort = ref(localStorage.getItem('wdocker_https_port') || '443');

  // Config editor state
  const showEditor = ref(false);
  const editingFileName = ref('');
  const editingContent = ref('');
  const isSavingConfig = ref(false);
  const isReloading = ref(false);

  // Add Route state
  const showAddRoute = ref(false);
  const isAddingRoute = ref(false);

  // Log viewer state
  const showLogViewer = ref(false);
  const logFileName = ref('');
  const activeLogTab = ref<'access' | 'error'>('access');
  const logContent = ref('');
  const isRefreshingLogs = ref(false);

  // Drawer state
  const isDrawerOpen = ref(false);
  const activeTab = ref('logs');
  const drawerTabs = [
    { id: 'logs', label: 'Logs' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'info', label: 'Inspect' }
  ];

  // Deploy modal state
  const showDeployModal = ref(false);
  const deployLogs = ref('');
  const deployLogFilename = ref('');

  let unlistenCompose: () => void;
  let unlistenLogs: () => void;

  // ── Status ───────────────────────────────────────────────────
  async function checkStatus() {
    isFetching.value = true;
    try {
      const info = await invoke<any>('inspect_container', { id: 'wdocker-nginx-proxy' });
      isInstalled.value = true;
      containerStatus.value = info.State?.Status || 'stopped';
      containerInfo.value = JSON.stringify(info, null, 2);

      if (containerStatus.value === 'running') {
        startStreamingLogs();
      }
    } catch (e) {
      isInstalled.value = false;
      containerStatus.value = 'none';
    }

    try {
      routerFiles.value = await invoke<string[]>('list_router_configs');
    } catch (e) {
      console.error('Failed to list router configs:', e);
    }

    isFetching.value = false;
  }

  // ── Config Editor ────────────────────────────────────────────
  async function openConfigEditor(fileName: string) {
    editingFileName.value = fileName;
    const projName = fileName.replace('.conf', '');
    try {
      editingContent.value = await invoke<string>('read_router_config', { projectName: projName });
      showEditor.value = true;
      isDrawerOpen.value = false;
    } catch (e) {
      console.error('Failed to read config:', e);
    }
  }

  async function saveManualConfig() {
    isSavingConfig.value = true;
    const projName = editingFileName.value.replace('.conf', '');
    try {
      await invoke('save_router_config', { projectName: projName, content: editingContent.value });
      await reloadConfig();
      showEditor.value = false;
    } catch (e) {
      console.error('Failed to save config:', e);
    } finally {
      isSavingConfig.value = false;
    }
  }

  async function reloadConfig() {
    isReloading.value = true;
    try {
      await invoke('reload_nginx_proxy');
      await checkStatus();
    } catch (e) {
      console.error('Failed to reload Nginx:', e);
    } finally {
      setTimeout(() => { isReloading.value = false; }, 500);
    }
  }

  // ── Add Route ──────────────────────────────────────────────────
  function generateRouteNginxConfig(name: string, domain: string, upstream: string): string {
    return `# wDocker Route Configuration\n# Route: ${name}\n\nserver {\n    listen 80;\n    server_name ${domain};\n\n    access_log /var/log/nginx/${name}_access.log;\n    error_log /var/log/nginx/${name}_error.log;\n\n    location / {\n        proxy_pass http://${upstream};\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n\n        proxy_read_timeout 600;\n        proxy_connect_timeout 600;\n        proxy_send_timeout 600;\n\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n    }\n}\n`;
  }

  async function registerRouteDns(domain: string) {
    try {
      const hosts = await invoke<string>('read_hosts_file');
      const lines = hosts.split('\n');
      const exists = lines.some(line => {
        const parts = line.trim().split(/\s+/);
        return parts.length >= 2 && parts.includes(domain);
      });
      if (!exists) {
        let newContent = hosts;
        if (!newContent.endsWith('\n')) newContent += '\n';
        newContent += `127.0.0.1\t${domain}\n`;
        await invoke('write_hosts_file', { content: newContent });
      }
    } catch (e) {
      console.warn('Failed to auto-register DNS:', e);
    }
  }

  async function addRouteConfig(data: { routeName: string; domain: string; upstream: string }) {
    isAddingRoute.value = true;
    try {
      const safeName = data.routeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const config = generateRouteNginxConfig(safeName, data.domain, data.upstream);
      await invoke('save_router_config', { projectName: safeName, content: config });
      await registerRouteDns(data.domain);
      await reloadConfig();
      showAddRoute.value = false;
    } catch (e) {
      console.error('Failed to add route:', e);
    } finally {
      isAddingRoute.value = false;
    }
  }

  async function deleteRouteConfig(fileName: string) {
    const projName = fileName.replace('.conf.disabled', '').replace('.conf', '');
    try {
      await invoke('remove_router_config', { projectName: projName });
      await reloadConfig();
    } catch (e) {
      console.error('Failed to delete route:', e);
    }
  }

  async function toggleRouteConfig(fileName: string) {
    try {
      await invoke('toggle_router_config', { fileName });
      await reloadConfig();
    } catch (e) {
      console.error('Failed to toggle route:', e);
    }
  }

  // ── Log Viewer ───────────────────────────────────────────────
  async function openLogViewer(fileName: string) {
    logFileName.value = fileName;
    showLogViewer.value = true;
    await refreshLogs();
  }

  async function refreshLogs() {
    isRefreshingLogs.value = true;
    const projName = logFileName.value.replace('.conf', '');
    try {
      logContent.value = await invoke<string>('read_router_log', {
        projectName: projName,
        logType: activeLogTab.value
      });
    } catch (e: any) {
      logContent.value = "Error loading logs: " + e?.toString();
    } finally {
      isRefreshingLogs.value = false;
    }
  }

  // ── Ports ────────────────────────────────────────────────────
  function savePorts() {
    localStorage.setItem('wdocker_http_port', httpPort.value);
    localStorage.setItem('wdocker_https_port', httpsPort.value);
  }

  async function savePortsAndRedeploy() {
    savePorts();
    showPortEditor.value = false;
    await redeployNginx();
  }

  // ── Container Lifecycle ──────────────────────────────────────
  function scrollToBottom() {
    setTimeout(() => {
      if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
      }
    }, 50);
  }

  async function startStreamingLogs() {
    if (unlistenLogs) unlistenLogs();
    try {
      await invoke('stream_container_logs', { id: 'wdocker-nginx-proxy' });
      const listenFn = await listen<string>('container-log-line', (event) => {
        containerLogs.value.push(event.payload);
        if (containerLogs.value.length > 500) containerLogs.value.shift();
        scrollToBottom();
      });
      unlistenLogs = listenFn;
    } catch (e) {
      console.error('Failed to stream logs:', e);
    }
  }

  async function installNginx() {
    isProcessing.value = true;
    showDeployModal.value = true;
    deployLogs.value = 'Preparing wDocker Nginx Proxy template...\n';
    deployLogFilename.value = '';
    containerLogs.value = ['Preparing wDocker Nginx Proxy template...'];

    const composeYaml = `
version: '3.8'

services:
  proxy:
    image: nginx:alpine
    container_name: wdocker-nginx-proxy
    restart: always
    ports:
      - "${httpPort.value}:80"
      - "${httpsPort.value}:443"
    volumes:
      - ~/.wDocker/router_conf:/etc/nginx/conf.d
      - ~/.wDocker/logs/router:/var/log/nginx
    networks:
      - wdocker_network

networks:
  wdocker_network:
    name: wdocker_network
    driver: bridge
`;

    try {
      deployLogs.value += 'Deploying stack via wDocker Engine...\n';
      containerLogs.value.push('Deploying stack via wDocker Engine...');
      const logFile = await invoke<string>('launch_compose', {
        yaml: composeYaml,
        projectName: 'wdocker-core'
      });
      deployLogFilename.value = logFile;
    } catch (e: any) {
      deployLogs.value += 'Error: ' + e?.toString() + '\n';
      containerLogs.value.push('Error: ' + e?.toString());
    }

    isProcessing.value = false;
    await checkStatus();
  }

  async function redeployNginx() {
    isProcessing.value = true;
    showDeployModal.value = true;
    deployLogs.value = 'Redeploying Router Service with new config...\n';
    deployLogFilename.value = '';
    containerLogs.value = ['Redeploying Router Service with new config...'];

    try {
      deployLogs.value += 'Stopping existing container...\n';
      containerLogs.value.push('Stopping existing container...');
      try { await invoke('stop_container', { id: 'wdocker-nginx-proxy' }); } catch (_) {}

      deployLogs.value += 'Removing old container...\n';
      containerLogs.value.push('Removing old container...');
      try { await invoke('remove_container', { id: 'wdocker-nginx-proxy' }); } catch (_) {}

      deployLogs.value += `Deploying with ports ${httpPort.value}:80, ${httpsPort.value}:443...\n`;
      containerLogs.value.push(`Deploying with ports ${httpPort.value}:80, ${httpsPort.value}:443...`);
      await installNginx();
      return;
    } catch (e: any) {
      deployLogs.value += 'Error during redeploy: ' + e?.toString() + '\n';
      containerLogs.value.push('Error during redeploy: ' + e?.toString());
    }
    isProcessing.value = false;
  }

  async function startNginx() {
    isProcessing.value = true;
    try {
      await invoke('start_container', { id: 'wdocker-nginx-proxy' });
    } finally {
      isProcessing.value = false;
      await checkStatus();
    }
  }

  async function stopNginx() {
    isProcessing.value = true;
    try {
      await invoke('stop_container', { id: 'wdocker-nginx-proxy' });
    } finally {
      isProcessing.value = false;
      await checkStatus();
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────
  function setupListeners() {
    onMounted(async () => {
      await checkStatus();
      const listenFn = await listen<string>('compose-progress', (event) => {
        containerLogs.value.push(event.payload);
        deployLogs.value += event.payload + '\n';
        scrollToBottom();
      });
      unlistenCompose = listenFn;
    });

    onUnmounted(() => {
      if (unlistenCompose) unlistenCompose();
      if (unlistenLogs) unlistenLogs();
    });
  }

  return {
    // Status
    isFetching, isInstalled, containerStatus, isProcessing,
    containerLogs, containerInfo, logsContainer, routerFiles,
    // Ports
    showPortEditor, httpPort, httpsPort,
    // Config editor
    showEditor, editingFileName, editingContent, isSavingConfig, isReloading,
    // Add Route
    showAddRoute, isAddingRoute,
    // Log viewer
    showLogViewer, logFileName, activeLogTab, logContent, isRefreshingLogs,
    // Drawer
    isDrawerOpen, activeTab, drawerTabs,
    // Deploy modal
    showDeployModal, deployLogs, deployLogFilename,
    // Methods
    checkStatus,
    openConfigEditor, saveManualConfig, reloadConfig, addRouteConfig, deleteRouteConfig, toggleRouteConfig,
    openLogViewer, refreshLogs,
    savePorts, savePortsAndRedeploy,
    installNginx, redeployNginx, startNginx, stopNginx,
    setupListeners,
  };
}
