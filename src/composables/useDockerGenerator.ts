/**
 * Composable that encapsulates all Docker Compose / Dockerfile / Nginx generation logic.
 * Extracted from ProjectsView.vue to reduce file size and improve maintainability.
 */
import phpExtensionLibrary from '../data/php_extensions.json';

// ── Types (shared with ProjectsView) ─────────────────────────────
export interface ServiceConfig {
  name: string;
  type: string;
  image: string;
  command: string;
  workingDir: string;
  port: string;
  isPublic: boolean;
  volumes: string;
  environment: string;
  expanded: boolean;
  phpExtensions?: string[];
  installComposer?: boolean;
  documentRoot?: string;
  phpIni?: string;
  customNginx?: string;
}

export interface ProjectConfig {
  services: ServiceConfig[];
}

export interface DeploySession {
  timestamp: string;
  log: string;
  success: boolean;
}

export interface Project {
  id: string;
  name: string;
  domain: string;
  path: string;
  config: ProjectConfig;
  yaml: string;
  routerConfig?: string;
  deployHistory?: DeploySession[];
}

// ── Dockerfile Generation ────────────────────────────────────────
export function generateDockerfileForService(svc: ServiceConfig): string {
  const isAlpine = svc.image.includes('alpine');
  const isApache = svc.image.includes('apache');
  const isPhpImage = svc.image.startsWith('php:');
  
  const lines: string[] = [`FROM ${svc.image}`];

  if (svc.type === 'php' || svc.type === 'laravel') {
    const phpExts = svc.phpExtensions || [];
    const sysDeps = new Set<string>(['unzip', 'git']);
    
    const allExtData = phpExtensionLibrary.categories.flatMap(cat => cat.extensions);
    
    const selectedExtConfigs: any[] = [];
    for (const extName of phpExts) {
      const data = allExtData.find(e => e.name === extName);
      if (data) {
        selectedExtConfigs.push(data);
        const osDeps = isAlpine ? data.deps.alpine : data.deps.debian;
        osDeps.forEach(d => sysDeps.add(d));
      }
    }

    if (sysDeps.size > 0 && isPhpImage) {
      const depsArray = Array.from(sysDeps);
      if (isAlpine) {
        lines.push(`RUN apk add --no-cache ${depsArray.join(' ')}`);
      } else {
        lines.push('ENV DEBIAN_FRONTEND=noninteractive');
        lines.push(`RUN apt-get update && apt-get install -y ${depsArray.join(' ')} --no-install-recommends && rm -rf /var/lib/apt/lists/*`);
      }
    }

    if (isPhpImage) {
      for (const ext of selectedExtConfigs) {
         if (ext.configure) {
           lines.push(`RUN docker-php-ext-configure ${ext.name} ${ext.configure}`);
         }
      }

      const coreExts = selectedExtConfigs.filter(e => e.type === 'core').map(e => e.name);
      const peclExts = selectedExtConfigs.filter(e => e.type === 'pecl').map(e => e.name);

      if (coreExts.length > 0) {
        lines.push(`RUN docker-php-ext-install ${coreExts.join(' ')}`);
      }
      if (peclExts.length > 0) {
        if (isAlpine) {
          lines.push(`RUN apk add --no-cache $PHPIZE_DEPS && pecl install ${peclExts.join(' ')} && docker-php-ext-enable ${peclExts.join(' ')} && apk del $PHPIZE_DEPS`);
        } else {
          lines.push(`RUN pecl install ${peclExts.join(' ')} && docker-php-ext-enable ${peclExts.join(' ')}`);
        }
      }
    }

    if (svc.installComposer) {
      lines.push('COPY --from=composer:latest /usr/bin/composer /usr/bin/composer');
    }

    if (isApache) {
      lines.push('RUN a2enmod rewrite');
      if (svc.documentRoot && svc.documentRoot !== '/var/www/html') {
        lines.push(`ENV APACHE_DOCUMENT_ROOT ${svc.documentRoot}`);
        lines.push('RUN sed -ri -e "s!/var/www/html!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/sites-available/*.conf');
        lines.push('RUN sed -ri -e "s!/var/www/!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf');
      }
    }

    if (svc.phpIni && svc.phpIni.trim()) {
      lines.push(`COPY php-custom-${svc.name}.ini /usr/local/etc/php/conf.d/99-custom.ini`);
    }
  }

  return lines.join('\n');
}

