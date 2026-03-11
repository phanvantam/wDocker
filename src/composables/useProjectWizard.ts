/**
 * Composable for the Project Wizard state management:
 * service presets, image library, tag selection, PHP extension compatibility.
 */
import { ref, computed } from 'vue';
import dockerLibrary from '../data/docker_images.json';
import phpExtensionLibrary from '../data/php_extensions.json';
import type { ServiceConfig } from './useDockerGenerator';

export function useProjectWizard() {
  const showWizard = ref(false);
  const editingProjectId = ref<string | null>(null);
  const wizard = ref({
    name: '',
    domain: '',
    path: '',
    services: [] as ServiceConfig[]
  });

  const phpExtensionCategories = phpExtensionLibrary.categories;
  const libraryCategories = dockerLibrary.categories;

  // ── Image Library ────────────────────────────────────────────
  const showLibrary = ref<{ serviceIdx: number | null }>({ serviceIdx: null });

  const filteredLibraryCategories = computed(() => {
    if (showLibrary.value.serviceIdx === null) return [];
    const svc = wizard.value.services[showLibrary.value.serviceIdx];
    if (!svc) return [];

    const targetImageName = (svc.type === 'laravel' || svc.type === 'php') ? 'php' : 'node';

    return libraryCategories.map(cat => ({
      ...cat,
      images: cat.images.filter(img => img.name === targetImageName)
    })).filter(cat => cat.images.length > 0);
  });

  function openLibrary(idx: number) {
    showLibrary.value = { serviceIdx: idx };
  }

  function selectLibraryImage(idx: number, imgName: string, defaultTag: string) {
    const svc = wizard.value.services[idx];
    if (svc) {
      svc.image = `${imgName}:${defaultTag}`;
    }
    showLibrary.value = { serviceIdx: null };
  }

  function getAvailableTagsForImage(imageName: string) {
    const pureName = imageName.split(':')[0];
    for (const cat of libraryCategories) {
      for (const img of cat.images) {
        if (img.name === pureName) return img.tags;
      }
    }
    return [];
  }

  function updateImageTag(idx: number, tag: string) {
    const svc = wizard.value.services[idx];
    const pureName = svc.image.split(':')[0];
    svc.image = `${pureName}:${tag}`;
  }

  function isExtIncompatible(ext: any, image: string) {
    if (!ext.minPhp) return false;
    const match = image.match(/(\d+\.\d+)/);
    if (!match) return false;
    const currentVer = parseFloat(match[1]);
    const minVer = parseFloat(ext.minPhp);
    return currentVer < minVer;
  }

  // ── Unique Name ──────────────────────────────────────────────
  function generateUniqueServiceName(baseName: string): string {
    const existingNames = wizard.value.services.map(s => s.name);
    if (!existingNames.includes(baseName)) return baseName;
    let counter = 2;
    while (existingNames.includes(`${baseName}-${counter}`)) counter++;
    return `${baseName}-${counter}`;
  }

  // ── Service Presets ──────────────────────────────────────────
  function createServiceConfig(type: string, projectPath: string): ServiceConfig {
    const safeName = wizard.value.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const phpBase = (variant: string): ServiceConfig => ({
      name: generateUniqueServiceName('web'),
      type: variant as any,
      image: 'php:8.2-apache',
      command: '',
      workingDir: '',
      port: '80',
      isPublic: true,
      volumes: `${projectPath}:/var/www/html\n~/.wDocker/logs/${safeName}/web:/var/log/apache2`,
      environment: '',
      expanded: true,
      phpExtensions: variant === 'laravel'
        ? ['pdo_mysql', 'mbstring', 'bcmath', 'intl', 'zip']
        : ['pdo_mysql', 'mbstring'],
      installComposer: true,
      documentRoot: variant === 'laravel' ? '/var/www/html/public' : '/var/www/html',
      phpIni: '',
      customNginx: ''
    });

    switch (type) {
      case 'laravel': return phpBase('laravel');
      case 'php': return phpBase('php');
      case 'node':
        return {
          name: generateUniqueServiceName('node'),
          type: 'node',
          image: 'node:20-alpine',
          command: 'npm run dev',
          workingDir: '/app',
          port: '3000',
          isPublic: true,
          volumes: `${projectPath}:/app`,
          environment: '',
          expanded: true,
          customNginx: ''
        };
      default: return phpBase('php');
    }
  }

  function addServicePreset(type: string) {
    const path = wizard.value.path;

    if (type === 'laravel') {
      const php = createServiceConfig('php', path);
      php.documentRoot = '/var/www/html/public';

      const node = createServiceConfig('node', path);
      node.name = generateUniqueServiceName('node-builder');
      node.command = 'npm install && npm run dev';
      node.isPublic = false;

      wizard.value.services.push(php, node);
    } else {
      wizard.value.services.push(createServiceConfig(type, path));
    }
  }

  function removeService(idx: number) {
    wizard.value.services.splice(idx, 1);
  }

  function toggleServiceExpand(idx: number) {
    wizard.value.services[idx].expanded = !wizard.value.services[idx].expanded;
  }

  // ── Wizard Actions ───────────────────────────────────────────
  function openWizard() {
    editingProjectId.value = null;
    wizard.value = { name: '', domain: '', path: '', services: [] };
    showWizard.value = true;
  }

  function closeWizard() {
    showWizard.value = false;
  }

  function autoGenerateDomain() {
    if (wizard.value.name) {
      wizard.value.domain = wizard.value.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.test';
    } else {
      wizard.value.domain = '';
    }
  }

  return {
    showWizard,
    editingProjectId,
    wizard,
    phpExtensionCategories,
    showLibrary,
    filteredLibraryCategories,
    openLibrary,
    selectLibraryImage,
    getAvailableTagsForImage,
    updateImageTag,
    isExtIncompatible,
    addServicePreset,
    removeService,
    toggleServiceExpand,
    openWizard,
    closeWizard,
    autoGenerateDomain,
  };
}
