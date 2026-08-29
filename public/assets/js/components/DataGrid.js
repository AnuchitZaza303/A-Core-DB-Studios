/**
 * Interactive DataGrid Component
 */
import { store } from '../store.js';
import { api } from '../api.js';
import { Toast } from '../utils/toast.js';
import { Modal } from './Modal.js';
import { Formatter } from '../utils/formatter.js';

export const DataGrid = {
    container: null,
    tableData: null,
    currentPage: 1,
    currentLimit: 25,
    sortCol: null,
    sortDir: 'ASC',
    searchQuery: '',
    selectedRowIndices: new Set(),

    init(targetContainer) {
        this.container = targetContainer;
        this.currentPage = 1;
        this.selectedRowIndices.clear();
        this.loadData();
    },

    async loadData() {
        const state = store.getState();
        if (!state.activeDatabase || !state.activeTable) {
            this.renderEmpty();
            return;
        }

        this.renderLoading();

        try {
            const res = await api.get('/tables/rows', {
                database: state.activeDatabase,
                table: state.activeTable,
                page: this.currentPage,
                limit: this.currentLimit,
                sort: this.sortCol,
                dir: this.sortDir,
                search: this.searchQuery,
            });

            this.tableData = res.data;
            this.selectedRowIndices.clear();
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
                <span>กำลังโหลดข้อมูลในตาราง...</span>
            </div>
        `;
    },

    renderEmpty() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-80 text-slate-500 text-sm space-y-3">
                <div class="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-600 text-2xl">
                    <i class="fa-solid fa-table-cells"></i>
                </div>
                <p>กรุณาเลือกตารางจากแถบด้านซ้าย</p>
            </div>
        `;
    },

    renderError(msg) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="p-6 bg-rose-950/30 border border-rose-900/50 rounded-2xl text-rose-300 text-sm space-y-2">
                <div class="font-semibold flex items-center gap-2">
                    <i class="fa-solid fa-triangle-exclamation"></i> ไม่สามารถโหลดข้อมูลได้
                </div>
                <p class="text-xs text-rose-400/90 font-mono">${Formatter.escapeHtml(msg)}</p>
                <button id="grid-retry-btn" class="mt-2 px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-white rounded-lg text-xs transition">
                    ลองใหม่อีกครั้ง
                </button>
            </div>
        `;
        document.getElementById('grid-retry-btn')?.addEventListener('click', () => this.loadData());
    },

    render() {
        if (!this.container || !this.tableData) return;

        const { database, table, columns, primary_keys, rows, pagination } = this.tableData;
        const totalRows = pagination.total_rows;
        const totalPages = pagination.total_pages;

        this.container.innerHTML = `
            <div class="flex flex-col flex-1 h-full min-h-0 space-y-3">
                
                <!-- Toolbar: Search, Filters, Actions & Insert Row -->
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex-shrink-0">
                    <div class="flex items-center gap-2.5 flex-1 max-w-lg">
                        <!-- Global Search Input -->
                        <div class="relative flex-1">
                            <input type="text" id="grid-search-input" placeholder="ค้นหาข้อมูลในตาราง... (กด Enter)" value="${Formatter.escapeHtml(this.searchQuery)}"
                                class="w-full pl-8 pr-8 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition">
                            <i class="fa-solid fa-magnifying-glass text-slate-500 text-xs absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></i>
                            ${this.searchQuery ? `
                                <button id="grid-clear-search" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs">
                                    <i class="fa-solid fa-xmark"></i>
                                </button>
                            ` : ''}
                        </div>

                        <button id="grid-refresh-btn" title="รีเฟรชข้อมูล" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition">
                            <i class="fa-solid fa-arrows-rotate text-xs"></i>
                        </button>
                    </div>

                    <!-- Right Action Buttons -->
                    <div class="flex items-center gap-2">
                        <!-- Insert Row Button -->
                        <button id="grid-insert-row-btn" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition">
                            <i class="fa-solid fa-plus text-xs"></i>
                            <span>เพิ่มแถวใหม่ (Insert Row)</span>
                        </button>

                        <!-- Bulk Delete Button -->
                        <button id="grid-bulk-delete-btn" class="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-medium flex items-center gap-1.5 transition ${this.selectedRowIndices.size > 0 ? '' : 'hidden'}">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                            <span>ลบที่เลือก (${this.selectedRowIndices.size})</span>
                        </button>

                        <!-- Export CSV/JSON -->
                        <div class="relative">
                            <button id="grid-export-btn" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition">
                                <i class="fa-solid fa-download text-xs"></i>
                                <span>Export</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Table Data View Container -->
                <div class="flex-1 min-h-0 bg-slate-900/60 rounded-2xl border border-slate-800 relative data-table-container">
                    ${rows.length === 0 ? `
                        <div class="flex flex-col items-center justify-center h-full text-slate-500 text-xs space-y-2 p-8">
                            <i class="fa-solid fa-inbox text-3xl text-slate-600"></i>
                            <p>${this.searchQuery ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ตารางนี้ยังไม่มีข้อมูล (0 แถว)'}</p>
                            <button id="grid-empty-insert-btn" class="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition">
                                <i class="fa-solid fa-plus mr-1"></i> เพิ่มแถวแรก
                            </button>
                        </div>
                    ` : `
                        <table class="data-table text-xs font-sans">
                            <thead>
                                <tr>
                                    <!-- Checkbox Column -->
                                    <th class="w-10 px-3 py-3 text-center">
                                        <input type="checkbox" id="grid-select-all" class="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer">
                                    </th>
                                    <!-- Action Menu Column -->
                                    <th class="w-12 px-2 py-3 text-center text-slate-400 font-medium">#</th>

                                    <!-- Table Column Headers -->
                                    ${columns.map(col => {
                                        const isSorted = this.sortCol === col.name;
                                        const sortIcon = isSorted 
                                            ? (this.sortDir === 'ASC' ? 'fa-arrow-up text-indigo-600 dark:text-indigo-400' : 'fa-arrow-down text-indigo-600 dark:text-indigo-400')
                                            : 'fa-sort text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300';
                                        const isPri = col.column_key === 'PRI';
                                        
                                        return `
                                            <th class="px-4 py-3 text-left cursor-pointer select-none group transition hover:bg-slate-100 dark:hover:bg-slate-800" data-sort-col="${Formatter.escapeHtml(col.name)}">
                                                <div class="flex items-center justify-between gap-2">
                                                    <div class="flex items-center gap-1.5 truncate">
                                                        ${isPri ? '<i class="fa-solid fa-key text-amber-500 text-[11px] flex-shrink-0" title="Primary Key"></i>' : ''}
                                                        <span class="font-semibold text-slate-800 dark:text-slate-100 text-xs">${Formatter.escapeHtml(col.name)}</span>
                                                        <span class="text-[10px] text-slate-400 dark:text-slate-500 font-normal">(${Formatter.escapeHtml(col.data_type)})</span>
                                                    </div>
                                                    <i class="fa-solid ${sortIcon} text-[10px] flex-shrink-0 ml-1"></i>
                                                </div>
                                            </th>
                                        `;
                                    }).join('')}
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                                ${rows.map((row, rowIdx) => {
                                    const isRowSelected = this.selectedRowIndices.has(rowIdx);
                                    return `
                                        <tr class="${isRowSelected ? 'selected-row' : ''} ${rowIdx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900/80'} hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors" data-row-idx="${rowIdx}">
                                            <!-- Checkbox Cell -->
                                            <td class="px-3 py-2.5 text-center">
                                                <input type="checkbox" class="row-checkbox rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer" data-row-idx="${rowIdx}" ${isRowSelected ? 'checked' : ''}>
                                            </td>

                                            <!-- Row Actions Cell -->
                                            <td class="px-2 py-2.5 text-center text-slate-400">
                                                <div class="flex items-center justify-center gap-1">
                                                    <button class="row-delete-btn text-slate-400 hover:text-rose-500 transition p-1" title="ลบแถวนี้" data-row-idx="${rowIdx}">
                                                        <i class="fa-solid fa-trash-can text-xs"></i>
                                                    </button>
                                                </div>
                                            </td>

                                            <!-- Value Cells -->
                                            ${columns.map(col => {
                                                const val = row[col.name];
                                                const isNull = val === null;
                                                const displayVal = isNull ? '<span class="badge-null">NULL</span>' : Formatter.escapeHtml(val);
                                                
                                                return `
                                                    <td class="px-4 py-2.5 editable-cell text-slate-800 dark:text-slate-200 text-xs" 
                                                        data-col-name="${Formatter.escapeHtml(col.name)}" 
                                                        data-row-idx="${rowIdx}"
                                                        data-is-null="${isNull}">
                                                        ${displayVal}
                                                    </td>
                                                `;
                                            }).join('')}
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    `}
                </div>

                <!-- Footer Pagination & Stats Bar -->
                <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 px-4 py-2.5 rounded-2xl border border-slate-800 text-xs flex-shrink-0">
                    <div class="flex items-center gap-3 text-slate-400">
                        <span>แสดง ${(pagination.page - 1) * pagination.limit + (rows.length > 0 ? 1 : 0)} - ${(pagination.page - 1) * pagination.limit + rows.length} จากทั้งหมด <b>${Formatter.formatNumber(totalRows)}</b> แถว</span>
                        <div class="flex items-center gap-1.5 pl-3 border-l border-slate-800">
                            <span>แถวต่อหน้า:</span>
                            <select id="grid-limit-select" class="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500">
                                <option value="10" ${this.currentLimit === 10 ? 'selected' : ''}>10</option>
                                <option value="25" ${this.currentLimit === 25 ? 'selected' : ''}>25</option>
                                <option value="50" ${this.currentLimit === 50 ? 'selected' : ''}>50</option>
                                <option value="100" ${this.currentLimit === 100 ? 'selected' : ''}>100</option>
                                <option value="500" ${this.currentLimit === 500 ? 'selected' : ''}>500</option>
                            </select>
                        </div>
                    </div>

                    <!-- Page Navigator -->
                    <div class="flex items-center gap-1.5">
                        <button id="grid-first-page" ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-800 text-slate-300 hover:text-white"'} class="w-7 h-7 rounded-lg border border-slate-800 flex items-center justify-center transition">
                            <i class="fa-solid fa-angles-left text-xs"></i>
                        </button>
                        <button id="grid-prev-page" ${this.currentPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-800 text-slate-300 hover:text-white"'} class="w-7 h-7 rounded-lg border border-slate-800 flex items-center justify-center transition">
                            <i class="fa-solid fa-angle-left text-xs"></i>
                        </button>

                        <span class="px-2 font-medium text-slate-200">
                            หน้า ${this.currentPage} / ${Math.max(1, totalPages)}
                        </span>

                        <button id="grid-next-page" ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-800 text-slate-300 hover:text-white"'} class="w-7 h-7 rounded-lg border border-slate-800 flex items-center justify-center transition">
                            <i class="fa-solid fa-angle-right text-xs"></i>
                        </button>
                        <button id="grid-last-page" ${this.currentPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-slate-800 text-slate-300 hover:text-white"'} class="w-7 h-7 rounded-lg border border-slate-800 flex items-center justify-center transition">
                            <i class="fa-solid fa-angles-right text-xs"></i>
                        </button>
                    </div>
                </div>

            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        const searchInput = document.getElementById('grid-search-input');
        if (searchInput) {
            searchInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    this.searchQuery = searchInput.value.trim();
                    this.currentPage = 1;
                    this.loadData();
                }
            };
        }

        const clearSearch = document.getElementById('grid-clear-search');
        if (clearSearch) {
            clearSearch.onclick = () => {
                this.searchQuery = '';
                this.currentPage = 1;
                this.loadData();
            };
        }

        const refreshBtn = document.getElementById('grid-refresh-btn');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.loadData();
        }

        const insertBtn = document.getElementById('grid-insert-row-btn') || document.getElementById('grid-empty-insert-btn');
        if (insertBtn) {
            insertBtn.onclick = () => this.showInsertRowModal();
        }

        const exportBtn = document.getElementById('grid-export-btn');
        if (exportBtn) {
            exportBtn.onclick = () => this.showExportModal();
        }

        const limitSelect = document.getElementById('grid-limit-select');
        if (limitSelect) {
            limitSelect.onchange = (e) => {
                this.currentLimit = Number(e.target.value);
                this.currentPage = 1;
                this.loadData();
            };
        }

        // Pagination
        document.getElementById('grid-first-page')?.addEventListener('click', () => {
            this.currentPage = 1;
            this.loadData();
        });
        document.getElementById('grid-prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadData();
            }
        });
        document.getElementById('grid-next-page')?.addEventListener('click', () => {
            if (this.currentPage < this.tableData.pagination.total_pages) {
                this.currentPage++;
                this.loadData();
            }
        });
        document.getElementById('grid-last-page')?.addEventListener('click', () => {
            this.currentPage = this.tableData.pagination.total_pages;
            this.loadData();
        });

        // Column Sorting
        this.container.querySelectorAll('[data-sort-col]').forEach(th => {
            th.onclick = () => {
                const colName = th.getAttribute('data-sort-col');
                if (this.sortCol === colName) {
                    this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC';
                } else {
                    this.sortCol = colName;
                    this.sortDir = 'ASC';
                }
                this.currentPage = 1;
                this.loadData();
            };
        });

        // Select All Checkbox
        const selectAll = document.getElementById('grid-select-all');
        if (selectAll) {
            selectAll.onchange = (e) => {
                const checked = e.target.checked;
                this.selectedRowIndices.clear();
                if (checked && this.tableData?.rows) {
                    this.tableData.rows.forEach((_, idx) => this.selectedRowIndices.add(idx));
                }
                this.render();
            };
        }

        // Row Checkboxes
        this.container.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                const idx = Number(cb.getAttribute('data-row-idx'));
                if (e.target.checked) {
                    this.selectedRowIndices.add(idx);
                } else {
                    this.selectedRowIndices.delete(idx);
                }
                this.render();
            };
        });

        // Bulk Delete
        const bulkDeleteBtn = document.getElementById('grid-bulk-delete-btn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.onclick = () => this.handleBulkDelete();
        }

        // Single Row Delete
        this.container.querySelectorAll('.row-delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                const idx = Number(btn.getAttribute('data-row-idx'));
                this.handleSingleDelete(idx);
            };
        });

        // Double Click Inline Edit Cell
        this.container.querySelectorAll('.editable-cell').forEach(td => {
            td.ondblclick = (e) => this.startInlineEdit(td);
        });
    },

    startInlineEdit(td) {
        if (td.classList.contains('cell-editing')) return;

        const rowIdx = Number(td.getAttribute('data-row-idx'));
        const colName = td.getAttribute('data-col-name');
        const row = this.tableData.rows[rowIdx];
        const rawValue = row[colName];
        const initialValue = rawValue === null ? '' : String(rawValue);

        td.classList.add('cell-editing');
        td.innerHTML = `
            <input type="text" class="cell-input" value="${Formatter.escapeHtml(initialValue)}">
        `;

        const input = td.querySelector('input');
        input.focus();
        input.select();

        let committed = false;

        const commitChange = async () => {
            if (committed) return;
            committed = true;

            const newValue = input.value;
            td.classList.remove('cell-editing');

            if (newValue === initialValue && rawValue !== null) {
                td.innerHTML = Formatter.escapeHtml(newValue);
                return;
            }

            // Determine primary keys for updating row
            const pkValues = this.extractPrimaryKeysForRow(row);

            try {
                td.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-indigo-400"></i>';
                
                await api.put('/tables/rows', {
                    database: this.tableData.database,
                    table: this.tableData.table,
                    primary_keys: pkValues,
                    changes: {
                        [colName]: newValue === '' ? null : newValue
                    }
                });

                Toast.success('แก้ไขข้อมูลสำเร็จ');
                this.loadData();
            } catch (e) {
                Toast.error('ไม่สามารถบันทึกข้อมูลได้: ' + e.message);
                td.innerHTML = rawValue === null ? '<span class="badge-null">NULL</span>' : Formatter.escapeHtml(rawValue);
            }
        };

        const cancelEdit = () => {
            if (committed) return;
            committed = true;
            td.classList.remove('cell-editing');
            td.innerHTML = rawValue === null ? '<span class="badge-null">NULL</span>' : Formatter.escapeHtml(rawValue);
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                commitChange();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        };

        input.onblur = () => commitChange();
    },

    extractPrimaryKeysForRow(row) {
        const pks = this.tableData.primary_keys;
        const result = {};
        if (pks && pks.length > 0) {
            pks.forEach(pk => {
                result[pk] = row[pk];
            });
        } else {
            // Fallback: use all columns as identifier if no PK is defined
            Object.keys(row).forEach(k => {
                result[k] = row[k];
            });
        }
        return result;
    },

    handleSingleDelete(rowIdx) {
        const row = this.tableData.rows[rowIdx];
        const pkValues = this.extractPrimaryKeysForRow(row);

        Modal.confirm('ลบแถวข้อมูล', 'คุณต้องการลบแถวข้อมูลนี้หรือไม่?', {
            danger: true,
            confirmText: 'ลบข้อมูล',
            onConfirm: async () => {
                await api.delete('/tables/rows', {
                    database: this.tableData.database,
                    table: this.tableData.table,
                    primary_keys: JSON.stringify(pkValues)
                });
                Toast.success('ลบข้อมูลสำเร็จ');
                this.loadData();
            }
        });
    },

    handleBulkDelete() {
        if (this.selectedRowIndices.size === 0) return;

        const rowsKeys = [];
        this.selectedRowIndices.forEach(idx => {
            const row = this.tableData.rows[idx];
            if (row) {
                rowsKeys.push(this.extractPrimaryKeysForRow(row));
            }
        });

        Modal.confirm(
            'ลบข้อมูลเป็นกลุ่ม (Batch Delete)',
            `คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลที่เลือกจำนวน ${rowsKeys.length} แถว?`,
            {
                danger: true,
                confirmText: `ลบ ${rowsKeys.length} แถว`,
                onConfirm: async () => {
                    const res = await api.post('/tables/rows/bulk-delete', {
                        database: this.tableData.database,
                        table: this.tableData.table,
                        rows_keys: rowsKeys
                    });
                    Toast.success(res.message || 'ลบข้อมูลสำเร็จ');
                    this.selectedRowIndices.clear();
                    this.loadData();
                }
            }
        );
    },

    showInsertRowModal() {
        const { database, table, columns } = this.tableData;

        const formFieldsHtml = columns.map(col => {
            const isAutoInc = (col.extra || '').toLowerCase().includes('auto_increment');
            const isPri = col.column_key === 'PRI';
            const isNullAllowed = col.is_nullable === 'YES';

            return `
                <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-700/60 space-y-2">
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-1.5">
                            ${isPri ? '<i class="fa-solid fa-key text-amber-400 text-[10px]"></i>' : ''}
                            <span class="font-bold text-slate-200">${Formatter.escapeHtml(col.name)}</span>
                            <span class="text-slate-500 font-mono">(${Formatter.escapeHtml(col.column_type)})</span>
                        </div>
                        ${isNullAllowed ? `
                            <label class="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                                <input type="checkbox" class="insert-null-check rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0" data-col="${Formatter.escapeHtml(col.name)}">
                                <span>NULL</span>
                            </label>
                        ` : ''}
                    </div>

                    ${isAutoInc ? `
                        <div class="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-lg text-xs text-indigo-400 font-mono flex items-center justify-between">
                            <span>AUTO_INCREMENT (สร้างให้อัตโนมัติ)</span>
                            <i class="fa-solid fa-bolt"></i>
                        </div>
                    ` : `
                        <input type="text" 
                            name="col_${Formatter.escapeHtml(col.name)}" 
                            data-col="${Formatter.escapeHtml(col.name)}"
                            placeholder="${col.default_value !== null ? `Default: ${col.default_value}` : ''}"
                            class="insert-col-input w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono">
                    `}
                </div>
            `;
        }).join('');

        Modal.custom({
            title: `<i class="fa-solid fa-plus text-indigo-400 mr-2"></i> เพิ่มแถวข้อมูลใหม่ใน \`${Formatter.escapeHtml(table)}\``,
            bodyHtml: `
                <form id="insert-row-form" class="space-y-3">
                    ${formFieldsHtml}
                </form>
            `,
            footerHtml: `
                <button id="modal-cancel-btn" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition">ยกเลิก</button>
                <button id="modal-submit-insert-btn" class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">บันทึกข้อมูล</button>
            `,
            maxWidth: 'max-w-2xl',
            onOpen: (box) => {
                box.querySelectorAll('.insert-null-check').forEach(chk => {
                    chk.onchange = (e) => {
                        const col = chk.getAttribute('data-col');
                        const input = box.querySelector(`input[data-col="${col}"].insert-col-input`);
                        if (input) {
                            input.disabled = chk.checked;
                            if (chk.checked) input.value = '';
                        }
                    };
                });

                box.querySelector('#modal-cancel-btn').onclick = () => Modal.close();

                box.querySelector('#modal-submit-insert-btn').onclick = async () => {
                    const data = {};
                    box.querySelectorAll('.insert-col-input').forEach(input => {
                        const col = input.getAttribute('data-col');
                        const nullCheck = box.querySelector(`.insert-null-check[data-col="${col}"]`);
                        
                        if (nullCheck && nullCheck.checked) {
                            data[col] = 'NULL';
                        } else {
                            data[col] = input.value;
                        }
                    });

                    try {
                        const res = await api.post('/tables/rows', {
                            database,
                            table,
                            data
                        });
                        Toast.success(res.message || 'เพิ่มแถวใหม่สำเร็จ');
                        Modal.close();
                        this.loadData();
                    } catch (e) {
                        Toast.error(e.message);
                    }
                };
            }
        });
    },

    showExportModal() {
        const { database, table } = this.tableData;
        const apiPrefix = window.APP_CONFIG?.apiPrefix || '/api';

        Modal.custom({
            title: `<i class="fa-solid fa-download text-indigo-400 mr-2"></i> ส่งออกข้อมูลตาราง: \`${Formatter.escapeHtml(table)}\``,
            bodyHtml: `
                <div class="space-y-3">
                    <a href="${apiPrefix}/export/table?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}&format=csv" 
                        class="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 text-slate-200 text-sm transition">
                        <i class="fa-solid fa-file-csv text-emerald-400 text-2xl"></i>
                        <div>
                            <div class="font-bold">ส่งออกเป็นไฟล์ CSV</div>
                            <div class="text-xs text-slate-400">เหมาะสำหรับเปิดใน Microsoft Excel หรือ Google Sheets</div>
                        </div>
                    </a>

                    <a href="${apiPrefix}/export/table?database=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}&format=json" 
                        class="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 text-slate-200 text-sm transition">
                        <i class="fa-solid fa-file-code text-amber-400 text-2xl"></i>
                        <div>
                            <div class="font-bold">ส่งออกเป็นไฟล์ JSON</div>
                            <div class="text-xs text-slate-400">เหมาะสำหรับนักพัฒนาโปรแกรมและ Web API</div>
                        </div>
                    </a>

                    <a href="${apiPrefix}/export/dump?database=${encodeURIComponent(database)}&tables=${encodeURIComponent(table)}&structure=1&data=1" 
                        class="flex items-center gap-3 p-4 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700 text-slate-200 text-sm transition">
                        <i class="fa-solid fa-database text-indigo-400 text-2xl"></i>
                        <div>
                            <div class="font-bold">ส่งออกเป็นไฟล์ SQL Dump (.sql)</div>
                            <div class="text-xs text-slate-400">รวมโครงสร้าง (Structure) และข้อมูล (Data)</div>
                        </div>
                    </a>
                </div>
            `,
            maxWidth: 'max-w-md'
        });
    }
};
