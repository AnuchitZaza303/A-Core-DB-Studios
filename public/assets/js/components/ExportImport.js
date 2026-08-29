/**
 * Export & Import Component
 */
import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';
import { Formatter } from '../utils/formatter.js';

export const ExportImport = {
    container: null,
    activeSubTab: 'export', // export | import
    importResult: null,

    init(targetContainer) {
        this.container = targetContainer;
        this.render();
    },

    render() {
        if (!this.container) return;
        const state = store.getState();
        const activeDb = state.activeDatabase;
        const tables = state.tables || [];

        this.container.innerHTML = `
            <div class="max-w-5xl mx-auto space-y-6 pb-12">
                
                <!-- Sub Tab Navigation -->
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                        <h2 class="text-base font-bold text-slate-100">ส่งออกและนำเข้าข้อมูล (Export & Import)</h2>
                        <p class="text-xs text-slate-400">สำรองฐานข้อมูลเป็นไฟล์ SQL หรือนำเข้าไฟล์ข้อมูลเข้าสู่ฐานข้อมูล</p>
                    </div>

                    <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                        <button id="subtab-export" class="px-4 py-1.5 rounded-lg font-medium transition ${this.activeSubTab === 'export' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                            <i class="fa-solid fa-file-export mr-1.5"></i> ส่งออก (Export)
                        </button>
                        <button id="subtab-import" class="px-4 py-1.5 rounded-lg font-medium transition ${this.activeSubTab === 'import' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}">
                            <i class="fa-solid fa-file-import mr-1.5"></i> นำเข้า (Import)
                        </button>
                    </div>
                </div>

                ${!activeDb ? `
                    <div class="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400 text-sm">
                        <i class="fa-solid fa-database text-2xl text-slate-600 mb-2"></i>
                        <p>กรุณาเลือกฐานข้อมูลจากด้านบนก่อนทำการ Export / Import</p>
                    </div>
                ` : this.activeSubTab === 'export' ? this.renderExportSection(activeDb, tables) : this.renderImportSection(activeDb)}

            </div>
        `;

        this.bindEvents();
    },

    renderExportSection(database, tables) {
        const apiPrefix = window.APP_CONFIG?.apiPrefix || '/api';

        return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Left 2 Cols: Options & Table Selector -->
                <div class="md:col-span-2 space-y-4">
                    <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                        <h3 class="font-bold text-sm text-slate-200 flex items-center gap-2">
                            <i class="fa-solid fa-sliders text-indigo-400"></i>
                            <span>ตัวเลือกการส่งออก (Export Options)</span>
                        </h3>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <label class="flex items-center gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/60 transition">
                                <input type="checkbox" id="export-opt-structure" checked class="rounded bg-slate-800 border-slate-700 text-indigo-600">
                                <div>
                                    <div class="font-semibold text-slate-200">โครงสร้างตาราง (Structure)</div>
                                    <div class="text-[11px] text-slate-500">คำสั่ง CREATE TABLE</div>
                                </div>
                            </label>

                            <label class="flex items-center gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/60 transition">
                                <input type="checkbox" id="export-opt-data" checked class="rounded bg-slate-800 border-slate-700 text-indigo-600">
                                <div>
                                    <div class="font-semibold text-slate-200">ข้อมูลแถว (Data)</div>
                                    <div class="text-[11px] text-slate-500">คำสั่ง INSERT INTO</div>
                                </div>
                            </label>

                            <label class="flex items-center gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-800/60 transition">
                                <input type="checkbox" id="export-opt-drop" checked class="rounded bg-slate-800 border-slate-700 text-indigo-600">
                                <div>
                                    <div class="font-semibold text-slate-200">DROP TABLE IF EXISTS</div>
                                    <div class="text-[11px] text-slate-500">ลบตารางเดิมก่อนสร้างใหม่</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Table Selector Box -->
                    <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between">
                            <h3 class="font-bold text-sm text-slate-200 flex items-center gap-2">
                                <i class="fa-solid fa-list-check text-indigo-400"></i>
                                <span>เลือกตารางที่ต้องการส่งออก (${tables.length} ตาราง)</span>
                            </h3>
                            <div class="flex gap-2 text-xs">
                                <button id="export-select-all" class="text-indigo-400 hover:text-indigo-300">เลือกทั้งหมด</button>
                                <span class="text-slate-600">|</span>
                                <button id="export-deselect-all" class="text-slate-400 hover:text-white">ยกเลิกทั้งหมด</button>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                            ${tables.map(t => `
                                <label class="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:bg-slate-800">
                                    <input type="checkbox" class="export-table-chk rounded bg-slate-800 border-slate-700 text-indigo-600" value="${Formatter.escapeHtml(t.name)}" checked>
                                    <span class="truncate font-mono">${Formatter.escapeHtml(t.name)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Right 1 Col: Action Summary Card -->
                <div class="space-y-4">
                    <div class="bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-purple-950/40 p-5 rounded-2xl border border-indigo-500/20 space-y-4">
                        <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-lg">
                            <i class="fa-solid fa-file-arrow-down"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-sm text-slate-100">พร้อมดาวน์โหลด</h4>
                            <p class="text-xs text-slate-400 mt-1">ฐานข้อมูล: <b class="text-indigo-300 font-mono">${Formatter.escapeHtml(database)}</b></p>
                        </div>

                        <button id="btn-start-export" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition">
                            <i class="fa-solid fa-download"></i>
                            <span>ดาวน์โหลด SQL Dump (.sql)</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderImportSection(database) {
        return `
            <div class="max-w-3xl mx-auto space-y-6">
                <!-- Dropzone File Upload -->
                <div id="import-dropzone" class="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-900/60 cursor-pointer transition flex flex-col items-center justify-center space-y-3 group">
                    <div class="w-14 h-14 rounded-2xl bg-slate-800 group-hover:bg-indigo-600/20 flex items-center justify-center text-indigo-400 text-2xl transition">
                        <i class="fa-solid fa-cloud-arrow-up"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-sm text-slate-200">ลากไฟล์ .sql มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</h4>
                        <p class="text-xs text-slate-500 mt-1">รองรับไฟล์ SQL Dump ขนาดสูงสุด 100MB</p>
                    </div>
                    <input type="file" id="import-file-input" accept=".sql" class="hidden">
                    <div id="import-selected-file-info" class="text-xs font-mono text-emerald-400 font-semibold hidden"></div>
                </div>

                <!-- Text SQL Area Alternative -->
                <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div class="flex items-center justify-between">
                        <h4 class="font-bold text-xs text-slate-300">หรือวางคำสั่ง SQL โดยตรง:</h4>
                    </div>
                    <textarea id="import-sql-textarea" rows="6" placeholder="-- วางคำสั่ง CREATE TABLE หรือ INSERT INTO ที่นี่..." 
                        class="w-full p-3 bg-slate-950 font-mono text-xs text-slate-100 placeholder-slate-600 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"></textarea>
                </div>

                <!-- Action Button -->
                <button id="btn-start-import" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition">
                    <i class="fa-solid fa-upload"></i>
                    <span>เริ่มการนำเข้าข้อมูล (Execute Import)</span>
                </button>

                <!-- Import Result Box -->
                ${this.importResult ? `
                    <div class="p-5 rounded-2xl border ${this.importResult.success ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200' : 'bg-amber-950/20 border-amber-900/50 text-amber-200'} space-y-2 text-xs">
                        <div class="font-bold text-sm flex items-center gap-2">
                            <i class="fa-solid ${this.importResult.success ? 'fa-circle-check text-emerald-400' : 'fa-triangle-exclamation text-amber-400'}"></i>
                            <span>ผลการนำเข้า: ดำเนินการสำเร็จ ${this.importResult.executed} / ${this.importResult.total_statements} คำสั่ง</span>
                        </div>
                        ${this.importResult.errors?.length > 0 ? `
                            <div class="mt-3 space-y-1">
                                <div class="font-semibold text-rose-400">ข้อผิดพลาดที่พบ (${this.importResult.errors.length} รายการ):</div>
                                <div class="max-h-40 overflow-y-auto bg-slate-950/80 p-3 rounded-lg font-mono text-[11px] text-rose-300 space-y-2">
                                    ${this.importResult.errors.map(err => `
                                        <div>
                                            <div class="text-slate-400">${Formatter.escapeHtml(err.query)}</div>
                                            <div class="text-rose-400 font-bold">${Formatter.escapeHtml(err.error)}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    },

    bindEvents() {
        document.getElementById('subtab-export')?.addEventListener('click', () => {
            this.activeSubTab = 'export';
            this.render();
        });

        document.getElementById('subtab-import')?.addEventListener('click', () => {
            this.activeSubTab = 'import';
            this.render();
        });

        // Export events
        document.getElementById('export-select-all')?.addEventListener('click', () => {
            this.container.querySelectorAll('.export-table-chk').forEach(c => c.checked = true);
        });

        document.getElementById('export-deselect-all')?.addEventListener('click', () => {
            this.container.querySelectorAll('.export-table-chk').forEach(c => c.checked = false);
        });

        document.getElementById('btn-start-export')?.addEventListener('click', () => {
            const state = store.getState();
            const database = state.activeDatabase;
            const structure = document.getElementById('export-opt-structure')?.checked ? 1 : 0;
            const data = document.getElementById('export-opt-data')?.checked ? 1 : 0;
            const drop = document.getElementById('export-opt-drop')?.checked ? 1 : 0;
            const selectedTables = Array.from(this.container.querySelectorAll('.export-table-chk:checked')).map(c => c.value);

            if (selectedTables.length === 0) {
                Toast.warning('กรุณาเลือกอย่างน้อย 1 ตาราง');
                return;
            }

            const apiPrefix = window.APP_CONFIG?.apiPrefix || '/api';
            const url = `${apiPrefix}/export/dump?database=${encodeURIComponent(database)}&tables=${encodeURIComponent(selectedTables.join(','))}&structure=${structure}&data=${data}&drop_table=${drop}`;

            window.location.href = url;
            Toast.success('กำลังดาวน์โหลดไฟล์ SQL Dump...');
        });

        // Import events
        const dropzone = document.getElementById('import-dropzone');
        const fileInput = document.getElementById('import-file-input');
        const fileInfo = document.getElementById('import-selected-file-info');

        if (dropzone && fileInput) {
            dropzone.onclick = () => fileInput.click();

            fileInput.onchange = () => {
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    if (fileInfo) {
                        fileInfo.textContent = `ไฟล์ที่เลือก: ${file.name} (${Formatter.formatBytes(file.size)})`;
                        fileInfo.classList.remove('hidden');
                    }
                }
            };
        }

        document.getElementById('btn-start-import')?.addEventListener('click', async () => {
            const state = store.getState();
            const database = state.activeDatabase;
            const sqlText = document.getElementById('import-sql-textarea')?.value.trim();
            const file = fileInput?.files[0];

            if (!file && !sqlText) {
                Toast.warning('กรุณาเลือกไฟล์ .sql หรือพิมพ์คำสั่ง SQL');
                return;
            }

            const btn = document.getElementById('btn-start-import');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังประมวลผลการนำเข้า...';
            }

            try {
                let res;
                if (file) {
                    const formData = new FormData();
                    formData.append('database', database);
                    formData.append('file', file);
                    res = await api.upload('/import/sql', formData);
                } else {
                    res = await api.post('/import/sql', { database, sql: sqlText });
                }

                this.importResult = res.data;
                Toast.success(res.message || 'นำเข้าข้อมูลเรียบร้อย');
                await store.refreshTables();
                this.render();
            } catch (e) {
                Toast.error(e.message);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-upload mr-2"></i> <span>เริ่มการนำเข้าข้อมูล (Execute Import)</span>';
                }
            }
        });
    }
};
