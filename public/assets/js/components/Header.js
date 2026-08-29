/**
 * Header Component
 */
import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';
import { Modal } from './Modal.js';
import { Formatter } from '../utils/formatter.js';

export const Header = {
    init() {
        this.container = document.getElementById('app-header');
        store.subscribe((event, state) => {
            if (['auth:connected', 'auth:disconnected', 'database:selected', 'databases:updated', 'theme:changed'].includes(event)) {
                this.render();
            }
        });
        this.render();
    },

    render() {
        if (!this.container) return;
        const state = store.getState();

        if (!state.auth.connected) {
            this.container.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-md">
                        <i class="fa-solid fa-database text-white text-sm"></i>
                    </div>
                    <span class="font-bold text-base tracking-wide bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        A-Core DB Studio
                    </span>
                </div>
                <div class="text-xs text-slate-400 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-slate-500"></span>
                    <span>Offline / Not Connected</span>
                </div>
            `;
            return;
        }

        const databases = state.databases || [];
        const activeDb = state.activeDatabase || '';

        const dbOptions = databases.map(db => `
            <option value="${Formatter.escapeHtml(db.name)}" ${db.name === activeDb ? 'selected' : ''}>
                ${Formatter.escapeHtml(db.name)} (${db.table_count || 0} tables)
            </option>
        `).join('');

        this.container.innerHTML = `
            <!-- Left: Logo & DB Selector -->
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2.5 cursor-pointer" id="header-logo-btn">
                    <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <i class="fa-solid fa-layer-group text-white text-sm"></i>
                    </div>
                    <div>
                        <div class="font-bold text-sm tracking-wide leading-none bg-gradient-to-r from-indigo-400 to-purple-300 bg-clip-text text-transparent">
                            A-Core DB Studio
                        </div>
                        <div class="text-[10px] text-slate-400 leading-tight">Database Manager</div>
                    </div>
                </div>

                <!-- Database Dropdown Selector -->
                <div class="flex items-center gap-1.5 pl-3 border-l border-slate-800">
                    <div class="relative">
                        <select id="header-db-select" class="appearance-none bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs rounded-xl pl-8 pr-8 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer transition">
                            <option value="">-- เลือกฐานข้อมูล --</option>
                            ${dbOptions}
                        </select>
                        <i class="fa-solid fa-database text-indigo-400 text-xs absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                        <i class="fa-solid fa-chevron-down text-slate-400 text-[10px] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    </div>

                    <button id="header-create-db-btn" title="สร้างฐานข้อมูลใหม่" class="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-400 border border-slate-700 transition">
                        <i class="fa-solid fa-plus text-xs"></i>
                    </button>

                    <button id="header-refresh-btn" title="รีเฟรช" class="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition">
                        <i class="fa-solid fa-arrows-rotate text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Right: Theme Switcher & Connection Profile -->
            <div class="flex items-center gap-3">
                <!-- Theme Toggle Button -->
                <button id="header-theme-btn" title="สลับธีม สว่าง / มืด" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs transition">
                    <i class="fa-solid ${state.theme === 'dark' ? 'fa-moon text-indigo-400' : 'fa-sun text-amber-500'} text-xs"></i>
                    <span class="hidden sm:inline font-medium">${state.theme === 'dark' ? 'Dark' : 'Light'}</span>
                </button>

                <!-- User & Connection Badge -->
                <div class="flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
                    <div class="text-right hidden sm:block">
                        <div class="font-medium text-slate-200">${Formatter.escapeHtml(state.auth.user)}@${Formatter.escapeHtml(state.auth.host)}</div>
                        <div class="text-[10px] text-slate-400">MySQL ${Formatter.escapeHtml(state.auth.server_version || '')}</div>
                    </div>
                    <button id="header-disconnect-btn" title="ออกจากระบบ / สลับการเชื่อมต่อ" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-600 hover:text-white border border-slate-700 text-slate-400 flex items-center justify-center transition">
                        <i class="fa-solid fa-power-off text-xs"></i>
                    </button>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        const dbSelect = document.getElementById('header-db-select');
        if (dbSelect) {
            dbSelect.onchange = (e) => {
                const val = e.target.value;
                if (val) store.selectDatabase(val);
            };
        }

        const createDbBtn = document.getElementById('header-create-db-btn');
        if (createDbBtn) {
            createDbBtn.onclick = () => this.showCreateDbModal();
        }

        const refreshBtn = document.getElementById('header-refresh-btn');
        if (refreshBtn) {
            refreshBtn.onclick = async () => {
                await store.refreshDatabases();
                await store.refreshTables();
                Toast.success('รีเฟรชข้อมูลเรียบร้อย');
            };
        }

        const themeBtn = document.getElementById('header-theme-btn');
        if (themeBtn) {
            themeBtn.onclick = () => store.toggleTheme();
        }

        const disconnectBtn = document.getElementById('header-disconnect-btn');
        if (disconnectBtn) {
            disconnectBtn.onclick = () => {
                Modal.confirm('ออกจากระบบ', 'คุณต้องการตัดการเชื่อมต่อฐานข้อมูลหรือไม่?', {
                    danger: true,
                    confirmText: 'ตัดการเชื่อมต่อ',
                    onConfirm: async () => {
                        await api.post('/auth/disconnect');
                        store.setState({ auth: { connected: false } }, 'auth:disconnected');
                        Toast.info('ตัดการเชื่อมต่อแล้ว');
                    }
                });
            };
        }
    },

    showCreateDbModal() {
        Modal.custom({
            title: '<i class="fa-solid fa-plus text-indigo-400 mr-2"></i> สร้างฐานข้อมูลใหม่ (Create Database)',
            bodyHtml: `
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">ชื่อฐานข้อมูล (Database Name) *</label>
                        <input type="text" id="new-db-name" placeholder="เช่น my_project_db"
                            class="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Character Set</label>
                            <select id="new-db-charset" class="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition">
                                <option value="utf8mb4" selected>utf8mb4 (แนะนำสำหรับไทย/Emoji)</option>
                                <option value="utf8">utf8</option>
                                <option value="latin1">latin1</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Collation</label>
                            <select id="new-db-collation" class="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition">
                                <option value="utf8mb4_unicode_ci" selected>utf8mb4_unicode_ci</option>
                                <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
                                <option value="utf8mb4_0900_ai_ci">utf8mb4_0900_ai_ci</option>
                            </select>
                        </div>
                    </div>
                </div>
            `,
            footerHtml: `
                <button id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition">ยกเลิก</button>
                <button id="modal-submit-create-db" class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">สร้างฐานข้อมูล</button>
            `,
            onOpen: (modalBox) => {
                const nameInput = modalBox.querySelector('#new-db-name');
                nameInput?.focus();

                modalBox.querySelector('#modal-cancel-btn').onclick = () => Modal.close();
                modalBox.querySelector('#modal-submit-create-db').onclick = async () => {
                    const name = nameInput.value.trim();
                    const charset = modalBox.querySelector('#new-db-charset').value;
                    const collation = modalBox.querySelector('#new-db-collation').value;

                    if (!name) {
                        Toast.warning('กรุณาระบุชื่อฐานข้อมูล');
                        return;
                    }

                    try {
                        const res = await api.post('/databases', { name, charset, collation });
                        Toast.success(res.message || 'สร้างฐานข้อมูลสำเร็จ');
                        Modal.close();
                        await store.refreshDatabases();
                        store.selectDatabase(name);
                    } catch (e) {
                        Toast.error(e.message);
                    }
                };
            }
        });
    }
};
