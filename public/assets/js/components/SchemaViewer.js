/**
 * SchemaViewer Component (Table Structure & Column/Index Alterations)
 */
import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';
import { Modal } from './Modal.js';
import { Formatter } from '../utils/formatter.js';

export const SchemaViewer = {
    container: null,
    columns: [],
    indexes: [],
    foreignKeys: [],

    init(targetContainer) {
        this.container = targetContainer;
        this.loadSchema();
    },

    async loadSchema() {
        const state = store.getState();
        if (!state.activeDatabase || !state.activeTable) {
            this.renderEmpty();
            return;
        }

        this.renderLoading();

        try {
            const [colsRes, idxRes, fkRes] = await Promise.all([
                api.get('/structure/columns', { database: state.activeDatabase, table: state.activeTable }),
                api.get('/structure/indexes', { database: state.activeDatabase, table: state.activeTable }),
                api.get('/structure/foreign-keys', { database: state.activeDatabase, table: state.activeTable }),
            ]);

            this.columns = colsRes.data || [];
            this.indexes = idxRes.data || [];
            this.foreignKeys = fkRes.data || [];

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
                <span>กำลังโหลดโครงสร้างตาราง...</span>
            </div>
        `;
    },

    renderEmpty() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-80 text-slate-500 text-sm space-y-3">
                <div class="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-600 text-2xl">
                    <i class="fa-solid fa-diagram-project"></i>
                </div>
                <p>กรุณาเลือกตารางจากแถบด้านซ้าย</p>
            </div>
        `;
    },

    renderError(msg) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="p-6 bg-rose-950/30 border border-rose-900/50 rounded-2xl text-rose-300 text-sm">
                <div class="font-semibold mb-1"><i class="fa-solid fa-triangle-exclamation"></i> ไม่สามารถโหลดโครงสร้างได้</div>
                <p class="text-xs font-mono">${Formatter.escapeHtml(msg)}</p>
            </div>
        `;
    },

    render() {
        if (!this.container) return;
        const state = store.getState();

        this.container.innerHTML = `
            <div class="space-y-6 pb-12">
                
                <!-- Section 1: Columns Schema Header & Add Button -->
                <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-table-columns text-indigo-400 text-lg"></i>
                            <div>
                                <h3 class="font-bold text-sm text-slate-100">โครงสร้างคอลัมน์ (Columns Structure)</h3>
                                <p class="text-xs text-slate-400">ตาราง \`${Formatter.escapeHtml(state.activeTable)}\` มีทั้งหมด ${this.columns.length} คอลัมน์</p>
                            </div>
                        </div>
                        <button id="schema-add-col-btn" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition">
                            <i class="fa-solid fa-plus text-xs"></i>
                            <span>เพิ่มคอลัมน์ใหม่ (Add Column)</span>
                        </button>
                    </div>

                    <!-- Columns Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs font-mono">
                            <thead class="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th class="px-4 py-3 text-center w-12">#</th>
                                    <th class="px-4 py-3">ชื่อคอลัมน์ (Name)</th>
                                    <th class="px-4 py-3">ชนิดข้อมูล (Type)</th>
                                    <th class="px-4 py-3">Nullable</th>
                                    <th class="px-4 py-3">ค่าเริ่มต้น (Default)</th>
                                    <th class="px-4 py-3">Key</th>
                                    <th class="px-4 py-3">Extra</th>
                                    <th class="px-4 py-3 text-right">การกระทำ</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/80">
                                ${this.columns.map((col, idx) => {
                                    const isPri = col.column_key === 'PRI';
                                    const isUni = col.column_key === 'UNI';
                                    const isMul = col.column_key === 'MUL';

                                    return `
                                        <tr class="hover:bg-slate-800/50 transition">
                                            <td class="px-4 py-3 text-center text-slate-500 font-sans">${idx + 1}</td>
                                            <td class="px-4 py-3 font-semibold text-slate-100 flex items-center gap-2">
                                                ${isPri ? '<i class="fa-solid fa-key text-amber-500 text-xs" title="Primary Key"></i>' : ''}
                                                <span>${Formatter.escapeHtml(col.name)}</span>
                                            </td>
                                            <td class="px-4 py-3 text-sky-600 dark:text-sky-400 font-semibold">${Formatter.escapeHtml(col.column_type)}</td>
                                            <td class="px-4 py-3">
                                                <span class="px-2 py-0.5 rounded text-[11px] font-sans ${col.is_nullable === 'YES' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">
                                                    ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3 text-slate-700 dark:text-slate-300">
                                                ${col.default_value !== null ? Formatter.escapeHtml(col.default_value) : '<span class="text-slate-400 dark:text-slate-600">None</span>'}
                                            </td>
                                            <td class="px-4 py-3 font-sans">
                                                ${isPri ? '<span class="px-2 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold">PRIMARY</span>' : ''}
                                                ${isUni ? '<span class="px-2 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 font-medium">UNIQUE</span>' : ''}
                                                ${isMul ? '<span class="px-2 py-0.5 rounded text-[10px] bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-medium">INDEX</span>' : ''}
                                            </td>
                                            <td class="px-4 py-3 text-slate-600 dark:text-slate-400 font-sans">${Formatter.escapeHtml(col.extra || '-')}</td>
                                            <td class="px-4 py-3 text-right font-sans">
                                                <div class="flex items-center justify-end gap-2">
                                                    <button class="btn-edit-col px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition text-xs font-medium" data-col-name="${Formatter.escapeHtml(col.name)}">
                                                        <i class="fa-solid fa-pen-to-square mr-1"></i> แก้ไข
                                                    </button>
                                                    <button class="btn-drop-col px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-950/40 dark:hover:bg-rose-900/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 transition text-xs font-medium" data-col-name="${Formatter.escapeHtml(col.name)}">
                                                        <i class="fa-solid fa-trash mr-1"></i> ลบ
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Section 2: Indexes -->
                <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <i class="fa-solid fa-bolt-lightning text-amber-400 text-lg"></i>
                            <div>
                                <h3 class="font-bold text-sm text-slate-100">ดัชนี (Indexes)</h3>
                                <p class="text-xs text-slate-400">รายการ Index ทั้งหมดในตาราง</p>
                            </div>
                        </div>
                        <button id="schema-add-index-btn" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition">
                            <i class="fa-solid fa-plus text-xs"></i>
                            <span>สร้าง Index</span>
                        </button>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs font-mono">
                            <thead class="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                                <tr>
                                    <th class="px-4 py-3">ชื่อ Index (Name)</th>
                                    <th class="px-4 py-3">ประเภท (Type)</th>
                                    <th class="px-4 py-3">คอลัมน์ (Columns)</th>
                                    <th class="px-4 py-3 text-right">การกระทำ</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/80">
                                ${this.indexes.length === 0 ? `
                                    <tr><td colspan="4" class="p-6 text-center text-slate-500 font-sans">ไม่มี Index ในตารางนี้</td></tr>
                                ` : this.indexes.map(idx => `
                                    <tr class="hover:bg-slate-800/50 transition">
                                        <td class="px-4 py-3 font-semibold text-slate-100">${Formatter.escapeHtml(idx.name)}</td>
                                        <td class="px-4 py-3 font-sans">
                                            <span class="px-2 py-0.5 rounded text-[10px] ${idx.primary ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold' : idx.unique ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 font-medium' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium'}">
                                                ${idx.primary ? 'PRIMARY KEY' : (idx.unique ? 'UNIQUE' : idx.type)}
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-indigo-600 dark:text-indigo-300 font-medium">
                                            ${idx.columns.map(c => Formatter.escapeHtml(c.name)).join(', ')}
                                        </td>
                                        <td class="px-4 py-3 text-right font-sans">
                                            <button class="btn-drop-index px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white dark:bg-rose-950/40 dark:hover:bg-rose-900/80 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 transition text-xs font-medium" data-index-name="${Formatter.escapeHtml(idx.name)}">
                                                <i class="fa-solid fa-trash mr-1"></i> ลบ Index
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Section 3: Foreign Keys -->
                ${this.foreignKeys.length > 0 ? `
                    <div class="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                        <div class="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
                            <i class="fa-solid fa-link text-cyan-400 text-lg"></i>
                            <div>
                                <h3 class="font-bold text-sm text-slate-100">ความสัมพันธ์ (Foreign Keys)</h3>
                                <p class="text-xs text-slate-400">ตารางที่เชื่อมโยงภายนอก</p>
                            </div>
                        </div>
                        <div class="p-4">
                            <table class="w-full text-left text-xs font-mono">
                                <thead class="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                                    <tr>
                                        <th class="px-4 py-2">Constraint</th>
                                        <th class="px-4 py-2">คอลัมน์ตารางนี้</th>
                                        <th class="px-4 py-2">อ้างอิงไปยังตาราง (Referenced Table & Column)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.foreignKeys.map(fk => `
                                        <tr>
                                            <td class="px-4 py-2 font-semibold text-slate-300">${Formatter.escapeHtml(fk.constraint_name)}</td>
                                            <td class="px-4 py-2 text-indigo-300">${Formatter.escapeHtml(fk.column_name)}</td>
                                            <td class="px-4 py-2 text-cyan-300">${Formatter.escapeHtml(fk.referenced_table)} (${Formatter.escapeHtml(fk.referenced_column)})</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        const state = store.getState();

        document.getElementById('schema-add-col-btn')?.addEventListener('click', () => {
            this.showAddColumnModal();
        });

        document.getElementById('schema-add-index-btn')?.addEventListener('click', () => {
            this.showAddIndexModal();
        });

        this.container.querySelectorAll('.btn-edit-col').forEach(btn => {
            btn.onclick = () => {
                const colName = btn.getAttribute('data-col-name');
                const colObj = this.columns.find(c => c.name === colName);
                if (colObj) this.showEditColumnModal(colObj);
            };
        });

        this.container.querySelectorAll('.btn-drop-col').forEach(btn => {
            btn.onclick = () => {
                const colName = btn.getAttribute('data-col-name');
                Modal.confirm('ลบคอลัมน์', `คุณแน่ใจหรือไม่ว่าต้องการลบคอลัมน์ \`${colName}\`? ข้อมูลในคอลัมน์นี้จะสูญหาย!`, {
                    danger: true,
                    confirmText: 'ลบคอลัมน์',
                    onConfirm: async () => {
                        await api.delete('/structure/columns', {
                            database: state.activeDatabase,
                            table: state.activeTable,
                            column: colName
                        });
                        Toast.success(`ลบคอลัมน์ ${colName} สำเร็จ`);
                        this.loadSchema();
                    }
                });
            };
        });

        this.container.querySelectorAll('.btn-drop-index').forEach(btn => {
            btn.onclick = () => {
                const indexName = btn.getAttribute('data-index-name');
                Modal.confirm('ลบ Index', `คุณแน่ใจหรือไม่ว่าต้องการลบ Index \`${indexName}\`?`, {
                    danger: true,
                    confirmText: 'ลบ Index',
                    onConfirm: async () => {
                        await api.delete('/structure/indexes', {
                            database: state.activeDatabase,
                            table: state.activeTable,
                            name: indexName
                        });
                        Toast.success(`ลบ Index ${indexName} สำเร็จ`);
                        this.loadSchema();
                    }
                });
            };
        });
    },

    showAddColumnModal() {
        const state = store.getState();

        const afterOptions = this.columns.map(c => `
            <option value="${Formatter.escapeHtml(c.name)}">ต่อจากคอลัมน์: ${Formatter.escapeHtml(c.name)}</option>
        `).join('');

        Modal.custom({
            title: `<i class="fa-solid fa-plus text-indigo-400 mr-2"></i> เพิ่มคอลัมน์ใหม่ในตาราง \`${Formatter.escapeHtml(state.activeTable)}\``,
            bodyHtml: `
                <div class="space-y-4 text-xs">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">ชื่อคอลัมน์ (Column Name) *</label>
                            <input type="text" id="add-col-name" placeholder="column_name" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">ชนิดข้อมูล (Type) *</label>
                            <input type="text" id="add-col-type" value="VARCHAR(255)" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">ค่าเริ่มต้น (Default Value)</label>
                            <input type="text" id="add-col-default" placeholder="NULL, CURRENT_TIMESTAMP, หรือข้อความ" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">ตำแหน่งคอลัมน์</label>
                            <select id="add-col-after" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100">
                                <option value="">ท้ายสุดของตาราง</option>
                                <option value="FIRST">คอลัมน์แรกสุด (FIRST)</option>
                                ${afterOptions}
                            </select>
                        </div>
                    </div>

                    <div class="flex items-center gap-6 pt-2">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="add-col-null" checked class="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
                            <span class="text-slate-300 font-semibold">อนุญาตให้เป็น NULL (Nullable)</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="add-col-ai" class="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
                            <span class="text-slate-300 font-semibold">AUTO_INCREMENT</span>
                        </label>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-300 mb-1">คำอธิบายเพิ่มเติม (Comment)</label>
                        <input type="text" id="add-col-comment" placeholder="คำอธิบาย..." class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100">
                    </div>
                </div>
            `,
            footerHtml: `
                <button id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition">ยกเลิก</button>
                <button id="modal-submit-add-col" class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">เพิ่มคอลัมน์</button>
            `,
            maxWidth: 'max-w-xl',
            onOpen: (box) => {
                box.querySelector('#modal-cancel-btn').onclick = () => Modal.close();
                box.querySelector('#modal-submit-add-col').onclick = async () => {
                    const name = box.querySelector('#add-col-name').value.trim();
                    const type = box.querySelector('#add-col-type').value.trim();
                    const defaultValue = box.querySelector('#add-col-default').value.trim();
                    const nullable = box.querySelector('#add-col-null').checked;
                    const auto_increment = box.querySelector('#add-col-ai').checked;
                    const after = box.querySelector('#add-col-after').value;
                    const comment = box.querySelector('#add-col-comment').value.trim();

                    if (!name || !type) {
                        Toast.warning('กรุณาระบุชื่อคอลัมน์และชนิดข้อมูล');
                        return;
                    }

                    try {
                        await api.post('/structure/columns', {
                            database: state.activeDatabase,
                            table: state.activeTable,
                            column: {
                                name,
                                type,
                                default: defaultValue,
                                nullable,
                                auto_increment,
                                comment
                            },
                            after: after || null
                        });
                        Toast.success(`เพิ่มคอลัมน์ ${name} สำเร็จ`);
                        Modal.close();
                        this.loadSchema();
                    } catch (e) {
                        Toast.error(e.message);
                    }
                };
            }
        });
    },

    showEditColumnModal(col) {
        const state = store.getState();

        Modal.custom({
            title: `<i class="fa-solid fa-pen-to-square text-indigo-400 mr-2"></i> แก้ไขคอลัมน์ \`${Formatter.escapeHtml(col.name)}\``,
            bodyHtml: `
                <div class="space-y-4 text-xs">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">ชื่อคอลัมน์ (Column Name) *</label>
                            <input type="text" id="edit-col-name" value="${Formatter.escapeHtml(col.name)}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">ชนิดข้อมูล (Type) *</label>
                            <input type="text" id="edit-col-type" value="${Formatter.escapeHtml(col.column_type)}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono">
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-300 mb-1">ค่าเริ่มต้น (Default Value)</label>
                        <input type="text" id="edit-col-default" value="${Formatter.escapeHtml(col.default_value || '')}" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono">
                    </div>

                    <div class="flex items-center gap-6 pt-2">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="edit-col-null" ${col.is_nullable === 'YES' ? 'checked' : ''} class="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
                            <span class="text-slate-300 font-semibold">อนุญาตให้เป็น NULL</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="edit-col-ai" ${(col.extra || '').toLowerCase().includes('auto_increment') ? 'checked' : ''} class="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0">
                            <span class="text-slate-300 font-semibold">AUTO_INCREMENT</span>
                        </label>
                    </div>
                </div>
            `,
            footerHtml: `
                <button id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition">ยกเลิก</button>
                <button id="modal-submit-edit-col" class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">บันทึกการแก้ไข</button>
            `,
            maxWidth: 'max-w-xl',
            onOpen: (box) => {
                box.querySelector('#modal-cancel-btn').onclick = () => Modal.close();
                box.querySelector('#modal-submit-edit-col').onclick = async () => {
                    const newName = box.querySelector('#edit-col-name').value.trim();
                    const type = box.querySelector('#edit-col-type').value.trim();
                    const defaultValue = box.querySelector('#edit-col-default').value.trim();
                    const nullable = box.querySelector('#edit-col-null').checked;
                    const auto_increment = box.querySelector('#edit-col-ai').checked;

                    if (!newName || !type) {
                        Toast.warning('กรุณาระบุชื่อคอลัมน์และชนิดข้อมูล');
                        return;
                    }

                    try {
                        await api.put('/structure/columns', {
                            database: state.activeDatabase,
                            table: state.activeTable,
                            old_column: col.name,
                            column: {
                                name: newName,
                                type,
                                default: defaultValue,
                                nullable,
                                auto_increment
                            }
                        });
                        Toast.success('แก้ไขคอลัมน์สำเร็จ');
                        Modal.close();
                        this.loadSchema();
                    } catch (e) {
                        Toast.error(e.message);
                    }
                };
            }
        });
    },

    showAddIndexModal() {
        const state = store.getState();

        const colCheckboxes = this.columns.map(c => `
            <label class="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 border border-slate-700/60 text-xs text-slate-200 cursor-pointer hover:bg-slate-800">
                <input type="checkbox" class="index-col-chk rounded bg-slate-800 border-slate-700 text-indigo-600" value="${Formatter.escapeHtml(c.name)}">
                <span class="font-mono">${Formatter.escapeHtml(c.name)}</span>
            </label>
        `).join('');

        Modal.custom({
            title: `<i class="fa-solid fa-bolt-lightning text-amber-400 mr-2"></i> สร้าง Index ใหม่`,
            bodyHtml: `
                <div class="space-y-4 text-xs">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">ชื่อ Index (Index Name)</label>
                            <input type="text" id="add-idx-name" placeholder="idx_column_name" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">ประเภท Index (Index Type)</label>
                            <select id="add-idx-type" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100">
                                <option value="INDEX" selected>INDEX (ดัชนีทั่วไป)</option>
                                <option value="UNIQUE">UNIQUE (ค่าไม่ซ้ำกัน)</option>
                                <option value="PRIMARY">PRIMARY KEY</option>
                                <option value="FULLTEXT">FULLTEXT (ค้นหาข้อความเต็ม)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block font-semibold text-slate-300 mb-1.5">เลือกคอลัมน์สำหรับทำ Index (เลือกได้มากกว่า 1)</label>
                        <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            ${colCheckboxes}
                        </div>
                    </div>
                </div>
            `,
            footerHtml: `
                <button id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition">ยกเลิก</button>
                <button id="modal-submit-add-idx" class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">สร้าง Index</button>
            `,
            maxWidth: 'max-w-xl',
            onOpen: (box) => {
                box.querySelector('#modal-cancel-btn').onclick = () => Modal.close();
                box.querySelector('#modal-submit-add-idx').onclick = async () => {
                    const name = box.querySelector('#add-idx-name').value.trim();
                    const type = box.querySelector('#add-idx-type').value;
                    const selectedCols = Array.from(box.querySelectorAll('.index-col-chk:checked')).map(chk => chk.value);

                    if (selectedCols.length === 0) {
                        Toast.warning('กรุณาเลือกอย่างน้อย 1 คอลัมน์');
                        return;
                    }

                    try {
                        await api.post('/structure/indexes', {
                            database: state.activeDatabase,
                            table: state.activeTable,
                            name,
                            type,
                            columns: selectedCols
                        });
                        Toast.success('สร้าง Index สำเร็จ');
                        Modal.close();
                        this.loadSchema();
                    } catch (e) {
                        Toast.error(e.message);
                    }
                };
            }
        });
    }
};
