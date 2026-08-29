/**
 * Central State Store (Reactive Event Emitter)
 */
import { api } from './api.js';
import { Toast } from './utils/toast.js';

class Store {
    constructor() {
        this.state = {
            auth: {
                connected: false,
                user: '',
                host: '127.0.0.1',
                port: 3306,
                server_version: '',
            },
            activeDatabase: null,
            activeTable: null,
            activeTab: 'data', // data | structure | sql | export_import | server
            databases: [],
            tables: [],
            theme: localStorage.getItem('acore_theme') || 'light',
            loading: false,
        };

        this.listeners = new Set();
    }

    getState() {
        return this.state;
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    emit(event, payload) {
        this.listeners.forEach(listener => listener(event, this.state, payload));
    }

    setState(newState, eventName = 'state:changed') {
        this.state = { ...this.state, ...newState };
        this.emit(eventName, newState);
    }

    async checkAuthStatus() {
        try {
            const res = await api.get('/auth/status');
            if (res.data?.connected) {
                this.setState({
                    auth: {
                        connected: true,
                        user: res.data.user,
                        host: res.data.host,
                        port: res.data.port,
                        server_version: res.data.server_version,
                    },
                    activeDatabase: res.data.active_database || null,
                }, 'auth:connected');

                await this.refreshDatabases();
                if (this.state.activeDatabase) {
                    await this.refreshTables();
                }
            } else {
                this.setState({
                    auth: { connected: false },
                    activeDatabase: null,
                    activeTable: null,
                    databases: [],
                    tables: [],
                }, 'auth:disconnected');
            }
        } catch (e) {
            this.setState({
                auth: { connected: false }
            }, 'auth:disconnected');
        }
    }

    async refreshDatabases() {
        try {
            const res = await api.get('/databases', { include_system: '1' });
            if (res.data) {
                this.setState({
                    databases: res.data.databases || [],
                    activeDatabase: res.data.active || this.state.activeDatabase,
                }, 'databases:updated');
            }
        } catch (e) {
            Toast.error('ไม่สามารถโหลดรายชื่อฐานข้อมูลได้: ' + e.message);
        }
    }

    async selectDatabase(dbName) {
        if (!dbName) return;
        try {
            await api.post('/databases/select', { name: dbName });
            this.setState({
                activeDatabase: dbName,
                activeTable: null,
                activeTab: this.state.activeTab === 'server' ? 'server' : 'data',
            }, 'database:selected');

            await this.refreshTables();
        } catch (e) {
            Toast.error('ไม่สามารถเลือกฐานข้อมูลได้: ' + e.message);
        }
    }

    async refreshTables() {
        if (!this.state.activeDatabase) {
            this.setState({ tables: [] }, 'tables:updated');
            return;
        }

        try {
            const res = await api.get('/tables', { database: this.state.activeDatabase });
            if (res.data) {
                const tables = res.data.tables || [];
                let activeTable = this.state.activeTable;
                
                // If active table is not in the list anymore or not set, select the first table
                if (tables.length > 0 && (!activeTable || !tables.find(t => t.name === activeTable))) {
                    activeTable = tables[0].name;
                } else if (tables.length === 0) {
                    activeTable = null;
                }

                this.setState({
                    tables,
                    activeTable,
                }, 'tables:updated');
            }
        } catch (e) {
            Toast.error('ไม่สามารถโหลดตารางได้: ' + e.message);
        }
    }

    selectTable(tableName) {
        this.setState({
            activeTable: tableName,
            activeTab: (this.state.activeTab === 'server' || this.state.activeTab === 'export_import') ? 'data' : this.state.activeTab,
        }, 'table:selected');
    }

    setActiveTab(tabName) {
        this.setState({
            activeTab: tabName
        }, 'tab:changed');
    }

    toggleTheme() {
        const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
        this.setState({ theme: nextTheme }, 'theme:changed');
        localStorage.setItem('acore_theme', nextTheme);
        document.documentElement.className = nextTheme;
        Toast.info(nextTheme === 'dark' ? 'เปลี่ยนเป็นธีมมืด (Dark Mode)' : 'เปลี่ยนเป็นธีมสว่าง (Light Mode)', 2000);
    }
}

export const store = new Store();
