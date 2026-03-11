import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import ProjectsView from '../views/ProjectsView.vue';
import NginxProxyView from '../views/NginxProxyView.vue';
import DnsManagerView from '../views/DnsManagerView.vue';
import SettingsView from '../views/SettingsView.vue';
import CleanupView from '../views/CleanupView.vue';

const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', name: 'Dashboard', component: DashboardView },
    { path: '/nginx', name: 'NginxProxy', component: NginxProxyView },
    { path: '/dns', name: 'DnsManager', component: DnsManagerView },
    { path: '/projects', name: 'Projects', component: ProjectsView },
    { path: '/settings', name: 'Settings', component: SettingsView },
    { path: '/cleanup', name: 'Cleanup', component: CleanupView },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
