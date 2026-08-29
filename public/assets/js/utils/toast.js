/**
 * Toast Notification Module
 */

class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
    }

    show(message, type = 'info', duration = 4000) {
        if (!this.container) {
            this.container = document.getElementById('toast-container');
            if (!this.container) return;
        }

        const icons = {
            success: 'fa-circle-check text-emerald-400',
            error: 'fa-circle-exclamation text-rose-400',
            warning: 'fa-triangle-exclamation text-amber-400',
            info: 'fa-circle-info text-sky-400'
        };

        const bgBorders = {
            success: 'border-emerald-500/30 bg-slate-900/95 text-emerald-100',
            error: 'border-rose-500/30 bg-slate-900/95 text-rose-100',
            warning: 'border-amber-500/30 bg-slate-900/95 text-amber-100',
            info: 'border-sky-500/30 bg-slate-900/95 text-sky-100'
        };

        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-sm font-medium toast-enter ${bgBorders[type] || bgBorders.info} max-w-md`;
        
        toast.innerHTML = `
            <i class="fa-solid ${icons[type] || icons.info} text-lg flex-shrink-0"></i>
            <div class="flex-1 break-words">${this.escape(message)}</div>
            <button class="text-slate-400 hover:text-white transition-colors ml-2 flex-shrink-0" onclick="this.parentElement.remove()">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    success(message, duration = 4000) {
        this.show(message, 'success', duration);
    }

    error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    warning(message, duration = 4500) {
        this.show(message, 'warning', duration);
    }

    info(message, duration = 3500) {
        this.show(message, 'info', duration);
    }

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

export const Toast = new ToastManager();
