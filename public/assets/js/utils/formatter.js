/**
 * Data Formatting & Text Utilities
 */

export const Formatter = {
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0 || !bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        return Number(num).toLocaleString('th-TH');
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } catch {
            return dateStr;
        }
    },

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    highlightSql(sql) {
        if (!sql) return '';
        let escaped = this.escapeHtml(sql);

        const keywords = [
            'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
            'INNER JOIN', 'OUTER JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
            'ALL', 'DISTINCT', 'AS', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'EXISTS',
            'CREATE', 'ALTER', 'DROP', 'TABLE', 'DATABASE', 'SCHEMA', 'INDEX', 'VIEW', 'PRIMARY KEY', 'FOREIGN KEY',
            'ADD', 'MODIFY', 'COLUMN', 'CHANGE', 'TRUNCATE', 'RENAME', 'TO', 'SET', 'VALUES', 'SHOW', 'DESCRIBE',
            'EXPLAIN', 'USE', 'DEFAULT', 'AUTO_INCREMENT', 'ENGINE', 'CHARSET', 'COLLATE', 'CASCADE'
        ];

        const functions = [
            'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'CONCAT', 'COALESCE', 'NOW', 'DATE', 'DATE_FORMAT',
            'IFNULL', 'SUBSTRING', 'LENGTH', 'LOWER', 'UPPER', 'TRIM', 'ROUND', 'FLOOR', 'CEIL', 'VERSION', 'DATABASE', 'USER'
        ];

        // Keywords regex
        const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
        escaped = escaped.replace(kwRegex, match => `<span class="sql-keyword">${match.toUpperCase()}</span>`);

        // Functions regex
        const fnRegex = new RegExp(`\\b(${functions.join('|')})(?=\\s*\\()`, 'gi');
        escaped = escaped.replace(fnRegex, match => `<span class="sql-function">${match.toUpperCase()}</span>`);

        // Numbers
        escaped = escaped.replace(/\b(\d+)\b/g, '<span class="sql-number">$1</span>');

        // Strings in single or double quotes
        escaped = escaped.replace(/(['"])(.*?)\1/g, '<span class="sql-string">$1$2$1</span>');

        return escaped;
    },

    formatSql(sql) {
        if (!sql) return '';
        let formatted = sql.trim();
        const keywordsToBreak = ['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'JOIN', 'UNION', 'VALUES', 'SET'];
        
        keywordsToBreak.forEach(kw => {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            formatted = formatted.replace(regex, `\n${kw.toUpperCase()} `);
        });

        return formatted.trim();
    }
};
