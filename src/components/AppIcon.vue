<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    :stroke="color || 'currentColor'"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0"
  >
    <path v-if="name === 'container'" d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path v-if="name === 'container'" d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />

    <path v-if="name === 'image'" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />

    <path v-if="name === 'template'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline v-if="name === 'template'" points="14 2 14 8 20 8" />
    <line v-if="name === 'template'" x1="16" y1="13" x2="8" y2="13" />
    <line v-if="name === 'template'" x1="16" y1="17" x2="8" y2="17" />

    <path v-if="name === 'volume'" d="M21 5c0 1.1-4 2-9 2S3 6.1 3 5" />
    <path v-if="name === 'volume'" d="M3 5v14c0 1.1 4 2 9 2s9-.9 9-2V5" />
    <path v-if="name === 'volume'" d="M3 12c0 1.1 4 2 9 2s9-.9 9-2" />
    <ellipse v-if="name === 'volume'" cx="12" cy="5" rx="9" ry="2" />

    <path v-if="name === 'network'" d="M12 20h.01" />
    <path v-if="name === 'network'" d="M2 12h.01M22 12h.01" />
    <path v-if="name === 'network'" d="M12 4h.01" />
    <path v-if="name === 'network'" d="M4.93 4.93l.01.01M19.07 4.93l.01.01" />
    <path v-if="name === 'network'" d="M12 12l-3.5 6.06M12 12l3.5 6.06M12 12V4M12 12l7.79-2.53M12 12l-7.79-2.53" />

    <polygon v-if="name === 'play'" points="5 3 19 12 5 21 5 3" />
    <rect v-if="name === 'stop'" x="6" y="4" width="4" height="16" />
    <rect v-if="name === 'stop'" x="14" y="4" width="4" height="16" />

    <polyline v-if="name === 'restart'" points="23 4 23 10 17 10" />
    <path v-if="name === 'restart'" d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />

    <polyline v-if="name === 'trash'" points="3 6 5 6 21 6" />
    <path v-if="name === 'trash'" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />

    <polyline v-if="name === 'refresh'" points="23 4 23 10 17 10" />
    <polyline v-if="name === 'refresh'" points="1 20 1 14 7 14" />
    <path v-if="name === 'refresh'" d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />

    <path v-if="name === 'pull'" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline v-if="name === 'pull'" points="7 10 12 15 17 10" />
    <line v-if="name === 'pull'" x1="12" y1="15" x2="12" y2="3" />

    <polyline v-if="name === 'terminal'" points="4 17 10 11 4 5" />
    <line v-if="name === 'terminal'" x1="12" y1="19" x2="20" y2="19" />

    <path v-if="name === 'logs'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline v-if="name === 'logs'" points="14 2 14 8 20 8" />
    <line v-if="name === 'logs'" x1="16" y1="13" x2="8" y2="13" />
    <line v-if="name === 'logs'" x1="16" y1="17" x2="8" y2="17" />
    <polyline v-if="name === 'logs'" points="10 9 9 9 8 9" />

    <path v-if="name === 'files'" d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />

    <circle v-if="name === 'info'" cx="12" cy="12" r="10" />
    <line v-if="name === 'info'" x1="12" y1="16" x2="12" y2="12" />
    <line v-if="name === 'info'" x1="12" y1="8" x2="12.01" y2="8" />

    <circle v-if="name === 'search'" cx="11" cy="11" r="8" />
    <line v-if="name === 'search'" x1="21" y1="21" x2="16.65" y2="16.65" />

    <line v-if="name === 'plus'" x1="12" y1="5" x2="12" y2="19" />
    <line v-if="name === 'plus'" x1="5" y1="12" x2="19" y2="12" />

    <path v-if="name === 'edit'" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path v-if="name === 'edit'" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />

    <polyline v-if="name === 'chevron'" points="9 18 15 12 9 6" />
    <polyline v-if="name === 'chevron-up'" points="18 15 12 9 6 15" />
    <polyline v-if="name === 'chevron-down'" points="6 9 12 15 18 9" />

    <circle v-if="name === 'ellipsis'" cx="12" cy="12" r="1" />
    <circle v-if="name === 'ellipsis'" cx="19" cy="12" r="1" />
    <circle v-if="name === 'ellipsis'" cx="5" cy="12" r="1" />

    <rect v-if="name === 'pause'" x="6" y="4" width="4" height="16" />
    <rect v-if="name === 'pause'" x="14" y="4" width="4" height="16" />

    <path v-if="name === 'inspect'" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle v-if="name === 'inspect'" cx="12" cy="12" r="3" />

    <path v-if="name === 'duplicate'" d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2" />
    <rect v-if="name === 'duplicate'" x="2" y="2" width="14" height="14" rx="2" ry="2" />

    <path v-if="name === 'download'" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline v-if="name === 'download'" points="7 10 12 15 17 10" />
    <line v-if="name === 'download'" x1="12" y1="15" x2="12" y2="3" />

    <path v-if="name === 'upload'" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline v-if="name === 'upload'" points="17 8 12 3 7 8" />
    <line v-if="name === 'upload'" x1="12" y1="3" x2="12" y2="15" />

    <path v-if="name === 'prune'" d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path v-if="name === 'prune'" d="M8 6V4c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v2" />
    <line v-if="name === 'prune'" x1="10" y1="11" x2="10" y2="17" />
    <line v-if="name === 'prune'" x1="14" y1="11" x2="14" y2="17" />

    <path v-if="name === 'tag'" d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line v-if="name === 'tag'" x1="7" y1="7" x2="7.01" y2="7" />

    <path v-if="name === 'history'" d="M12 8v4l3 3" />
    <circle v-if="name === 'history'" cx="12" cy="12" r="10" />

    <rect v-if="name === 'dashboard'" x="3" y="3" width="7" height="7" rx="1" />
    <rect v-if="name === 'dashboard'" x="14" y="3" width="7" height="7" rx="1" />
    <rect v-if="name === 'dashboard'" x="14" y="14" width="7" height="7" rx="1" />
    <rect v-if="name === 'dashboard'" x="3" y="14" width="7" height="7" rx="1" />

    <path v-if="name === 'box-empty'" d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
    <path v-if="name === 'box-empty'" d="M3 7l9 5 9-5" />
    <path v-if="name === 'box-empty'" d="M12 12v10" />

    <rect v-if="name === 'image-empty'" x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle v-if="name === 'image-empty'" cx="8.5" cy="8.5" r="1.5" />
    <polyline v-if="name === 'image-empty'" points="21 15 16 10 5 21" />

    <circle v-if="name === 'network-empty'" cx="12" cy="12" r="10" />
    <line v-if="name === 'network-empty'" x1="2" y1="12" x2="22" y2="12" />
    <path v-if="name === 'network-empty'" d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />

    <path v-if="name === 'disk-empty'" d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path v-if="name === 'disk-empty'" d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <ellipse v-if="name === 'disk-empty'" cx="12" cy="5" rx="9" ry="3" />

    <path v-if="name === 'docker'" d="M13.962 10.775c-2.43 0-4.411 1.588-4.411 3.538 0 1.95 1.981 3.538 4.411 3.538 2.43 0 4.411-1.588 4.411-3.538 0-1.95-1.981-3.538-4.411-3.538zm-11.233 2.768c-.123-.174-.123-.415 0-.589l1.645-2.334c.123-.174.323-.276.536-.276h3.414c.213 0 .414.102.537.276l1.645 2.334c.123.174.123.415 0 .589l-1.645 2.334c-.123.174-.323.276-.537.276H4.91c-.213 0-.413-.102-.536-.276l-1.645-2.334zM10.37 8.014a.64.64 0 01.637-.637h2.09c.35 0 .636.286.636.637v2.09a.638.638 0 01-.636.637h-2.09a.64.64 0 01-.637-.637V8.014zm3.363 0a.64.64 0 01.636-.637h2.09c.35 0 .637.286.637.637v2.09a.639.639 0 01-.637.637h-2.09a.64.64 0 01-.636-.637V8.014z" />

    <rect v-if="name === 'server'" x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect v-if="name === 'server'" x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line v-if="name === 'server'" x1="6" y1="6" x2="6.01" y2="6" />
    <line v-if="name === 'server'" x1="6" y1="18" x2="6.01" y2="18" />

    <polyline v-if="name === 'code'" points="16 18 22 12 16 6" />
    <polyline v-if="name === 'code'" points="8 6 2 12 8 18" />

    <ellipse v-if="name === 'database'" cx="12" cy="5" rx="9" ry="3" />
    <path v-if="name === 'database'" d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path v-if="name === 'database'" d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />

    <polygon v-if="name === 'layer'" points="12 2 2 7 12 12 22 7 12 2" />
    <polyline v-if="name === 'layer'" points="2 17 12 22 22 17" />
    <polyline v-if="name === 'layer'" points="2 12 12 17 22 12" />

    <line v-if="name === 'close'" x1="18" y1="6" x2="6" y2="18" />
    <line v-if="name === 'close'" x1="6" y1="6" x2="18" y2="18" />

    <circle v-if="name === 'settings'" cx="12" cy="12" r="3" />
    <path v-if="name === 'settings'" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    <path v-if="name === 'dns'" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />

    <path v-if="name === 'save'" d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline v-if="name === 'save'" points="17 21 17 13 7 13 7 21" />
    <polyline v-if="name === 'save'" points="7 3 7 8 15 8" />

    <path v-if="name === 'link'" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path v-if="name === 'link'" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />

    <path v-if="name === 'folder'" d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />

    <polyline v-if="name === 'check'" points="20 6 9 17 4 12" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  size?: number;
  color?: string;
}>();
</script>
