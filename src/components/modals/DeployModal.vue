<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div class="bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl p-6 w-[640px] shadow-2xl flex flex-col">
        <!-- Header -->
        <h3 class="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <AppIcon name="play" :size="16" class="text-[var(--color-accent)]" />
          Deploying {{ targetName }}
          <span v-if="launching" class="text-[10px] text-[var(--color-muted)] font-normal ml-auto">{{ elapsedTime }}</span>
        </h3>

        <!-- Progress Section -->
        <div class="mb-3 space-y-2">
          <!-- Progress Bar -->
          <div class="relative h-2 bg-black/40 rounded-full overflow-hidden border border-[var(--color-border)]/30">
            <div 
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
              :class="progressBarClass"
              :style="{ width: progressPercent + '%' }"
            ></div>
            <!-- Shimmer effect when active -->
            <div v-if="launching" class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          </div>

          <!-- Status Row -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <!-- Phase indicator -->
              <span 
                class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border"
                :class="phaseClass"
              >
                {{ currentPhase }}
              </span>
              <span class="text-[10px] text-gray-400 truncate max-w-[350px]">{{ currentStep }}</span>
            </div>
            <span class="text-xs font-mono font-bold" :class="launching ? 'text-[var(--color-accent)]' : (isSuccess ? 'text-green-400' : 'text-red-400')">
              {{ Math.round(progressPercent) }}%
            </span>
          </div>
        </div>

        <!-- Log Output -->
        <div class="flex items-center justify-between mb-1 px-1">
          <span class="text-[9px] text-[var(--color-muted)] font-mono uppercase">Live Log Output (Last 100 lines)</span>
          <span class="text-[9px] text-[var(--color-muted)] font-mono">Full log: ~/.wDocker/logs/{{ safeTargetName }}/{{ logFilename || 'deploy.log' }}</span>
        </div>
        <pre 
          ref="logRef"
          class="bg-[#0a0c14] border border-[var(--color-border)]/50 rounded-xl p-4 text-[11px] text-gray-400 font-mono whitespace-pre-wrap overflow-y-auto h-56 leading-relaxed scroll-smooth select-text"
        >{{ logs }}</pre>

        <!-- Footer -->
        <div class="flex gap-2 justify-between items-center mt-4">
          <!-- Stats -->
          <div v-if="launching" class="flex items-center gap-4 text-[10px] text-[var(--color-muted)]">
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
              Steps: {{ completedSteps }}/{{ totalSteps || '?' }}
            </span>
          </div>
          <div v-else class="flex items-center gap-2">
            <span v-if="isSuccess" class="text-xs text-green-400 font-medium flex items-center gap-1">
              <AppIcon name="check" :size="12" />
              Deployed successfully
            </span>
            <span v-else-if="!launching && logs" class="text-xs text-red-400 font-medium flex items-center gap-1">
              <AppIcon name="close" :size="12" />
              Deployment failed
            </span>
          </div>

          <div class="flex gap-2">
            <button 
              v-if="launching"
              disabled
              class="px-5 py-2 text-xs rounded-xl bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)] flex items-center gap-2 cursor-not-allowed"
            >
              <div class="animate-spin w-3 h-3 border-2 border-[var(--color-accent)] border-t-transparent rounded-full"></div>
              Deploying...
            </button>
            <button 
              v-else
              @click="$emit('close')" 
              class="cursor-pointer px-5 py-2 text-xs rounded-xl bg-[var(--color-accent)] text-white font-medium hover:opacity-90 transition shadow-lg shadow-[var(--color-accent)]/20"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import AppIcon from '../AppIcon.vue';

const props = defineProps<{ 
  show: boolean; 
  targetName: string; 
  logs: string; 
  launching: boolean;
  logFilename?: string;
}>();
defineEmits<{ (e: 'close'): void }>();

const logRef = ref<HTMLElement | null>(null);
const startTime = ref(0);
const elapsedTime = ref('0s');
let timerInterval: ReturnType<typeof setInterval> | undefined;

const safeTargetName = computed(() => props.targetName.toLowerCase().replace(/[^a-z0-9]/g, '-'));

// ── Progress Parsing ─────────────────────────────────────────
type DeployPhase = 'prepare' | 'pull' | 'build' | 'create' | 'start' | 'done' | 'error';

