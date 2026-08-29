/**
 * ServerMonitor Component (Real-Time Process List, Variables, Live Resource Usage Bars)
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
    timer: null,
    autoRefresh: true,
    refreshInterval: 1000, // 1000 ms (1 second)
    isPolling: false,

    init(targetContainer) {
        this.container = targetContainer;
        this.loadData();
        this.startTimer();
    },

    destroy() {
        this.stopTimer();
    },

    startTimer() {
        this.stopTimer();
        if (!this.autoRefresh) return;
        this.timer = setInterval(async () => {
            if (this.isPolling) return;
            await this.pollData();
        }, this.refreshInterval);
    },

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    async loadData() {
        if (!this.statusData) {
            this.renderLoading();
        }
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

    async pollData() {
        this.isPolling = true;
        try {
            const [statusRes, procRes] = await Promise.all([
                api.get('/server/status'),
                api.get('/server/processes'),
            ]);

            this.statusData = statusRes.data;
            this.processes = procRes.data || [];
            
            // Update in-place without re-rendering the whole page to prevent flicker
            this.updateLiveMetrics();
        } catch (e) {
            // Silently ignore background polling network blips
        } finally {
            this.isPolling = false;
        }
    },

    updateLiveMetrics() {
        if (!this.container) return;
        const s = this.statusData || {};

        const maxConn = s.max_connections || 151;
        const conn = s.threads_connected || 0;
        const connPct = s.connection_percent || (maxConn > 0 ? Math.round((conn / maxConn) * 100) : 0);

        const bufferTotal = s.buffer_pool_size || 0;
        const bufferUsed = s.buffer_used_bytes || 0;
        const bufferPct = s.buffer_percent || 0;

        const openTables = s.open_tables || 0;
        const tableCache = s.table_open_cache || 400;
        const tableCachePct = s.table_cache_percent || 0;

        // Uptime
        const uptimeEl = document.getElementById('srv-uptime-val');
        if (uptimeEl) uptimeEl.textContent = this.formatUptime(s.uptime || 0);

        // Card 1: Connections
        const connVal = document.getElementById('srv-conn-val');
        if (connVal) connVal.innerHTML = `${conn} <span class="text-xs font-normal text-slate-400">/ ${maxConn} (${connPct}%)</span>`;
        const connBar = document.getElementById('srv-conn-bar');
        if (connBar) {
            connBar.style.width = `${Math.min(100, Math.max(2, connPct))}%`;
            connBar.className = `h-full rounded-full transition-all duration-500 ${connPct > 85 ? 'bg-rose-500' : (connPct > 60 ? 'bg-amber-500' : 'bg-emerald-500')}`;
        }
        const connSub = document.getElementById('srv-conn-sub');
        if (connSub) connSub.textContent = `Running: ${s.threads_running || 0} | Peak: ${s.max_used_connections || conn}`;

        // Card 2: Buffer Pool (RAM)
        const bufVal = document.getElementById('srv-buf-val');
        if (bufVal) bufVal.innerHTML = `${Formatter.formatBytes(bufferUsed)} <span class="text-xs font-normal text-slate-400">/ ${Formatter.formatBytes(bufferTotal)} (${bufferPct}%)</span>`;
        const bufBar = document.getElementById('srv-buf-bar');
        if (bufBar) bufBar.style.width = `${Math.min(100, Math.max(2, bufferPct))}%`;

        // Card 3: Table Cache
        const cacheVal = document.getElementById('srv-cache-val');
        if (cacheVal) cacheVal.innerHTML = `${openTables} <span class="text-xs font-normal text-slate-400">/ ${tableCache} (${tableCachePct}%)</span>`;
        const cacheBar = document.getElementById('srv-cache-bar');
        if (cacheBar) cacheBar.style.width = `${Math.min(100, Math.max(2, tableCachePct))}%`;

        // Card 4: Queries & Traffic
        const queriesVal = document.getElementById('srv-queries-val');
        if (queriesVal) queriesVal.textContent = Formatter.formatNumber(s.queries || s.questions || 0);
        const trafficIn = document.getElementById('srv-traffic-in');
        if (trafficIn) trafficIn.textContent = `In: ${Formatter.formatBytes(s.bytes_received || 0)}`;
        const trafficOut = document.getElementById('srv-traffic-out');
        if (trafficOut) trafficOut.textContent = `Out: ${Formatter.formatBytes(s.bytes_sent || 0)}`;

        // Detailed Gauge 1: Connections
        const gConnPct = document.getElementById('gauge-conn-pct');
        if (gConnPct) gConnPct.textContent = `${connPct}%`;
        const gConnDetail = document.getElementById('gauge-conn-detail');
        if (gConnDetail) gConnDetail.textContent = `${conn} / ${maxConn} connections`;
        const gConnBar = document.getElementById('gauge-conn-bar');
        if (gConnBar) {
            gConnBar.style.width = `${Math.min(100, Math.max(2, connPct))}%`;
            gConnBar.className = `h-full rounded-full transition-all duration-500 ${connPct > 85 ? 'bg-rose-500' : (connPct > 60 ? 'bg-amber-500' : 'bg-emerald-500')}`;
        }

        // Detailed Gauge 2: Buffer
        const gBufPct = document.getElementById('gauge-buf-pct');
        if (gBufPct) gBufPct.textContent = `${bufferPct}%`;
        const gBufDetail = document.getElementById('gauge-buf-detail');
        if (gBufDetail) gBufDetail.textContent = `${Formatter.formatBytes(bufferUsed)} / ${Formatter.formatBytes(bufferTotal)}`;
        const gBufBar = document.getElementById('gauge-buf-bar');
        if (gBufBar) gBufBar.style.width = `${Math.min(100, Math.max(2, bufferPct))}%`;

        // Detailed Gauge 3: Cache
        const gCachePct = document.getElementById('gauge-cache-pct');
        if (gCachePct) gCachePct.textContent = `${tableCachePct}%`;
        const gCacheDetail = document.getElementById('gauge-cache-detail');
        if (gCacheDetail) gCacheDetail.textContent = `${openTables} / ${tableCache} tables`;
        const gCacheBar = document.getElementById('gauge-cache-bar');
        if (gCacheBar) gCacheBar.style.width = `${Math.min(100, Math.max(2, tableCachePct))}%`;

        // Process List Count
        const procCountBadge = document.getElementById('srv-proc-count');
        if (procCountBadge) procCountBadge.textContent = this.processes.length;

        // Process List Table Rows (if on processes tab)
        if (this.activeTab === 'processes') {
            const tableBody = document.getElementById('srv-proc-tbody');
            if (tableBody) {
                tableBody.innerHTML = this.renderProcessRows();
                this.bindKillButtons();
            }
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

        const maxConn = s.max_connections || 151;
        const conn = s.threads_connected || 0;
        const connPct = s.connection_percent || (maxConn > 0 ? Math.round((conn / maxConn) * 100) : 0);

        const bufferTotal = s.buffer_pool_size || 0;
        const bufferUsed = s.buffer_used_bytes || 0;
        const bufferPct = s.buffer_percent || 0;

        const openTables = s.open_tables || 0;
        const tableCache = s.table_open_cache || 400;
        const tableCachePct = s.table_cache_percent || 0;

        this.container.innerHTML = `
            <div class="max-w-6xl mx-auto space-y-6 pb-12">
                
                <!-- 4 Top Cards with Progress Loaders -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <!-- Card 1: MySQL Connections Gauge -->
                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-lg">
                        <div class="text-slate-400 text-xs flex items-center justify-between">
                            <span class="font-semibold">MySQL Connections</span>
                            <i class="fa-solid fa-bolt text-emerald-400"></i>
                        </div>
                        <div>
                            <div id="srv-conn-val" class="text-base font-bold text-slate-100">
                                ${conn} <span class="text-xs font-normal text-slate-400">/ ${maxConn} (${connPct}%)</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-1.5">
                                <div id="srv-conn-bar" class="h-full rounded-full transition-all duration-500 ${connPct > 85 ? 'bg-rose-500' : (connPct > 60 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${Math.min(100, Math.max(2, connPct))}%"></div>
                            </div>
                        </div>
                        <div id="srv-conn-sub" class="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
                            <span>Running: ${s.threads_running || 0}</span>
                            <span>Peak: ${s.max_used_connections || conn}</span>
                        </div>
                    </div>

                    <!-- Card 2: InnoDB Buffer Pool (RAM Usage) -->
                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-lg">
                        <div class="text-slate-400 text-xs flex items-center justify-between">
                            <span class="font-semibold">InnoDB Buffer (RAM)</span>
                            <i class="fa-solid fa-microchip text-indigo-400"></i>
                        </div>
                        <div>
                            <div id="srv-buf-val" class="text-base font-bold text-slate-100">
                                ${Formatter.formatBytes(bufferUsed)} <span class="text-xs font-normal text-slate-400">/ ${Formatter.formatBytes(bufferTotal)} (${bufferPct}%)</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-1.5">
                                <div id="srv-buf-bar" class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500" style="width: ${Math.min(100, Math.max(2, bufferPct))}%"></div>
                            </div>
                        </div>
                        <div class="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
                            <span>Memory Pool</span>
                            <span class="text-indigo-400 font-semibold">${bufferPct}% Used</span>
                        </div>
                    </div>

                    <!-- Card 3: Table Cache Open -->
                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-lg">
                        <div class="text-slate-400 text-xs flex items-center justify-between">
                            <span class="font-semibold">Table Open Cache</span>
                            <i class="fa-solid fa-database text-cyan-400"></i>
                        </div>
                        <div>
                            <div id="srv-cache-val" class="text-base font-bold text-slate-100">
                                ${openTables} <span class="text-xs font-normal text-slate-400">/ ${tableCache} (${tableCachePct}%)</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-1.5">
                                <div id="srv-cache-bar" class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500" style="width: ${Math.min(100, Math.max(2, tableCachePct))}%"></div>
                            </div>
                        </div>
                        <div class="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
                            <span>Open Handles</span>
                            <span class="text-cyan-400 font-semibold">${tableCachePct}% Used</span>
                        </div>
                    </div>

                    <!-- Card 4: Uptime & Traffic Overview -->
                    <div class="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-2 shadow-lg">
                        <div class="text-slate-400 text-xs flex items-center justify-between">
                            <span class="font-semibold">Server Uptime</span>
                            <i class="fa-solid fa-clock text-amber-400"></i>
                        </div>
                        <div id="srv-uptime-val" class="text-base font-bold text-slate-100">${this.formatUptime(s.uptime || 0)}</div>
                        <div class="text-[11px] text-slate-400 flex items-center justify-between pt-0.5 font-mono">
                            <span id="srv-traffic-in" class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <i class="fa-solid fa-arrow-down text-[9px]"></i> In: ${Formatter.formatBytes(s.bytes_received || 0)}
                            </span>
                            <span id="srv-traffic-out" class="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <i class="fa-solid fa-arrow-up text-[9px]"></i> Out: ${Formatter.formatBytes(s.bytes_sent || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Detailed Resource Usage Bars (หลอดโหลดแสดงสัดส่วนทรัพยากร) -->
                <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i class="fa-solid fa-chart-pie text-indigo-400"></i>
                            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">สัดส่วนการใช้งานทรัพยากรระบบ (Resource Load & Capacity Gauges)</h3>
                        </div>
                        <div class="text-xs text-slate-400">
                            MySQL ${Formatter.escapeHtml(s.variables?.version || '')} (${Formatter.escapeHtml(s.variables?.version_comment || '')})
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                        
                        <!-- Usage Meter 1: Connections -->
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-medium text-slate-300">Connection Load</span>
                                <span id="gauge-conn-pct" class="font-bold text-emerald-400">${connPct}%</span>
                            </div>
                            <div class="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5">
                                <div id="gauge-conn-bar" class="h-full rounded-full transition-all duration-500 ${connPct > 85 ? 'bg-rose-500' : (connPct > 60 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${Math.min(100, Math.max(2, connPct))}%"></div>
                            </div>
                            <div id="gauge-conn-detail" class="text-[11px] text-slate-400 text-right">${conn} / ${maxConn} connections</div>
                        </div>

                        <!-- Usage Meter 2: InnoDB Buffer Pool (Memory) -->
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-medium text-slate-300">InnoDB Buffer Memory</span>
                                <span id="gauge-buf-pct" class="font-bold text-indigo-400">${bufferPct}%</span>
                            </div>
                            <div class="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5">
                                <div id="gauge-buf-bar" class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500" style="width: ${Math.min(100, Math.max(2, bufferPct))}%"></div>
                            </div>
                            <div id="gauge-buf-detail" class="text-[11px] text-slate-400 text-right">${Formatter.formatBytes(bufferUsed)} / ${Formatter.formatBytes(bufferTotal)}</div>
                        </div>

                        <!-- Usage Meter 3: Table Cache -->
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-medium text-slate-300">Table Open Cache</span>
                                <span id="gauge-cache-pct" class="font-bold text-cyan-400">${tableCachePct}%</span>
                            </div>
                            <div class="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden p-0.5">
                                <div id="gauge-cache-bar" class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500" style="width: ${Math.min(100, Math.max(2, tableCachePct))}%"></div>
                            </div>
                            <div id="gauge-cache-detail" class="text-[11px] text-slate-400 text-right">${openTables} / ${tableCache} tables</div>
                        </div>

                    </div>
                </div>

                <!-- Navigation Tabs & Live Controls -->
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div class="flex space-x-2 text-xs">
                        <button id="srvtab-proc" class="px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${this.activeTab === 'processes' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white bg-slate-900/60'}">
                            <i class="fa-solid fa-list-check"></i>
                            <span>Process List (<span id="srv-proc-count">${this.processes.length}</span>)</span>
                        </button>
                        <button id="srvtab-vars" class="px-4 py-2 rounded-xl font-medium transition flex items-center gap-2 ${this.activeTab === 'variables' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white bg-slate-900/60'}">
                            <i class="fa-solid fa-gears"></i>
                            <span>System Variables</span>
                        </button>
                    </div>

                    <!-- Right Controls: Live Badge, Auto Refresh Interval, Manual Refresh -->
                    <div class="flex items-center gap-2.5">
                        
                        <!-- Live Indicator Badge & Interval Selector -->
                        <div class="flex items-center bg-slate-900/80 border border-slate-800 rounded-xl px-2.5 py-1 text-xs gap-2 shadow-xs">
                            <span class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 ${this.autoRefresh ? 'animate-pulse' : 'opacity-40'}"></span>
                                <span>${this.autoRefresh ? 'Live' : 'Paused'}</span>
                            </span>
                            
                            <select id="srv-interval-select" class="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-500 cursor-pointer">
                                <option value="1000" ${this.refreshInterval === 1000 && this.autoRefresh ? 'selected' : ''}>วิต่อวิ (1s)</option>
                                <option value="2000" ${this.refreshInterval === 2000 && this.autoRefresh ? 'selected' : ''}>2 วินาที</option>
                                <option value="5000" ${this.refreshInterval === 5000 && this.autoRefresh ? 'selected' : ''}>5 วินาที</option>
                                <option value="0" ${!this.autoRefresh ? 'selected' : ''}>ปิดอัปเดตอัตโนมัติ</option>
                            </select>
                        </div>

                        <!-- Manual Refresh Button -->
                        <button id="srv-refresh-btn" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition">
                            <i class="fa-solid fa-arrows-rotate"></i>
                            <span>รีเฟรช</span>
                        </button>
                    </div>
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
                                <th class="px-4 py-3">User & Host</th>
                                <th class="px-4 py-3">Database</th>
                                <th class="px-4 py-3">Command / Activity</th>
                                <th class="px-4 py-3">Duration (หลอดเวลา)</th>
                                <th class="px-4 py-3">State</th>
                                <th class="px-4 py-3">Info / Query</th>
                                <th class="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800/80" id="srv-proc-tbody">
                            ${this.renderProcessRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderProcessRows() {
        if (this.processes.length === 0) {
            return `<tr><td colspan="8" class="p-6 text-center text-slate-500 font-sans">ไม่มี Process ที่กำลังทำงาน</td></tr>`;
        }

        return this.processes.map(p => {
            const time = p.Time !== null && p.Time !== undefined ? Number(p.Time) : 0;
            const timeStr = p.Time !== null && p.Time !== undefined ? `${time}s` : '-';
            
            // Calculate duration progress bar percentage (scale of 0-60s or log for visual)
            const timePct = Math.min(100, Math.max(3, Math.round((time / 60) * 100)));
            let timeBarColor = 'bg-emerald-500';
            if (time > 30) {
                timeBarColor = 'bg-rose-500 animate-pulse';
            } else if (time > 5) {
                timeBarColor = 'bg-amber-500';
            }

            // Command / Activity Badge
            let commandBadge = '';
            if (p.Command === 'Query') {
                commandBadge = `
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        <span>Executing Query</span>
                    </span>
                `;
            } else if (p.Command === 'Sleep') {
                commandBadge = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        <i class="fa-solid fa-moon text-[9px] opacity-70"></i>
                        <span>Idle / Sleep</span>
                    </span>
                `;
            } else if (p.Command === 'Daemon' || p.Command === 'Binlog Dump') {
                commandBadge = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium">
                        <i class="fa-solid fa-server text-[9px]"></i>
                        <span>${Formatter.escapeHtml(p.Command)}</span>
                    </span>
                `;
            } else {
                commandBadge = `
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <span>${Formatter.escapeHtml(p.Command || '-')}</span>
                    </span>
                `;
            }

            // State styling
            let stateHtml = Formatter.escapeHtml(p.State || '-');
            if (p.State && p.State.toLowerCase().includes('lock')) {
                stateHtml = `<span class="px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-500 font-semibold border border-rose-500/30 animate-pulse"><i class="fa-solid fa-lock text-[9px] mr-1"></i> ${Formatter.escapeHtml(p.State)}</span>`;
            } else if (p.State && (p.State.toLowerCase().includes('send') || p.State.toLowerCase().includes('sort') || p.State.toLowerCase().includes('copy'))) {
                stateHtml = `<span class="px-2 py-0.5 rounded text-[10px] bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-medium border border-cyan-500/20"><i class="fa-solid fa-arrows-spin fa-spin text-[9px] mr-1"></i> ${Formatter.escapeHtml(p.State)}</span>`;
            }

            // Duration & Progress Load Bar Logic
            let durationHtml = '';
            if (p.User === 'system user' || p.Time === null || p.Time === undefined) {
                durationHtml = `
                    <div class="text-[11px] text-slate-500 dark:text-slate-400 font-sans flex items-center gap-1">
                        <i class="fa-solid fa-gears text-[10px] opacity-60"></i>
                        <span>เบื้องหลังระบบ</span>
                    </div>
                `;
            } else if (p.Command === 'Sleep') {
                const sleepPct = Math.min(100, Math.max(5, Math.round((time / 300) * 100)));
                durationHtml = `
                    <div class="space-y-1 w-28">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="font-mono text-slate-500 dark:text-slate-400">${timeStr}</span>
                            <span class="text-[9px] text-slate-500 font-sans bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.2 rounded">Idle (พัก)</span>
                        </div>
                        <div class="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div class="h-full rounded-full bg-slate-400/50 dark:bg-slate-600 transition-all duration-300" style="width: ${sleepPct}%"></div>
                        </div>
                    </div>
                `;
            } else {
                // Active Running Query or other commands
                const timePct = Math.min(100, Math.max(5, Math.round((time / 60) * 100)));
                let timeBarColor = 'bg-emerald-500';
                let timeLabel = 'Active';
                let timeTextClass = 'text-emerald-600 dark:text-emerald-400 font-bold';

                if (time > 30) {
                    timeBarColor = 'bg-rose-500 animate-pulse';
                    timeLabel = 'Slow Query';
                    timeTextClass = 'text-rose-600 dark:text-rose-400 font-bold';
                } else if (time > 5) {
                    timeBarColor = 'bg-amber-500';
                    timeLabel = 'Running';
                    timeTextClass = 'text-amber-600 dark:text-amber-400 font-bold';
                }

                durationHtml = `
                    <div class="space-y-1 w-28">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="font-mono ${timeTextClass}">${timeStr}</span>
                            <span class="text-[9px] font-sans ${time > 30 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-semibold'}">${timeLabel}</span>
                        </div>
                        <div class="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-300 ${timeBarColor}" style="width: ${timePct}%"></div>
                        </div>
                    </div>
                `;
            }

            return `
                <tr class="hover:bg-slate-800/50 transition">
                    <td class="px-4 py-3 text-indigo-500 font-bold">#${p.Id}</td>
                    <td class="px-4 py-3 text-slate-300">
                        <div class="font-medium">${Formatter.escapeHtml(p.User)}</div>
                        <div class="text-[10px] text-slate-500 truncate max-w-[130px] font-sans">${Formatter.escapeHtml(p.Host || '-')}</div>
                    </td>
                    <td class="px-4 py-3 text-cyan-400 font-semibold">${Formatter.escapeHtml(p.db || '-')}</td>
                    <td class="px-4 py-3">${commandBadge}</td>
                    
                    <!-- Duration & Progress Load Bar -->
                    <td class="px-4 py-3">
                        ${durationHtml}
                    </td>

                    <td class="px-4 py-3 text-slate-400">${stateHtml}</td>
                    <td class="px-4 py-3 text-slate-200 max-w-xs truncate" title="${Formatter.escapeHtml(p.Info || '')}">
                        ${p.Info ? `<code class="text-[11px] bg-slate-950/60 px-1.5 py-0.5 rounded text-indigo-300 border border-slate-800">${Formatter.escapeHtml(p.Info)}</code>` : '<span class="text-slate-600">-</span>'}
                    </td>
                    <td class="px-4 py-3 text-right font-sans">
                        <button class="btn-kill-proc px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-950/40 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 transition text-xs font-medium" data-proc-id="${p.Id}">
                            <i class="fa-solid fa-power-off mr-1"></i> Kill
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
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

        document.getElementById('srv-refresh-btn')?.addEventListener('click', async () => {
            await this.pollData();
            Toast.success('อัปเดตสถานะเซิร์ฟเวอร์เรียบร้อย');
        });

        // Interval selector change
        const intervalSelect = document.getElementById('srv-interval-select');
        if (intervalSelect) {
            intervalSelect.onchange = (e) => {
                const val = parseInt(e.target.value, 10);
                if (val === 0) {
                    this.autoRefresh = false;
                    this.stopTimer();
                    Toast.info('ปิดการอัปเดตอัตโนมัติแล้ว');
                } else {
                    this.autoRefresh = true;
                    this.refreshInterval = val;
                    this.startTimer();
                    Toast.success(`ตั้งค่าอัปเดตสดทุก ${val / 1000} วินาที`);
                }
                this.render();
            };
        }

        this.bindKillButtons();

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

    bindKillButtons() {
        this.container?.querySelectorAll('.btn-kill-proc').forEach(btn => {
            btn.onclick = () => {
                const procId = btn.getAttribute('data-proc-id');
                Modal.confirm('ยุติ Process', `คุณต้องการ Kill Process #${procId} หรือไม่?`, {
                    danger: true,
                    confirmText: 'Kill Process',
                    onConfirm: async () => {
                        await api.post('/server/kill-process', { id: procId });
                        Toast.success(`ยุติ Process #${procId} แล้ว`);
                        await this.pollData();
                    }
                });
            };
        });
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
