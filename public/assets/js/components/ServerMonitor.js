/**
 * ServerMonitor Component (Process List, Variables, Server Performance)
 */
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';
import { Modal } from './Modal.js';
import { Formatter } from '../utils/formatter.js';

export const ServerMonitor = {
    container: null,
    statusData: null,
    processes: [],
    variables: [],
    varSearch: '',
    activeTab: 'processes', // processes | status | variables

    init(targetContainer) {
        this.container = targetContainer;
        this.loadData();
    },

    async loadData() {
        this.renderLoading();
        try {
            const [statusRes, procRes] = await Promise.all([
                api.get('/server/status'),
                api.get('/server/processes'),
            ]);

            this.statusData = statusRes.data;
            this.processes = procRes.data || [];
            this.render();
        } catch (e) {
            this.renderError(e.message);
        }
    },

    renderLoading() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="flex items-center justify-center h-64 text-slate-400 text-sm">
                <i class="fa-solid fa-spinner fa-spin mr-3 text-indigo-400 text-xl"></i>
                <span>กำลังโหลดข้อมูลสถานะเซิร์ฟเวอร์...</span>
            </div>
        `;
    },

    renderError(msg) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="p-6 bg-rose-950/30 border border-rose-900/50 rounded-2xl text-rose-300 text-sm">
                <div class="font-semibold mb-1"><i class="fa-solid fa-triangle-exclamation"></i> เกิดข้อผิดพลาด</div>
                <p class="text-xs font-mono">${Formatter.escapeHtml(msg)}</p>
            </div>
        `;
    },

    render() {
        if (!this.container) return;
        const s = this.statusData || {};

        this.container.innerHTML = `
            <div class="max-w-6xl mx-auto space-y-6 pb-12">
                
                <!-- Server Metrics Overview Cards -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1 shadow-lg">
                        <div class="text-slate-400 text-xs flex items-center justify-between">
                            <span>Uptime</span>
                            <i class="fa-solid fa-clock text-indigo-400"></i>
                        </div>
                        <div class="text-lg font-bold text-slate-100">${this.formatUptime(s.uptime || 0)}</div>
                        <div class="text-[11px] text-slate-500 font-mono">MySQL ${Formatter.escapeHtml(s.variables?.version || '')}</div>
                    </div>

                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1 shadow-lg">
                        <div class="text-slate-400 text-xs flex items-center justify-between">
                            <span>Threads Active</span>
                            <i class="fa-solid fa-bolt text-emerald-400"></i>
                        </div>
                        <div class="text-lg font-bold text-emerald-400">${Formatter.formatNumber(s.threads_connected || 0)} <span class="text-xs font-normal text-slate-400">conn</span></div>
                        <div class="text-[11px] text-slate-500 font-mono">Running: ${s.threads_running || 0}</div>
                    </div>

                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1 shadow-lg">
                        <div class="text-slate-400 text-xs flex items-center justify-between">
                            <span>Total Queries</span>
                            <i class="fa-solid fa-chart-line text-cyan-400"></i>
                        </div>
                        <div class="text-lg font-bold text-cyan-300">${Formatter.formatNumber(s.queries || s.questions || 0)}</div>
                        <div class="text-[11px] text-slate-500 font-mono">Slow: ${s.slow_queries || 0}</div>
                    </div>

                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-1 shadow-lg">
                        <div class="text-slate-400 text-xs flex items-center justify-between">
                            <span>Traffic (In / Out)</span>
                            <i class="fa-solid fa-network-wired text-amber-400"></i>
                        </div>
                        <div class="text-xs font-semibold text-slate-200 mt-1 font-mono space-y-1">
                            <div class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <i class="fa-solid fa-arrow-down text-[10px]"></i>
                                <span>In: ${Formatter.formatBytes(s.bytes_received || 0)}</span>
                            </div>
                            <div class="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                <i class="fa-solid fa-arrow-up text-[10px]"></i>
                                <span>Out: ${Formatter.formatBytes(s.bytes_sent || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div class="flex space-x-2 text-xs">
                        <button id="srvtab-proc" class="px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${this.activeTab === 'processes' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white bg-slate-900/60'}">
                            <i class="fa-solid fa-list-check"></i>
                            <span>Process List (${this.processes.length})</span>
                        </button>
                        <button id="srvtab-vars" class="px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${this.activeTab === 'variables' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white bg-slate-900/60'}">
                            <i class="fa-solid fa-gears"></i>
                            <span>System Variables</span>
                        </button>
                    </div>

                    <button id="srv-refresh-btn" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition">
                        <i class="fa-solid fa-arrows-rotate"></i>
                        <span>รีเฟรช</span>
                    </button>
                </div>

                <!-- Tab Panels Area -->
                ${this.activeTab === 'processes' ? this.renderProcesses() : this.renderVariables()}

            </div>
        `;

        this.bindEvents();
    },

    renderProcesses() {
        return `
            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs font-mono">
                        <thead class="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                            <tr>
                                <th class="px-4 py-3">ID</th>
                                <th class="px-4 py-3">User</th>
                                <th class="px-4 py-3">Host</th>
                                <th class="px-4 py-3">Database</th>
                                <th class="px-4 py-3">Command</th>
                                <th class="px-4 py-3">Time</th>
                                <th class="px-4 py-3">State</th>
                                <th class="px-4 py-3">Info / Query</th>
                                <th class="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80">
                            ${this.processes.length === 0 ? `
                                <tr><td colspan="9" class="p-6 text-center text-slate-500 font-sans">ไม่มี Process ที่กำลังทำงาน</td></tr>
                            ` : this.processes.map(p => {
                                const timeStr = p.Time !== null && p.Time !== undefined ? `${p.Time}s` : '-';
                                return `
                                    <tr class="hover:bg-slate-800/50 transition">
                                        <td class="px-4 py-3 text-indigo-500 font-bold">${p.Id}</td>
                                        <td class="px-4 py-3 text-slate-300">${Formatter.escapeHtml(p.User)}</td>
                                        <td class="px-4 py-3 text-slate-400 truncate max-w-[120px]">${Formatter.escapeHtml(p.Host)}</td>
                                        <td class="px-4 py-3 text-cyan-400 font-semibold">${Formatter.escapeHtml(p.db || '-')}</td>
                                        <td class="px-4 py-3">
                                            <span class="px-2 py-0.5 rounded text-[10px] ${p.Command === 'Query' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">
                                                ${Formatter.escapeHtml(p.Command)}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-amber-600 dark:text-amber-400 font-bold">${timeStr}</td>
                                        <td class="px-4 py-3 text-slate-400">${Formatter.escapeHtml(p.State || '-')}</td>
                                        <td class="px-4 py-3 text-slate-200 max-w-xs truncate" title="${Formatter.escapeHtml(p.Info || '')}">
                                            ${Formatter.escapeHtml(p.Info || '-')}
                                        </td>
                                        <td class="px-4 py-3 text-right font-sans">
                                            <button class="btn-kill-proc px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-950/40 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 transition text-xs font-medium" data-proc-id="${p.Id}">
                                                <i class="fa-solid fa-power-off mr-1"></i> Kill
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderVariables() {
        return `
            <div class="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <div class="flex items-center gap-3">
                    <div class="relative flex-1">
                        <input type="text" id="srv-var-search" placeholder="ค้นหาตัวแปร MySQL เช่น max_connections, buffer..." value="${Formatter.escapeHtml(this.varSearch)}"
                            class="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500">
                        <i class="fa-solid fa-magnifying-glass text-slate-500 text-xs absolute left-2.5 top-1/2 -translate-y-1/2"></i>
                    </div>
                    <button id="btn-search-vars" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition">
                        ค้นหา
                    </button>
                </div>

                <div class="overflow-x-auto max-h-[500px]">
                    <table class="w-full text-left text-xs font-mono">
                        <thead class="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                            <tr>
                                <th class="px-4 py-2.5">Variable Name</th>
                                <th class="px-4 py-2.5">Value</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80">
                            ${this.variables.length === 0 ? `
                                <tr><td colspan="2" class="p-6 text-center text-slate-500 font-sans">กดค้นหาหรือพิมพ์ชื่อตัวแปรที่ต้องการดู</td></tr>
                            ` : this.variables.map(v => `
                                <tr class="hover:bg-slate-800/50">
                                    <td class="px-4 py-2 font-semibold text-indigo-300">${Formatter.escapeHtml(v.Variable_name)}</td>
                                    <td class="px-4 py-2 text-slate-200 break-all">${Formatter.escapeHtml(v.Value)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    bindEvents() {
        document.getElementById('srvtab-proc')?.addEventListener('click', () => {
            this.activeTab = 'processes';
            this.render();
        });

        document.getElementById('srvtab-vars')?.addEventListener('click', async () => {
            this.activeTab = 'variables';
            if (this.variables.length === 0) {
                await this.loadVariables();
            }
            this.render();
        });

        document.getElementById('srv-refresh-btn')?.addEventListener('click', () => {
            this.loadData();
        });

        // Kill Process
        this.container.querySelectorAll('.btn-kill-proc').forEach(btn => {
            btn.onclick = () => {
                const procId = btn.getAttribute('data-proc-id');
                Modal.confirm('ยุติ Process', `คุณต้องการ Kill Process #${procId} หรือไม่?`, {
                    danger: true,
                    confirmText: 'Kill Process',
                    onConfirm: async () => {
                        await api.post('/server/kill-process', { id: procId });
                        Toast.success(`ยุติ Process #${procId} แล้ว`);
                        this.loadData();
                    }
                });
            };
        });

        // Variables Search
        const varSearchInput = document.getElementById('srv-var-search');
        const btnSearch = document.getElementById('btn-search-vars');
        if (varSearchInput && btnSearch) {
            const doSearch = async () => {
                this.varSearch = varSearchInput.value.trim();
                await this.loadVariables();
                this.render();
            };

            btnSearch.onclick = doSearch;
            varSearchInput.onkeydown = (e) => {
                if (e.key === 'Enter') doSearch();
            };
        }
    },

    async loadVariables() {
        try {
            const res = await api.get('/server/variables', { search: this.varSearch });
            this.variables = res.data || [];
        } catch (e) {
            Toast.error(e.message);
        }
    },

    formatUptime(seconds) {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${d}d ${h}h ${m}m ${s}s`;
    }
};