// ── Compose Template Generation ──────────────────────────────────
export function generateComposeTemplate(w: { name: string; domain: string; path: string; services: ServiceConfig[] }): string {
  const safeName = w.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  let yaml = `version: "3.8"\n\nnetworks:\n  wdocker_network:\n    external: true\n\nservices:\n`;

  for (const svc of w.services) {
    const containerName = `wdocker-${safeName}-${svc.name}`;
    
    const useBuild = (svc.type === 'php' || svc.type === 'laravel') && (
      (svc.phpExtensions && svc.phpExtensions.length > 0) ||
      svc.installComposer ||
      (svc.phpIni && svc.phpIni.trim())
    );
    
    yaml += `  ${svc.name}:\n`;
    
    if (useBuild) {
      yaml += `    build:\n`;
      yaml += `      context: ~/.wDocker/projects/${safeName}\n`;
      yaml += `      dockerfile: Dockerfile.${svc.name}\n`;
    } else {
      yaml += `    image: ${svc.image}\n`;
    }
    
    yaml += `    container_name: ${containerName}\n`;
    yaml += `    restart: unless-stopped\n`;
    
    if (svc.workingDir) {
      yaml += `    working_dir: ${svc.workingDir}\n`;
    }
    if (svc.command) {
      yaml += `    command: ${svc.command}\n`;
    }
    
    const volLines = svc.volumes.split('\n').filter(v => v.trim());
    if (volLines.length > 0) {
      yaml += `    volumes:\n`;
      for (const v of volLines) {
        yaml += `      - ${v.trim()}\n`;
      }
    }
    
    yaml += `    networks:\n      - wdocker_network\n`;
    
    const envLines = svc.environment.split('\n').filter(e => e.trim());
    
    if (svc.isPublic) {
      envLines.push(`VIRTUAL_HOST=${w.domain || 'app.test'}`);
      if (svc.port) envLines.push(`VIRTUAL_PORT=${svc.port}`);
    }

    if (envLines.length > 0) {
      yaml += `    environment:\n`;
      for (const e of envLines) {
        yaml += `      - ${e.trim()}\n`;
      }
    }
    
    yaml += `    tty: true\n\n`;
  }

  return yaml;
}

// ── Nginx Config Generation ──────────────────────────────────────
export function generateNginxConfig(proj: Project): string {
  const safeProjectName = proj.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  let config = "# wDocker Nginx Proxy Configuration\n# You can customize this file. Manual edits in the Inspect tab will be preserved.\n\n";
  
  for (const svc of proj.config.services) {
    if (svc.isPublic) {
      const serverNames = proj.domain || `${safeProjectName}.test`;
      const containerName = `wdocker-${safeProjectName}-${svc.name}`;
      const port = svc.port || 80;
      
      config += `server {
    listen 80;
    server_name ${serverNames};

    access_log /var/log/nginx/${safeProjectName}_access.log;
    error_log /var/log/nginx/${safeProjectName}_error.log;

    # Root directory (optional, proxy_pass handles the traffic to container)
    # root ${proj.path}; 

    location / {
        proxy_pass http://${containerName}:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for long-running requests
        proxy_read_timeout 600;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Standard URL rewriting pattern (useful for Laravel/WordPress)
        # try_files $uri $uri/ /index.php?$query_string;
    }

    ${svc.customNginx || ''}

    # Example: Custom block for Laravel /index.php (if proxying directly to PHP-FPM)
    # location ~ \\.php$ {
    #     include fastcgi_params;
    #     fastcgi_pass ${containerName}:9000;
    #     fastcgi_index index.php;
    #     fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    # }
}

`;
    }
  }
  return config;
}

// ── Helper: Get Container ID ─────────────────────────────────────
export function getContainerId(proj: Project, serviceIdx: number = 0): string {
  const safeName = proj.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const svc = proj.config.services[serviceIdx];
  if (!svc) return '';
  return `wdocker-${safeName}-${svc.name}`;
}
