/**
 * Universal Modal Dialog Component
 */
import { Formatter } from '../utils/formatter.js';

class ModalManager {
    constructor() {
        this.overlay = document.getElementById('dynamic-modal');
        this.box = document.getElementById('dynamic-modal-box');
        this.activeCallback = null;
        this.initEvents();
    }

    initEvents() {
        if (!this.overlay) {
            this.overlay = document.getElementById('dynamic-modal');
            this.box = document.getElementById('dynamic-modal-box');
        }

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }

    isOpen() {
        return this.overlay && !this.overlay.classList.contains('hidden');
    }

    close() {
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
        this.overlay.classList.remove('modal-show');
        if (this.onCloseCallback) {
            this.onCloseCallback();
            this.onCloseCallback = null;
        }
    }

    open(maxWidthClass = 'max-w-xl') {
        if (!this.overlay) {
            this.overlay = document.getElementById('dynamic-modal');
            this.box = document.getElementById('dynamic-modal-box');
        }

        this.box.className = `bg-slate-800 border border-slate-700 text-slate-100 rounded-2xl shadow-2xl w-full ${maxWidthClass} overflow-hidden transform scale-95 transition-transform duration-200`;
        this.overlay.classList.remove('hidden');
        setTimeout(() => this.overlay.classList.add('modal-show'), 10);
    }

    confirm(title, message, { onConfirm, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', danger = false } = {}) {
        const icon = danger ? 'fa-triangle-exclamation text-rose-400' : 'fa-circle-question text-indigo-400';
        const btnClass = danger ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white';

        this.box.innerHTML = `
            <div class="px-6 py-5 border-b border-slate-700/80 flex items-center gap-3">
                <i class="fa-solid ${icon} text-xl"></i>
                <h3 class="text-lg font-semibold text-slate-100">${Formatter.escapeHtml(title)}</h3>
            </div>
            <div class="px-6 py-5 text-sm text-slate-300 leading-relaxed">
                ${Formatter.escapeHtml(message)}
            </div>
            <div class="px-6 py-4 bg-slate-900/60 border-t border-slate-700/80 flex justify-end gap-3">
                <button id="modal-btn-cancel" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition">
                    ${Formatter.escapeHtml(cancelText)}
                </button>
                <button id="modal-btn-confirm" class="px-5 py-2 rounded-xl text-sm font-medium transition shadow-lg ${btnClass}">
                    ${Formatter.escapeHtml(confirmText)}
                </button>
            </div>
        `;

        this.open('max-w-md');

        document.getElementById('modal-btn-cancel').onclick = () => this.close();
        document.getElementById('modal-btn-confirm').onclick = async () => {
            const btn = document.getElementById('modal-btn-confirm');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังดำเนินการ...';
            try {
                if (onConfirm) await onConfirm();
                this.close();
            } catch (e) {
                btn.disabled = false;
                btn.innerHTML = Formatter.escapeHtml(confirmText);
            }
        };
    }

    alert(title, message, type = 'info') {
        const icons = {
            info: 'fa-circle-info text-sky-400',
            success: 'fa-circle-check text-emerald-400',
            error: 'fa-circle-exclamation text-rose-400',
            warning: 'fa-triangle-exclamation text-amber-400'
        };

        this.box.innerHTML = `
            <div class="px-6 py-5 border-b border-slate-700/80 flex items-center gap-3">
                <i class="fa-solid ${icons[type] || icons.info} text-xl"></i>
                <h3 class="text-lg font-semibold text-slate-100">${Formatter.escapeHtml(title)}</h3>
            </div>
            <div class="px-6 py-5 text-sm text-slate-300 leading-relaxed">
                ${Formatter.escapeHtml(message)}
            </div>
            <div class="px-6 py-4 bg-slate-900/60 border-t border-slate-700/80 flex justify-end">
                <button id="modal-btn-ok" class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">
                    ตกลง
                </button>
            </div>
        `;

        this.open('max-w-md');
        document.getElementById('modal-btn-ok').onclick = () => this.close();
    }

    prompt(title, message, { defaultValue = '', placeholder = '', onConfirm, confirmText = 'ตกลง' } = {}) {
        this.box.innerHTML = `
            <div class="px-6 py-5 border-b border-slate-700/80 flex items-center gap-3">
                <i class="fa-solid fa-pen-to-square text-indigo-400 text-xl"></i>
                <h3 class="text-lg font-semibold text-slate-100">${Formatter.escapeHtml(title)}</h3>
            </div>
            <div class="px-6 py-5 space-y-3">
                <p class="text-sm text-slate-300">${Formatter.escapeHtml(message)}</p>
                <input type="text" id="modal-prompt-input" value="${Formatter.escapeHtml(defaultValue)}" placeholder="${Formatter.escapeHtml(placeholder)}"
                    class="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition">
            </div>
            <div class="px-6 py-4 bg-slate-900/60 border-t border-slate-700/80 flex justify-end gap-3">
                <button id="modal-btn-cancel" class="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition">
                    ยกเลิก
                </button>
                <button id="modal-btn-confirm" class="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg">
                    ${Formatter.escapeHtml(confirmText)}
                </button>
            </div>
        `;

        this.open('max-w-md');
        const input = document.getElementById('modal-prompt-input');
        input.focus();
        input.select();

        const handleConfirm = async () => {
            const val = input.value.trim();
            if (onConfirm) await onConfirm(val);
            this.close();
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter') handleConfirm();
        };

        document.getElementById('modal-btn-cancel').onclick = () => this.close();
        document.getElementById('modal-btn-confirm').onclick = handleConfirm;
    }

    custom({ title, bodyHtml, footerHtml = '', maxWidth = 'max-w-2xl', onOpen, onClose } = {}) {
        this.onCloseCallback = onClose;

        this.box.innerHTML = `
            <div class="px-6 py-4 border-b border-slate-700/80 flex items-center justify-between">
                <h3 class="text-lg font-semibold text-slate-100">${title}</h3>
                <button id="modal-custom-close" class="text-slate-400 hover:text-white transition">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>
            <div class="px-6 py-5 max-h-[75vh] overflow-y-auto">
                ${bodyHtml}
            </div>
            ${footerHtml ? `
                <div class="px-6 py-4 bg-slate-900/60 border-t border-slate-700/80 flex justify-end gap-3">
                    ${footerHtml}
                </div>
            ` : ''}
        `;

        this.open(maxWidth);
        document.getElementById('modal-custom-close').onclick = () => this.close();

        if (onOpen) onOpen(this.box);
    }
}

export const Modal = new ModalManager();
