/**
 * A-Core Database Studio - Master App Bootstrapper
 */
import { store } from './store.js';
import { api } from './api.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { DataGrid } from './components/DataGrid.js';
import { SchemaViewer } from './components/SchemaViewer.js';
import { SqlEditor } from './components/SqlEditor.js';
import { ExportImport } from './components/ExportImport.js';
import { ServerMonitor } from './components/ServerMonitor.js';
import { Toast } from './utils/toast.js';
import { Modal } from './components/Modal.js';
import { Formatter } from './utils/formatter.js';

class App {
    constructor() {
        this.tabsContainer = document.getElementById('view-tabs-container');
        this.contentArea = document.getElementById('tab-content-area');
        this.connectionModal = document.getElementById('connection-modal');
    }

    async init() {
        // Initialize Theme
        const theme = store.getState().theme;
        document.documentElement.className = theme;

        // Initialize Header & Sidebar
        Header.init();
        Sidebar.init();

        // Subscribe to Store changes
        store.subscribe((event, state, payload) => {
            this.handleStateChange(event, state, payload);
        });

        // Listen for auth required events
        window.addEventListener('auth:required', () => {
            this.showConnectionModal();
        });

        // Check authentication / connection state
        await store.checkAuthStatus();

        if (!store.getState().auth.connected) {
            this.showConnectionModal();
        } else {
            this.renderTabs();
            this.renderActiveView();
        }
    }

    handleStateChange(event, state, payload) {
        if (event === 'auth:connected') {
            this.hideConnectionModal();
            this.renderTabs();
            this.renderActiveView();
            this.updateFooter();
        } else if (['auth:disconnected', 'appAuth:updated', 'appAuth:logout', 'appAuth:login'].includes(event)) {
            this.showConnectionModal();
            this.updateFooter();
        } else if (['table:selected', 'database:selected', 'tab:changed'].includes(event)) {
            this.renderTabs();
            this.renderActiveView();
            this.updateFooter();
        }
    }

