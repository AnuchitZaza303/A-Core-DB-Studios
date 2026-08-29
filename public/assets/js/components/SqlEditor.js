/**
 * SqlEditor Component (SQL Console, Runner, Query History & Explain)
 */
import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';
import { Formatter } from '../utils/formatter.js';

export const SqlEditor = {
    container: null,
    currentSql: '',
    lastResult: null,
    historyList: [],
    activeTab: 'result', // result | history | explain

    init(targetContainer) {
        this.container = targetContainer;
        const state = store.getState();
        if (state.activeTable && !this.currentSql) {
            this.currentSql = `SELECT * FROM \`${state.activeTable}\` LIMIT 50;`;
        } else if (!this.currentSql) {
            this.currentSql = `SHOW TABLES;`;
        }
        this.render();
    },

    render() {
        if (!this.container) return;
        const state = store.getState();

        this.container.innerHTML = `
            <div class="flex flex-col h-full space-y-3">
                
                <!-- SQL Editor Box -->
                <div class="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden flex flex-col flex-shrink-0 shadow-xl">
                    
                    <!-- Editor Header Toolbar -->
                    <div class="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
                            <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
                            <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
                            <span class="text-xs font-bold text-slate-300 ml-2">SQL Query Editor</span>
                            <span class="text-[11px] text-slate-500 font-mono">(${state.activeDatabase || 'No Database'})</span>
                        </div>

                        <!-- Snippet templates -->
                        <div class="flex items-center gap-1.5 text-xs">
                            <button class="sql-snippet-btn px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition" data-snippet="SELECT * FROM \`${state.activeTable || 'table'}\` LIMIT 50;">SELECT</button>
                            <button class="sql-snippet-btn px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition" data-snippet="INSERT INTO \`${state.activeTable || 'table'}\` () VALUES ();">INSERT</button>
                            <button class="sql-snippet-btn px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition" data-snippet="UPDATE \`${state.activeTable || 'table'}\` SET  WHERE ;">UPDATE</button>
                            <button class="sql-snippet-btn px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition" data-snippet="DELETE FROM \`${state.activeTable || 'table'}\` WHERE ;">DELETE</button>
                            <button id="sql-format-btn" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white text-[11px] transition">
                                <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> Format SQL
                            </button>
                        </div>
                    </div>

                    <!-- Editor Textarea Area -->
                    <div class="relative">
                        <textarea id="sql-query-input" rows="6" placeholder="พิมพ์คำสั่ง SQL ที่นี่..." 
                            class="w-full p-4 bg-slate-950 font-mono text-sm text-slate-100 placeholder-slate-600 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500 border-none leading-relaxed">${Formatter.escapeHtml(this.currentSql)}</textarea>
                    </div>

                    <!-- Editor Footer / Actions -->
                    <div class="px-4 py-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs">
                        <div class="text-slate-400 flex items-center gap-3">
                            <span><kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Ctrl</kbd> + <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Enter</kbd> เพื่อรัน</span>
                            <button id="sql-clear-btn" class="text-slate-400 hover:text-rose-400 transition">
                                <i class="fa-solid fa-trash-can mr-1"></i> เคลียร์
                            </button>
                        </div>

                        <div class="flex items-center gap-2">
                            <button id="sql-explain-btn" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-medium transition flex items-center gap-1.5">
                                <i class="fa-solid fa-magnifying-glass-chart"></i>
                                <span>EXPLAIN</span>
                            </button>
                            <button id="sql-run-btn" class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5">
                                <i class="fa-solid fa-play text-xs"></i>
                                <span>รันคำสั่ง (Execute)</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Query Results & History Navigation Bar -->
                <div class="flex items-center justify-between border-b border-slate-800 px-2 flex-shrink-0">
                    <div class="flex items-center space-x-2 text-xs">
                        <button id="tab-btn-result" class="px-3 py-2 font-medium transition flex items-center gap-1.5 ${this.activeTab === 'result' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'}">
                            <i class="fa-solid fa-table-list"></i>
                            <span>ผลลัพธ์ (Result)</span>
                            ${this.lastResult?.total_rows !== undefined ? `<span class="bg-indigo-600/20 text-indigo-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono">${this.lastResult.total_rows}</span>` : ''}
                        </button>

                        <button id="tab-btn-history" class="px-3 py-2 font-medium transition flex items-center gap-1.5 ${this.activeTab === 'history' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'}">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                            <span>ประวัติคำสั่ง (History)</span>
                        </button>
                    </div>

                    <!-- Result Stats / Download Button -->
                    ${this.lastResult ? `
                        <div class="flex items-center gap-3 text-xs text-slate-400">
                            <span class="flex items-center gap-1">
                                <i class="fa-solid fa-bolt text-amber-400 text-[10px]"></i>
                                <span>${this.lastResult.duration_ms} ms</span>
                            </span>
                            ${this.lastResult.type === 'select' && this.lastResult.rows?.length > 0 ? `
                                <button id="sql-copy-json" class="hover:text-indigo-300 transition" title="คัดลอกเป็น JSON">
                                    <i class="fa-solid fa-copy mr-1"></i> Copy JSON
                                </button>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>

                <!-- Tab Content Panel -->
                <div class="flex-1 bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden relative" id="sql-tab-panel">
                    ${this.renderActiveTabPanel()}
                </div>

            </div>
        `;

        this.bindEvents();
    },

    renderActiveTabPanel() {
        if (this.activeTab === 'history') {
            return `
                <div class="p-4 overflow-y-auto h-full space-y-2">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
                        <span>รายการคำสั่ง SQL ล่าสุด</span>
                        <button id="sql-clear-history-btn" class="hover:text-rose-400 transition">
                            <i class="fa-solid fa-trash-can mr-1"></i> ล้างประวัติทั้งหมด
                        </button>
                    </div>
                    ${this.historyList.length === 0 ? `
                        <div class="p-8 text-center text-slate-500 text-xs">ไม่มีประวัติคำสั่ง SQL</div>
                    ` : this.historyList.map(h => `
                        <div class="p-3 bg-slate-950/70 hover:bg-slate-800/70 border border-slate-800/80 rounded-xl cursor-pointer transition group" data-history-sql="${Formatter.escapeHtml(h.sql)}">
                            <div class="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                <span>${Formatter.escapeHtml(h.database || 'Default DB')}</span>
                                <span>${Formatter.formatDate(h.time)}</span>
                            </div>
                            <div class="font-mono text-xs text-slate-200 group-hover:text-indigo-300 transition truncate">${Formatter.escapeHtml(h.sql)}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Result Tab
        if (!this.lastResult) {
            return `
                <div class="flex flex-col items-center justify-center h-full text-slate-500 text-xs space-y-2 p-8">
                    <i class="fa-solid fa-terminal text-3xl text-slate-600"></i>
                    <p>ยังไม่มีผลลัพธ์ กรุณากดปุ่ม <b>รันคำสั่ง (Execute)</b></p>
                </div>
            `;
        }

        if (this.lastResult.type === 'exec') {
            return `
                <div class="p-8 text-center space-y-3">
                    <div class="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xl flex items-center justify-center mx-auto">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <h4 class="font-bold text-slate-200 text-sm">${Formatter.escapeHtml(this.lastResult.message)}</h4>
                    <p class="text-xs text-slate-400 font-mono">เวลาประมวลผล: ${this.lastResult.duration_ms} ms</p>
                </div>
            `;
        }

        const { columns, rows } = this.lastResult;

        if (rows.length === 0) {
            return `
                <div class="p-8 text-center text-slate-500 text-xs space-y-2">
                    <i class="fa-solid fa-inbox text-3xl text-slate-600"></i>
                    <p>คำสั่งสำเร็จ แต่ไม่มีข้อมูลแถวที่คืนค่ากลับมา (0 Rows)</p>
                </div>
            `;
        }

        return `
            <div class="overflow-auto h-full">
                <table class="data-table text-xs font-mono">
                    <thead>
                        <tr>
                            <th class="w-10 px-3 py-2 text-center text-slate-500">#</th>
                            ${columns.map(col => `
                                <th class="px-3 py-2 text-left text-slate-300 font-semibold">${Formatter.escapeHtml(col.name)}</th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, idx) => `
                            <tr>
                                <td class="px-3 py-1.5 text-center text-slate-500 font-sans">${idx + 1}</td>
                                ${columns.map(col => {
                                    const val = row[col.name];
                                    const isNull = val === null;
                                    return `
                                        <td class="px-3 py-1.5 text-slate-200">
                                            ${isNull ? '<span class="badge-null">NULL</span>' : Formatter.escapeHtml(val)}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    bindEvents() {
        const textarea = document.getElementById('sql-query-input');
        if (textarea) {
            textarea.oninput = (e) => {
                this.currentSql = e.target.value;
            };

            textarea.onkeydown = (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    this.executeCurrentSql();
                }
            };
        }

        document.getElementById('sql-run-btn')?.addEventListener('click', () => {
            this.executeCurrentSql();
        });

        document.getElementById('sql-explain-btn')?.addEventListener('click', () => {
            this.explainCurrentSql();
        });

        document.getElementById('sql-clear-btn')?.addEventListener('click', () => {
            this.currentSql = '';
            if (textarea) textarea.value = '';
        });

        document.getElementById('sql-format-btn')?.addEventListener('click', () => {
            if (this.currentSql) {
                this.currentSql = Formatter.formatSql(this.currentSql);
                if (textarea) textarea.value = this.currentSql;
            }
        });

        // Snippets
        this.container.querySelectorAll('.sql-snippet-btn').forEach(btn => {
            btn.onclick = () => {
                const snippet = btn.getAttribute('data-snippet');
                this.currentSql = snippet;
                if (textarea) {
                    textarea.value = snippet;
                    textarea.focus();
                }
            };
        });

        // Tabs
        document.getElementById('tab-btn-result')?.addEventListener('click', () => {
            this.activeTab = 'result';
            this.render();
        });

        document.getElementById('tab-btn-history')?.addEventListener('click', async () => {
            this.activeTab = 'history';
            await this.loadHistory();
            this.render();
        });

        // Copy JSON
        document.getElementById('sql-copy-json')?.addEventListener('click', () => {
            if (this.lastResult?.rows) {
                navigator.clipboard.writeText(JSON.stringify(this.lastResult.rows, null, 2));
                Toast.success('คัดลอกผลลัพธ์เป็น JSON ไปยังคลิปบอร์ดแล้ว');
            }
        });

        // Clear History
        document.getElementById('sql-clear-history-btn')?.addEventListener('click', async () => {
            await api.post('/query/history/clear');
            this.historyList = [];
            Toast.success('ล้างประวัติคำสั่งเรียบร้อย');
            this.render();
        });

        // History items click to load
        this.container.querySelectorAll('[data-history-sql]').forEach(item => {
            item.onclick = () => {
                this.currentSql = item.getAttribute('data-history-sql');
                this.activeTab = 'result';
                this.render();
                Toast.info('โหลดคำสั่ง SQL จากประวัติแล้ว');
            };
        });
    },

    async executeCurrentSql() {
        const sql = this.currentSql.trim();
        if (!sql) {
            Toast.warning('กรุณาพิมพ์คำสั่ง SQL ก่อนรัน');
            return;
        }

        const runBtn = document.getElementById('sql-run-btn');
        if (runBtn) {
            runBtn.disabled = true;
            runBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> กำลังรัน...';
        }

        try {
            const res = await api.post('/query/execute', {
                sql,
                database: store.getState().activeDatabase
            });

            this.lastResult = res.data;
            this.activeTab = 'result';
            Toast.success(`รันคำสั่งสำเร็จ (${res.data.duration_ms} ms)`);
            this.render();

            // Refresh table list if DDL like CREATE / DROP / ALTER
            const firstWord = sql.trim().split(/\s+/)[0].toUpperCase();
            if (['CREATE', 'DROP', 'ALTER', 'RENAME', 'TRUNCATE'].includes(firstWord)) {
                await store.refreshDatabases();
                await store.refreshTables();
            }
        } catch (e) {
            Toast.error(e.message);
        } finally {
            if (runBtn) {
                runBtn.disabled = false;
                runBtn.innerHTML = '<i class="fa-solid fa-play text-xs"></i> <span>รันคำสั่ง (Execute)</span>';
            }
        }
    },

    async explainCurrentSql() {
        const sql = this.currentSql.trim();
        if (!sql) return;

        try {
            const res = await api.post('/query/explain', {
                sql,
                database: store.getState().activeDatabase
            });

            this.lastResult = res.data;
            this.activeTab = 'result';
            Toast.info('แสดงผลการวิเคราะห์ EXPLAIN Query');
            this.render();
        } catch (e) {
            Toast.error(e.message);
        }
    },

    async loadHistory() {
        try {
            const res = await api.get('/query/history');
            this.historyList = res.data || [];
        } catch (e) {
            this.historyList = [];
        }
    }
};
