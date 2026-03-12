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

// ── Helper: Extract PHP version from image tag ──────────────────
function extractPhpVersion(image: string): { major: number; minor: number } | null {
  const match = image.match(/php:(\d+)\.(\d+)/);
  if (match) return { major: parseInt(match[1]), minor: parseInt(match[2]) };
  return null;
}

function phpVersionAtLeast(phpVer: { major: number; minor: number } | null, major: number, minor: number): boolean {
  if (!phpVer) return true; // If we can't detect, assume latest
  return phpVer.major > major || (phpVer.major === major && phpVer.minor >= minor);
}

// ── Helper: Check if ext is compatible with PHP version ──────────
function isExtCompatibleWithPhp(ext: any, phpVer: { major: number; minor: number } | null): boolean {
  if (!ext.minPhp || !phpVer) return true;
  const minParts = String(ext.minPhp).split('.');
  const minMajor = parseInt(minParts[0]) || 0;
  const minMinor = parseInt(minParts[1]) || 0;
  return phpVersionAtLeast(phpVer, minMajor, minMinor);
}

// ── Dockerfile Generation ────────────────────────────────────────
export function generateDockerfileForService(svc: ServiceConfig): string {
  const isApache = svc.image.includes('apache');
  const isPhpImage = svc.image.startsWith('php:');
  const phpVer = extractPhpVersion(svc.image);
  
  const lines: string[] = [`FROM ${svc.image}`];

  if (svc.type === 'php' || svc.type === 'laravel') {
    const phpExts = svc.phpExtensions || [];
    
    const allExtData = phpExtensionLibrary.categories.flatMap(cat => cat.extensions);
    
    // Filter compatible extensions
    const validExts: string[] = [];
    const skippedExts: string[] = [];
    for (const extName of phpExts) {
      const data = allExtData.find(e => e.name === extName);
      if (data) {
        if (!isExtCompatibleWithPhp(data, phpVer)) {
          skippedExts.push(extName);
          continue;
        }
        validExts.push(extName);
      }
    }

    if (skippedExts.length > 0) {
      lines.push(`# Skipped incompatible extensions for PHP ${phpVer?.major}.${phpVer?.minor}: ${skippedExts.join(', ')}`);
    }

    // Use install-php-extensions (https://github.com/mlocati/docker-php-extension-installer)
    // This tool automatically handles: system deps, pre-installed detection, PECL vs core,
    // version compatibility, configure flags (gd, etc.), and post-install cleanup.
    if (isPhpImage && validExts.length > 0) {
      lines.push('ADD --chmod=0755 https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions /usr/local/bin/');
      lines.push(`RUN install-php-extensions ${validExts.join(' ')}`);
    }

    if (svc.installComposer) {
      // Install Composer via direct download (avoids Docker credential helper issues with multi-stage COPY --from=)
      lines.push('RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer');
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