    renderTabs() {
        if (!this.tabsContainer) return;
        const state = store.getState();

        if (!state.auth.connected) {
            this.tabsContainer.innerHTML = '';
            return;
        }

        const tabs = [
            { id: 'data', label: 'ข้อมูลตาราง (Browse Data)', icon: 'fa-table-cells', disabled: !state.activeTable },
            { id: 'structure', label: 'โครงสร้าง (Structure)', icon: 'fa-diagram-project', disabled: !state.activeTable },
            { id: 'sql', label: 'SQL Console', icon: 'fa-terminal', disabled: false },
            { id: 'export_import', label: 'Export / Import', icon: 'fa-file-export', disabled: !state.activeDatabase },
            { id: 'server', label: 'Server Monitor', icon: 'fa-server', disabled: false },
        ];

        this.tabsContainer.innerHTML = `
            <div class="flex items-center space-x-1 text-xs">
                ${tabs.map(tab => {
                    const isActive = state.activeTab === tab.id;
                    const isDisabled = tab.disabled;
                    return `
                        <button class="nav-tab-btn px-3.5 py-2 rounded-t-xl font-medium transition flex items-center gap-2 ${
                            isDisabled ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600' :
                            isActive ? 'bg-indigo-50/70 dark:bg-slate-900/90 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-500 font-semibold' : 
                            'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                        }" data-tab="${tab.id}" ${isDisabled ? 'disabled' : ''}>
                            <i class="fa-solid ${tab.icon} text-xs"></i>
                            <span>${tab.label}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;

        this.tabsContainer.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.onclick = () => {
                const tabId = btn.getAttribute('data-tab');
                store.setActiveTab(tabId);
            };
        });
    }

    renderActiveView() {
        if (!this.contentArea) return;
        const state = store.getState();

        if (!state.auth.connected) {
            this.contentArea.innerHTML = '';
            return;
        }

        const tab = state.activeTab;

        if (tab !== 'server') {
            ServerMonitor.destroy();
        }

        if (tab === 'data') {
            DataGrid.init(this.contentArea);
        } else if (tab === 'structure') {
            SchemaViewer.init(this.contentArea);
        } else if (tab === 'sql') {
            SqlEditor.init(this.contentArea);
        } else if (tab === 'export_import') {
            ExportImport.init(this.contentArea);
        } else if (tab === 'server') {
            ServerMonitor.init(this.contentArea);
        }
    }

    updateFooter() {
        const state = store.getState();
        const activeInfo = document.getElementById('footer-active-info');
        const dbStatus = document.getElementById('footer-db-status');

        if (state.auth.connected) {
            if (activeInfo) {
                activeInfo.innerHTML = `
                    <span class="text-slate-300 font-semibold">${Formatter.escapeHtml(state.activeDatabase || 'No DB Selected')}</span>
                    ${state.activeTable ? ` <span class="text-slate-500">/</span> <span class="text-indigo-400 font-mono font-semibold">${Formatter.escapeHtml(state.activeTable)}</span>` : ''}
                `;
            }
            if (dbStatus) {
                dbStatus.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span class="text-emerald-400 font-medium">Connected (${Formatter.escapeHtml(state.auth.user)}@${Formatter.escapeHtml(state.auth.host)})</span>
                `;
            }
        } else {
            if (activeInfo) activeInfo.textContent = 'Disconnected';
            if (dbStatus) {
                dbStatus.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-slate-600"></span>
                    <span class="text-slate-500">Not Connected</span>
                `;
            }
        }
    }

    async showConnectionModal() {
        if (!this.connectionModal) return;
        const state = store.getState();

        // 1. If App Master Authentication is required and not yet authenticated
        if (state.appAuth.required && !state.appAuth.authenticated) {
            this.connectionModal.innerHTML = `
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 space-y-6 text-slate-800 dark:text-slate-100">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl shadow-lg shadow-indigo-500/25">
                                <i class="fa-solid fa-shield-halved"></i>
                            </div>
                            <div>
                                <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">A-Core Security Gate</h2>
                                <p class="text-xs text-slate-500 dark:text-slate-400">กรุณายืนยันตัวตนเพื่อเข้าใช้งานระบบ</p>
                            </div>
                        </div>
                        <button type="button" id="login-theme-btn" class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition">
                            <i class="fa-solid ${state.theme === 'dark' ? 'fa-moon text-indigo-400' : 'fa-sun text-amber-500'} text-xs"></i>
                        </button>
                    </div>

                    <form id="app-login-form" class="space-y-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Username (ชื่อผู้ใช้ระบบ) *</label>
                            <div class="relative">
                                <input type="text" id="app-login-user" value="" placeholder="admin" required
                                    class="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono">
                                <i class="fa-solid fa-user text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"></i>
                            </div>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Password (รหัสผ่านระบบ) *</label>
                            <div class="relative">
                                <input type="password" id="app-login-pass" value="" placeholder="••••••••" required
                                    class="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono">
                                <i class="fa-solid fa-lock text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"></i>
                            </div>
                        </div>

                        <button type="submit" id="btn-submit-app-login" class="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition">
                            <i class="fa-solid fa-arrow-right-to-bracket text-xs"></i>
                            <span>เข้าสู่ระบบ (Sign In)</span>
                        </button>
                    </form>

                    <div class="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                        <i class="fa-solid fa-lock text-[10px] mr-1"></i> ระบบล็อกความปลอดภัย A-Core DB Studio
                    </div>
                </div>
            `;

            this.connectionModal.classList.remove('hidden');

            const loginThemeBtn = document.getElementById('login-theme-btn');
            if (loginThemeBtn) {
                loginThemeBtn.onclick = () => {
                    store.toggleTheme();
                    this.showConnectionModal();
                };
            }

            const appForm = document.getElementById('app-login-form');
            if (appForm) {
                appForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const u = document.getElementById('app-login-user').value.trim();
                    const p = document.getElementById('app-login-pass').value;
                    const btn = document.getElementById('btn-submit-app-login');
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังเข้าสู่ระบบ...';
                    try {
                        await store.appLogin(u, p);
                    } catch (err) {
                        Toast.error(err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket text-xs"></i> <span>เข้าสู่ระบบ (Sign In)</span>';
                    }
                };
            }
            return;
        }

        // 2. Database Connection Portal
        let profiles = [];
        try {
            const res = await api.get('/auth/profiles', {}, { silent: true });
            profiles = res.data || [];
        } catch {
            profiles = [];
        }

        this.connectionModal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden p-8 space-y-6 text-slate-800 dark:text-slate-100">
                
                <!-- Modal Branding Header -->
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl shadow-xl shadow-indigo-500/25">
                            <i class="fa-solid fa-database"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                                A-Core DB Studio
                            </h2>
                            <p class="text-xs text-slate-500 dark:text-slate-400">เชื่อมต่อฐานข้อมูล MySQL / MariaDB</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" id="login-theme-btn" title="สลับโหมดสว่าง/มืด" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition">
                            <i class="fa-solid ${store.getState().theme === 'dark' ? 'fa-moon text-indigo-400' : 'fa-sun text-amber-500'} text-sm"></i>
                        </button>
                        ${state.appAuth.required ? `
                            <button type="button" id="app-logout-btn" title="ล็อกระบบ / ออกจากระบบ" class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-600 hover:text-white border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition">
                                <i class="fa-solid fa-lock text-sm"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Quick Profiles Selector -->
                ${profiles.length > 0 ? `
                    <div class="space-y-1.5">
                        <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">โปรไฟล์การเชื่อมต่อด่วน (Saved Profiles)</label>
                        <div class="flex flex-wrap gap-2">
                            ${profiles.map((p, idx) => `
                                <button type="button" class="btn-profile-preset px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
                                    data-host="${Formatter.escapeHtml(p.host)}"
                                    data-port="${Formatter.escapeHtml(p.port)}"
                                    data-user="${Formatter.escapeHtml(p.user)}"
                                    data-password="${Formatter.escapeHtml(p.password)}"
                                    data-db="${Formatter.escapeHtml(p.database || '')}">
                                    <i class="fa-solid fa-server text-indigo-500 text-[10px]"></i>
                                    <span>${Formatter.escapeHtml(p.name)}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Connection Form -->
                <form id="connect-form" class="space-y-4 text-xs">
                    <div class="grid grid-cols-3 gap-3">
                        <div class="col-span-2">
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Host / Server IP *</label>
                            <input type="text" id="conn-host" value="127.0.0.1" placeholder="127.0.0.1 หรือ localhost" required
                                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Port *</label>
                            <input type="number" id="conn-port" value="3306" placeholder="3306" required
                                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                            <input type="text" id="conn-user" value="root" placeholder="root" required
                                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                            <input type="password" id="conn-password" value="" placeholder="รหัสผ่าน MySQL"
                                class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono">
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Database (ไม่จำเป็น)</label>
                        <input type="text" id="conn-database" value="" placeholder="ระบุชื่อฐานข้อมูลที่ต้องการเปิดทันที"
                            class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono">
                    </div>

                    <div class="flex items-center justify-between pt-2">
                        <label class="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition">
                            <input type="checkbox" id="conn-save-profile" class="rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0">
                            <span>บันทึกเป็นโปรไฟล์สำหรับการใช้งานครั้งถัดไป</span>
                        </label>
                    </div>

                    <button type="submit" id="btn-submit-connect" class="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition">
                        <i class="fa-solid fa-plug text-xs"></i>
                        <span>เชื่อมต่อฐานข้อมูล (Connect)</span>
                    </button>
                </form>

            </div>
        `;

        this.connectionModal.classList.remove('hidden');

        // Theme toggle in login modal
        const loginThemeBtn = document.getElementById('login-theme-btn');
        if (loginThemeBtn) {
            loginThemeBtn.onclick = () => {
                store.toggleTheme();
                this.showConnectionModal();
            };
        }

        const appLogoutBtn = document.getElementById('app-logout-btn');
        if (appLogoutBtn) {
            appLogoutBtn.onclick = async () => {
                await store.appLogout();
                this.showConnectionModal();
            };
        }

        // Preset button clicks
        this.connectionModal.querySelectorAll('.btn-profile-preset').forEach(btn => {
            btn.onclick = () => {
                document.getElementById('conn-host').value = btn.getAttribute('data-host');
                document.getElementById('conn-port').value = btn.getAttribute('data-port');
                document.getElementById('conn-user').value = btn.getAttribute('data-user');
                document.getElementById('conn-password').value = btn.getAttribute('data-password');
                document.getElementById('conn-database').value = btn.getAttribute('data-db');
            };
        });

        // Form Submit
        const form = document.getElementById('connect-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const host = document.getElementById('conn-host').value.trim();
            const port = document.getElementById('conn-port').value.trim();
            const user = document.getElementById('conn-user').value.trim();
            const password = document.getElementById('conn-password').value;
            const database = document.getElementById('conn-database').value.trim();
            const saveProfile = document.getElementById('conn-save-profile').checked;

            const btn = document.getElementById('btn-submit-connect');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังเชื่อมต่อ...';

            try {
                const res = await api.post('/auth/connect', {
                    host,
                    port,
                    user,
                    password,
                    database,
                    save_profile: saveProfile,
                    profile_name: saveProfile ? `${user}@${host}` : ''
                });

                Toast.success(res.message || 'เชื่อมต่อสำเร็จ');
                await store.checkAuthStatus();
            } catch (err) {
                Toast.error(err.message || 'เชื่อมต่อล้มเหลว: ' + err.message);
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-plug text-xs mr-2"></i> <span>เชื่อมต่อฐานข้อมูล (Connect)</span>';
            }
        };
    }

    hideConnectionModal() {
        if (this.connectionModal) {
            this.connectionModal.classList.add('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
