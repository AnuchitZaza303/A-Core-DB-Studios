/**
 * Sidebar Component (Database & Table Explorer)
 */
import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';
import { Modal } from './Modal.js';
import { Formatter } from '../utils/formatter.js';

export const Sidebar = {
    init() {
        this.container = document.getElementById('app-sidebar');
        this.filterText = '';

        store.subscribe((event, state) => {
            if (['auth:connected', 'auth:disconnected', 'database:selected', 'databases:updated', 'tables:updated', 'table:selected'].includes(event)) {
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
                <div class="p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center h-full">
                    <i class="fa-solid fa-lock text-3xl mb-3 text-slate-600"></i>
                    <p>กรุณาเชื่อมต่อฐานข้อมูล</p>
                </div>
            `;
            return;
        }

        const activeDb = state.activeDatabase;
        const tables = (state.tables || []).filter(t => 
            t.name.toLowerCase().includes(this.filterText.toLowerCase())
        );

        this.container.innerHTML = `
            <!-- Sidebar Header & Quick Filter -->
            <div class="p-3 border-b border-slate-800 space-y-2.5">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-folder-open text-indigo-400 text-sm"></i>
                        <span class="font-bold text-xs text-slate-200 tracking-wide truncate max-w-[140px]" title="${Formatter.escapeHtml(activeDb || 'ไม่มีฐานข้อมูล')}">
                            ${Formatter.escapeHtml(activeDb || 'Select Database')}
                        </span>
                    </div>
                    ${activeDb ? `
                        <div class="flex items-center gap-1">
                            <button id="sidebar-new-table-btn" title="สร้างตารางใหม่ (Create Table)" class="w-6 h-6 rounded-lg bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-400 border border-slate-700 flex items-center justify-center transition text-xs">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                            <button id="sidebar-db-drop-btn" title="ลบฐานข้อมูลนี้ (Drop Database)" class="w-6 h-6 rounded-lg bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-400 border border-slate-700 flex items-center justify-center transition text-xs">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>

                <!-- Search Input -->
                <div class="relative">
                    <input type="text" id="sidebar-filter-input" placeholder="ค้นหาตาราง... (${tables.length})" value="${Formatter.escapeHtml(this.filterText)}"
                        class="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition">
                    <i class="fa-solid fa-magnifying-glass text-slate-500 text-xs absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                    ${this.filterText ? `
                        <button id="sidebar-filter-clear" class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Tables List Container -->
            <div class="flex-1 overflow-y-auto p-2 space-y-0.5" id="sidebar-table-list">
                ${!activeDb ? `
                    <div class="p-6 text-center text-slate-400 text-xs space-y-2">
                        <i class="fa-solid fa-arrow-up text-indigo-400 text-lg animate-bounce"></i>
                        <p>กรุณาเลือกฐานข้อมูลด้านบน</p>
                    </div>
                ` : tables.length === 0 ? `
                    <div class="p-6 text-center text-slate-500 text-xs space-y-2">
                        <i class="fa-solid fa-inbox text-2xl text-slate-600"></i>
                        <p>${this.filterText ? 'ไม่พบตารางที่ค้นหา' : 'ยังไม่มีตารางในฐานข้อมูลนี้'}</p>
                        <button id="sidebar-empty-create-table-btn" class="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition shadow-md">
                            <i class="fa-solid fa-plus mr-1"></i> สร้างตารางใหม่
                        </button>
                    </div>
                ` : tables.map(table => {
                    const isSelected = table.name === state.activeTable;
                    return `
                        <div class="group flex items-center justify-between px-3 py-2 rounded-xl text-[13px] cursor-pointer transition ${
                            isSelected 
                                ? 'bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 font-semibold' 
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                        }" data-table="${Formatter.escapeHtml(table.name)}">
                            <div class="flex items-center gap-2.5 truncate flex-1 pointer-events-none">
                                <i class="fa-solid ${table.type === 'VIEW' ? 'fa-eye text-cyan-600 dark:text-cyan-400' : (isSelected ? 'fa-table-cells text-indigo-600 dark:text-indigo-400' : 'fa-table-cells text-slate-400 dark:text-slate-500 group-hover:text-indigo-500')} text-xs flex-shrink-0"></i>
                                <span class="truncate">${Formatter.escapeHtml(table.name)}</span>
                            </div>
                            <div class="flex items-center gap-1.5 flex-shrink-0">
                                <span class="text-[11px] font-sans text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">
                                    ${Formatter.formatNumber(table.rows || 0)}
                                </span>
                                <button class="table-context-btn opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition" title="จัดการตาราง" data-table="${Formatter.escapeHtml(table.name)}">
                                    <i class="fa-solid fa-ellipsis-vertical text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Sidebar Footer Stats -->
            ${activeDb ? `
                <div class="p-2.5 border-t border-slate-800 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>${tables.length} ตาราง</span>
                    <span>${Formatter.formatBytes(tables.reduce((acc, t) => acc + Number(t.total_size || 0), 0))}</span>
                </div>
            ` : ''}
        `;

        this.bindEvents();
    },

    bindEvents() {
        const filterInput = document.getElementById('sidebar-filter-input');
        if (filterInput) {
            filterInput.oninput = (e) => {
                this.filterText = e.target.value;
                this.render();
                const newInput = document.getElementById('sidebar-filter-input');
                newInput?.focus();
            };
        }

        const filterClear = document.getElementById('sidebar-filter-clear');
        if (filterClear) {
            filterClear.onclick = () => {
                this.filterText = '';
                this.render();
            };
        }

        const newTableBtn = document.getElementById('sidebar-new-table-btn') || document.getElementById('sidebar-empty-create-table-btn');
        if (newTableBtn) {
            newTableBtn.onclick = () => this.showCreateTableModal();
        }

        const dbDropBtn = document.getElementById('sidebar-db-drop-btn');
        if (dbDropBtn) {
            dbDropBtn.onclick = () => {
                const db = store.getState().activeDatabase;
                Modal.confirm(
                    'ลบฐานข้อมูล (Drop Database)',
                    `คุณแน่ใจหรือไม่ว่าต้องการลบฐานข้อมูล \`${db}\` ถาวร? ข้อมูลทั้งหมดและตารางข้างในจะถูกลบ!`,
                    {
                        danger: true,
                        confirmText: 'ลบฐานข้อมูลถาวร',
                        onConfirm: async () => {
                            await api.delete('/databases', { name: db });
                            Toast.success(`ลบฐานข้อมูล ${db} สำเร็จ`);
                            await store.refreshDatabases();
                            const remaining = store.getState().databases;
                            if (remaining.length > 0) {
                                store.selectDatabase(remaining[0].name);
                            } else {
                                store.setState({ activeDatabase: null, activeTable: null, tables: [] });
                            }
                        }
                    }
                );
            };
        }

        const tableItems = this.container.querySelectorAll('[data-table]');
        tableItems.forEach(item => {
            item.onclick = (e) => {
                if (e.target.closest('.table-context-btn')) {
                    e.stopPropagation();
                    const tableName = item.getAttribute('data-table');
                    this.showTableContextMenu(tableName, e);
                    return;
                }
                const tableName = item.getAttribute('data-table');
                store.selectTable(tableName);
            };
        });
    },

    showTableContextMenu(tableName, event) {
        Modal.custom({
            title: `<i class="fa-solid fa-table text-indigo-400 mr-2"></i> จัดการตาราง: \`${Formatter.escapeHtml(tableName)}\``,
            bodyHtml: `
                <div class="space-y-2">
                    <button id="ctx-btn-browse" class="w-full text-left px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 text-slate-200 text-sm flex items-center gap-3 transition">
                        <i class="fa-solid fa-table-cells text-indigo-400 w-5"></i>
                        <span>ดูและแก้ไขข้อมูล (Browse & Edit)</span>
                    </button>
                    <button id="ctx-btn-schema" class="w-full text-left px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 text-slate-200 text-sm flex items-center gap-3 transition">
                        <i class="fa-solid fa-diagram-project text-cyan-400 w-5"></i>
                        <span>โครงสร้างตาราง (Structure & Columns)</span>
                    </button>
                    <button id="ctx-btn-rename" class="w-full text-left px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 text-slate-200 text-sm flex items-center gap-3 transition">
                        <i class="fa-solid fa-pen text-amber-400 w-5"></i>
                        <span>เปลี่ยนชื่อตาราง (Rename Table)</span>
                    </button>
                    <button id="ctx-btn-truncate" class="w-full text-left px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-rose-950/40 hover:text-rose-300 text-slate-200 text-sm flex items-center gap-3 transition">
                        <i class="fa-solid fa-broom text-rose-400 w-5"></i>
                        <span>ล้างข้อมูลทั้งหมดในตาราง (Truncate)</span>
                    </button>
                    <button id="ctx-btn-drop" class="w-full text-left px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-rose-950/40 text-rose-400 text-sm flex items-center gap-3 transition">
                        <i class="fa-solid fa-trash text-rose-500 w-5"></i>
                        <span>ลบตารางนี้ถาวร (Drop Table)</span>
                    </button>
                </div>
            `,
            maxWidth: 'max-w-md',
            onOpen: (box) => {
                box.querySelector('#ctx-btn-browse').onclick = () => {
                    Modal.close();
                    store.selectTable(tableName);
                    store.setActiveTab('data');
                };

                box.querySelector('#ctx-btn-schema').onclick = () => {
                    Modal.close();
                    store.selectTable(tableName);
                    store.setActiveTab('structure');
                };

                box.querySelector('#ctx-btn-rename').onclick = () => {
                    Modal.close();
                    Modal.prompt('เปลี่ยนชื่อตาราง', `ระบุชื่อใหม่สำหรับตาราง \`${tableName}\`:`, {
                        defaultValue: tableName,
                        onConfirm: async (newName) => {
                            if (!newName || newName === tableName) return;
                            await api.post('/tables/rename', {
                                database: store.getState().activeDatabase,
                                old_name: tableName,
                                new_name: newName
                            });
                            Toast.success('เปลี่ยนชื่อตารางสำเร็จ');
                            await store.refreshTables();
                            store.selectTable(newName);
                        }
                    });
                };

                box.querySelector('#ctx-btn-truncate').onclick = () => {
                    Modal.close();
                    Modal.confirm('ล้างข้อมูลในตาราง', `คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลในตาราง \`${tableName}\` (Truncate)?`, {
                        danger: true,
                        confirmText: 'ล้างข้อมูลทั้งหมด',
                        onConfirm: async () => {
                            await api.post('/tables/truncate', {
                                database: store.getState().activeDatabase,
                                table: tableName
                            });
                            Toast.success('ล้างข้อมูลในตารางสำเร็จ');
                            await store.refreshTables();
                            store.selectTable(tableName);
                        }
                    });
                };

                box.querySelector('#ctx-btn-drop').onclick = () => {
                    Modal.close();
                    Modal.confirm('ลบตารางถาวร', `คุณแน่ใจหรือไม่ว่าต้องการลบตาราง \`${tableName}\`?`, {
                        danger: true,
                        confirmText: 'ลบตารางถาวร',
                        onConfirm: async () => {
                            await api.delete('/tables', {
                                database: store.getState().activeDatabase,
                                table: tableName
                            });
                            Toast.success('ลบตารางสำเร็จ');
                            await store.refreshTables();
                        }
                    });
                };
            }
        });
    },

    showCreateTableModal() {
        const activeDb = store.getState().activeDatabase;
        if (!activeDb) {
            Toast.warning('กรุณาเลือกฐานข้อมูลก่อนสร้างตาราง');
            return;
        }

        let columns = [
            { name: 'id', type: 'INT', nullable: false, auto_increment: true, primary: true, default: '', comment: '' },
            { name: 'name', type: 'VARCHAR(255)', nullable: false, auto_increment: false, primary: false, default: '', comment: '' },
            { name: 'created_at', type: 'DATETIME', nullable: false, auto_increment: false, primary: false, default: 'CURRENT_TIMESTAMP', comment: '' }
        ];

        const renderColRows = () => {
            return columns.map((col, idx) => `
                <tr class="border-b border-slate-700/60" data-col-idx="${idx}">
                    <td class="p-2">
                        <input type="text" class="col-name w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono" value="${Formatter.escapeHtml(col.name)}" placeholder="column_name">
                    </td>
                    <td class="p-2">
                        <input type="text" class="col-type w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono" value="${Formatter.escapeHtml(col.type)}" placeholder="VARCHAR(255)">
                    </td>
                    <td class="p-2 text-center">
                        <input type="checkbox" class="col-null rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0" ${col.nullable ? 'checked' : ''}>
                    </td>
                    <td class="p-2 text-center">
                        <input type="checkbox" class="col-pk rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0" ${col.primary ? 'checked' : ''}>
                    </td>
                    <td class="p-2 text-center">
                        <input type="checkbox" class="col-ai rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0" ${col.auto_increment ? 'checked' : ''}>
                    </td>
                    <td class="p-2">
                        <input type="text" class="col-default w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono" value="${Formatter.escapeHtml(col.default)}" placeholder="Default">
                    </td>
                    <td class="p-2 text-center">
                        <button type="button" class="btn-remove-col text-slate-400 hover:text-rose-400 transition" title="ลบคอลัมน์นี้">
                            <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        };

        Modal.custom({
            title: `<i class="fa-solid fa-table-list text-indigo-400 mr-2"></i> สร้างตารางใหม่ใน \`${Formatter.escapeHtml(activeDb)}\``,
            bodyHtml: `
                <div class="space-y-4 text-xs">
                    <div class="grid grid-cols-3 gap-3">
                        <div class="col-span-1">
                            <label class="block font-semibold text-slate-300 mb-1">ชื่อตาราง (Table Name) *</label>
                            <input type="text" id="create-tbl-name" placeholder="users, products..." class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100">
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">Storage Engine</label>
                            <select id="create-tbl-engine" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100">
                                <option value="InnoDB" selected>InnoDB</option>
                                <option value="MyISAM">MyISAM</option>
                                <option value="MEMORY">MEMORY</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">Collation</label>
                            <select id="create-tbl-collation" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100">
                                <option value="utf8mb4_unicode_ci" selected>utf8mb4_unicode_ci</option>
                                <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
                            </select>
                        </div>
                    </div>

                    <!-- Columns Builder Table -->
                    <div class="border border-slate-700/80 rounded-xl overflow-hidden">
                        <table class="w-full text-left">
                            <thead class="bg-slate-900/90 text-slate-400 border-b border-slate-700/80">
                                <tr>
                                    <th class="p-2">ชื่อคอลัมน์</th>
                                    <th class="p-2">Type</th>
                                    <th class="p-2 text-center">Null</th>
                                    <th class="p-2 text-center">PK</th>
                                    <th class="p-2 text-center">A_I</th>
                                    <th class="p-2">Default</th>
                                    <th class="p-2 text-center"></th>
                                </tr>
                            </thead>
                            <tbody id="create-tbl-cols-body">
                                ${renderColRows()}
                            </tbody>
                        </table>
                    </div>

                    <button type="button" id="create-tbl-add-col-btn" class="px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1.5">
                        <i class="fa-solid fa-plus text-indigo-400"></i> เพิ่มคอลัมน์อีก 1 แถว
                    </button>
                </div>
            `,
            footerHtml: `
                <button id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition">ยกเลิก</button>
                <button id="modal-submit-create-tbl" class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">สร้างตาราง</button>
            `,
            maxWidth: 'max-w-4xl',
            onOpen: (box) => {
                const updateColDataFromDOM = () => {
                    const rows = box.querySelectorAll('#create-tbl-cols-body tr');
                    columns = Array.from(rows).map(row => ({
                        name: row.querySelector('.col-name').value.trim(),
                        type: row.querySelector('.col-type').value.trim(),
                        nullable: row.querySelector('.col-null').checked,
                        primary: row.querySelector('.col-pk').checked,
                        auto_increment: row.querySelector('.col-ai').checked,
                        default: row.querySelector('.col-default').value.trim(),
                    }));
                };

                const bindColEvents = () => {
                    box.querySelectorAll('.btn-remove-col').forEach(btn => {
                        btn.onclick = (e) => {
                            const tr = e.target.closest('tr');
                            const idx = Number(tr.getAttribute('data-col-idx'));
                            columns.splice(idx, 1);
                            box.querySelector('#create-tbl-cols-body').innerHTML = renderColRows();
                            bindColEvents();
                        };
                    });
                };

                bindColEvents();

                box.querySelector('#create-tbl-add-col-btn').onclick = () => {
                    updateColDataFromDOM();
                    columns.push({ name: '', type: 'VARCHAR(255)', nullable: true, auto_increment: false, primary: false, default: '', comment: '' });
                    box.querySelector('#create-tbl-cols-body').innerHTML = renderColRows();
                    bindColEvents();
                };

                box.querySelector('#modal-cancel-btn').onclick = () => Modal.close();

                box.querySelector('#modal-submit-create-tbl').onclick = async () => {
                    const tableName = box.querySelector('#create-tbl-name').value.trim();
                    const engine = box.querySelector('#create-tbl-engine').value;
                    const collation = box.querySelector('#create-tbl-collation').value;
                    updateColDataFromDOM();

                    if (!tableName) {
                        Toast.warning('กรุณาระบุชื่อตาราง');
                        return;
                    }

                    const validColumns = columns.filter(c => c.name && c.type);
                    if (validColumns.length === 0) {
                        Toast.warning('กรุณาระบุอย่างน้อย 1 คอลัมน์');
                        return;
                    }

                    try {
                        const res = await api.post('/tables', {
                            database: activeDb,
                            name: tableName,
                            engine,
                            collation,
                            columns: validColumns
                        });
                        Toast.success(res.message || 'สร้างตารางสำเร็จ');
                        Modal.close();
                        await store.refreshTables();
                        store.selectTable(tableName);
                    } catch (e) {
                        Toast.error(e.message);
                    }
                };
            }
        });
    }
};