const progressState = computed(() => {
  const lines = props.logs.split('\n').filter(l => l.trim());
  let phase: DeployPhase = 'prepare';
  let completedSteps = 0;
  let totalSteps = 0;
  let currentStep = '';
  let buildStep = 0;
  let buildTotal = 0;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detect build step: "Step 3/8 :" or "#5 ..."
    const buildMatch = line.match(/step\s+(\d+)\/(\d+)/i) || line.match(/#(\d+)\s/);
    if (buildMatch) {
      phase = 'build';
      if (buildMatch[2]) {
        buildStep = parseInt(buildMatch[1]);
        buildTotal = parseInt(buildMatch[2]);
      } else {
        buildStep = parseInt(buildMatch[1]);
        buildTotal = Math.max(buildTotal, buildStep);
      }
    }

    // Detect pull
    if (lower.includes('pulling') || lower.includes('pull ')) {
      phase = phase === 'build' ? phase : 'pull';
    }

    // Detect create/start
    if (lower.includes('creating') || lower.includes('created')) {
      phase = 'create';
      completedSteps++;
    }
    if (lower.includes('started') || lower.includes('running')) {
      phase = 'start';
      completedSteps++;
    }

    // Count total services from "Container wdocker-..." lines
    if (lower.includes('container ')) {
      totalSteps = Math.max(totalSteps, completedSteps);
    }

    // Detect completion
    if (lower.includes('launched successfully') || lower.includes('deployment triggered')) {
      phase = 'done';
    }

    // Detect errors
    if (lower.includes('failed') || lower.includes('error:')) {
      if (!lower.includes('deployment triggered')) {
        phase = 'error';
      }
    }

    currentStep = line.trim();
  }

  // Calculate progress percentage
  let percent = 0;
  switch (phase) {
    case 'prepare':
      percent = 5;
      break;
    case 'pull':
      percent = 15;
      break;
    case 'build':
      if (buildTotal > 0) {
        // Build is 10-70% range
        percent = 10 + (buildStep / buildTotal) * 60;
      } else {
        percent = 30;
      }
      break;
    case 'create':
      percent = 75;
      break;
    case 'start':
      percent = 85;
      break;
    case 'done':
      percent = 100;
      break;
    case 'error':
      percent = Math.max(percent, 10);
      break;
  }

  return { phase: phase as DeployPhase, percent, completedSteps, totalSteps: totalSteps || completedSteps, currentStep, buildStep, buildTotal };
});

const progressPercent = computed(() => progressState.value.percent);
const currentPhase = computed(() => {
  const p = progressState.value.phase;
  const map: Record<string, string> = {
    prepare: 'Preparing',
    pull: 'Pulling',
    build: 'Building',
    create: 'Creating',
    start: 'Starting',
    done: 'Complete',
    error: 'Error'
  };
  return map[p] || p;
});

const currentStep = computed(() => {
  const s = progressState.value;
  if (s.phase === 'build' && s.buildTotal > 0) {
    return `Build step ${s.buildStep}/${s.buildTotal}`;
  }
  // Truncate long step text
  const step = s.currentStep;
  return step.length > 60 ? step.substring(0, 57) + '...' : step;
});

const completedSteps = computed(() => {
  const s = progressState.value;
  if (s.phase === 'build') return s.buildStep;
  return s.completedSteps;
});
const totalSteps = computed(() => {
  const s = progressState.value;
  if (s.phase === 'build') return s.buildTotal;
  return s.totalSteps;
});

const isSuccess = computed(() => progressState.value.phase === 'done');

const phaseClass = computed(() => {
  const p = progressState.value.phase;
  switch (p) {
    case 'prepare': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    case 'pull': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'build': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'create': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'start': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'done': return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'error': return 'bg-red-500/10 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  }
});

const progressBarClass = computed(() => {
  const p = progressState.value.phase;
  switch (p) {
    case 'done': return 'bg-gradient-to-r from-green-500 to-emerald-400';
    case 'error': return 'bg-gradient-to-r from-red-500 to-red-400';
    case 'build': return 'bg-gradient-to-r from-purple-600 to-purple-400';
    case 'pull': return 'bg-gradient-to-r from-blue-600 to-blue-400';
    default: return 'bg-gradient-to-r from-[var(--color-accent)] to-blue-400';
  }
});

// ── Timer ────────────────────────────────────────────────────
watch(() => props.launching, (val) => {
  if (val) {
    startTime.value = Date.now();
    timerInterval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime.value) / 1000);
      if (diff < 60) {
        elapsedTime.value = `${diff}s`;
      } else {
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        elapsedTime.value = `${m}m ${s}s`;
      }
    }, 1000);
  } else {
    if (timerInterval) clearInterval(timerInterval);
  }
});

// ── Auto scroll log ──────────────────────────────────────────
watch(() => props.logs, () => {
  setTimeout(() => {
    if (logRef.value) {
      logRef.value.scrollTop = logRef.value.scrollHeight;
    }
  }, 50);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<style scoped>
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.animate-shimmer {
  animation: shimmer 2s infinite;
}
</style>
