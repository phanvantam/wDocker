/**
 * Composable for Project CRUD operations, localStorage persistence,
 * DNS management, and file saving.
 */
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { generateDockerfileForService, generateNginxConfig } from './useDockerGenerator';
import type { Project } from './useDockerGenerator';

const STORAGE_KEY = 'wdocker_projects';

export function useProjectStore() {
  const projects = ref<Project[]>([]);
  const projectStatuses = ref<Record<string, string>>({});
  const routerRunning = ref(false);

  // ── Load / Save ──────────────────────────────────────────────
  function loadProjects() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        projects.value = JSON.parse(data);
      } catch (e) {
        console.error(e);
      }
    }
  }

  function saveProjectsLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects.value));
    window.dispatchEvent(new CustomEvent('projects_updated'));
  }

  // ── Container Status ─────────────────────────────────────────
  async function checkRouterStatus() {
    try {
      const info = await invoke<any>('inspect_container', { id: 'wdocker-nginx-proxy' });
      routerRunning.value = info.State?.Status === 'running';
    } catch {
      routerRunning.value = false;
    }
  }

  async function refreshProjectStatuses(getContainerId: (proj: Project, idx?: number) => string) {
    for (const proj of projects.value) {
      try {
        const info = await invoke<any>('inspect_container', { id: getContainerId(proj) });
        projectStatuses.value[proj.id] = info.State?.Status || 'stopped';
      } catch {
        projectStatuses.value[proj.id] = 'not_found';
      }
    }
  }

  // ── Project File Operations ──────────────────────────────────
  async function saveProjectFile(safeName: string, fileName: string, content: string) {
    try {
      await invoke('save_project_file', { projectName: safeName, fileName, content });
    } catch (e) {
      console.error(`Failed to save ${fileName}:`, e);
    }
  }

  function saveAllProjectFiles(proj: Project) {
    const safeName = proj.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    for (const svc of proj.config.services) {
      if (svc.type === 'php') {
        const dockerfile = generateDockerfileForService(svc);
        saveProjectFile(safeName, `Dockerfile.${svc.name}`, dockerfile);
        if (svc.phpIni && svc.phpIni.trim()) {
          saveProjectFile(safeName, `php-custom-${svc.name}.ini`, svc.phpIni);
        }
      }
    }

    saveProjectFile(safeName, 'docker-compose.yml', proj.yaml);

    // If routerConfig === '__keep__', user chose to preserve manual edits
    if (proj.routerConfig !== '__keep__') {
      const nginxConf = generateNginxConfig(proj);
      if (nginxConf) {
        invoke('save_router_config', { projectName: safeName, content: nginxConf })
          .then(() => invoke('reload_nginx_proxy'))
          .catch(e => console.error('Router config failed:', e));
      } else {
        invoke('remove_router_config', { projectName: safeName })
          .then(() => invoke('reload_nginx_proxy'))
          .catch(() => {});
      }
    } else {
      // Still reload nginx in case other files changed
      invoke('reload_nginx_proxy').catch(() => {});
    }

    if (proj.domain) {
      registerLocalDns(proj.domain);
    }
  }

  // ── DNS Management ───────────────────────────────────────────
  async function registerLocalDns(domain: string) {
    try {
      const hosts = await invoke<string>('read_hosts_file');
      const lines = hosts.split('\n');
      const exists = lines.some(line => {
        const parts = line.trim().split(/\s+/);
        return parts.length >= 2 && parts.includes(domain);
      });

      if (!exists) {
        console.log(`Registering ${domain} in hosts file...`);
        let newContent = hosts;
        if (!newContent.endsWith('\n')) newContent += '\n';
        newContent += `127.0.0.1\t${domain}\n`;
        await invoke('write_hosts_file', { content: newContent });
      }
    } catch (e) {
      console.warn('Failed to auto-register DNS (likely permissions):', e);
    }
  }

  async function unregisterLocalDns(domain: string) {
    try {
      const hosts = await invoke<string>('read_hosts_file');
      const lines = hosts.split('\n');
      const filteredLines = lines.filter(line => {
        const parts = line.trim().split(/\s+/);
        return !(parts.length >= 2 && parts.includes(domain));
      });

      if (filteredLines.length !== lines.length) {
        console.log(`Unregistering ${domain} from hosts file...`);
        await invoke('write_hosts_file', { content: filteredLines.join('\n') });
      }
    } catch (e) {
      console.warn('Failed to auto-unregister DNS:', e);
    }
  }

  // ── Delete ───────────────────────────────────────────────────
  function deleteProject(proj: Project) {
    const safeName = proj.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    projects.value = projects.value.filter(p => p.id !== proj.id);
    saveProjectsLocal();

    invoke('remove_router_config', { projectName: safeName })
      .then(() => invoke('reload_nginx_proxy'))
      .catch(() => {});

    if (proj.domain) {
      unregisterLocalDns(proj.domain);
    }
  }

  return {
    projects,
    projectStatuses,
    routerRunning,
    loadProjects,
    saveProjectsLocal,
    checkRouterStatus,
    refreshProjectStatuses,
    saveProjectFile,
    saveAllProjectFiles,
    registerLocalDns,
    unregisterLocalDns,
    deleteProject,
  };
}
