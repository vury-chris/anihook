class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            WEBHOOKS: 'discord_webhooks',
            CURRENT_WEBHOOK: 'current_webhook',
            USER_SETTINGS: 'user_settings'
        };
        this.init();
    }

    init() {
        this.ensureStorageStructure();
    }

    ensureStorageStructure() {
        if (!this.getWebhooks()) {
            this.setItem(this.STORAGE_KEYS.WEBHOOKS, []);
        }
        
        if (!this.getUserSettings()) {
            this.setItem(this.STORAGE_KEYS.USER_SETTINGS, {
                theme: 'dark',
                autoSave: true
            });
        }
    }

    // Generic storage methods
    setItem(key, value) {
        try {
            const item = JSON.stringify(value);
            sessionStorage.setItem(key, item);
            return true;
        } catch (error) {
            console.error('Error saving to storage:', error);
            return false;
        }
    }

    getItem(key) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error reading from storage:', error);
            return null;
        }
    }

    removeItem(key) {
        try {
            sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from storage:', error);
            return false;
        }
    }

    // Webhook management
    getWebhooks() {
        return this.getItem(this.STORAGE_KEYS.WEBHOOKS) || [];
    }

    saveWebhook(webhook) {
        const webhooks = this.getWebhooks();
        const existingIndex = webhooks.findIndex(w => w.id === webhook.id);
        
        if (existingIndex !== -1) {
            webhooks[existingIndex] = { ...webhook, updatedAt: Date.now() };
        } else {
            webhook.id = this.generateId();
            webhook.createdAt = Date.now();
            webhook.updatedAt = Date.now();
            webhooks.push(webhook);
        }
        
        this.setItem(this.STORAGE_KEYS.WEBHOOKS, webhooks);
        
        // Dispatch event for UI updates
        this.dispatchStorageEvent('webhookSaved', webhook);
        
        return webhook;
    }

    deleteWebhook(webhookId) {
        const webhooks = this.getWebhooks();
        const filteredWebhooks = webhooks.filter(w => w.id !== webhookId);
        
        if (filteredWebhooks.length !== webhooks.length) {
            this.setItem(this.STORAGE_KEYS.WEBHOOKS, filteredWebhooks);
            
            // Clear current webhook if it's the one being deleted
            const currentWebhook = this.getCurrentWebhook();
            if (currentWebhook && currentWebhook.id === webhookId) {
                this.setCurrentWebhook(null);
            }
            
            this.dispatchStorageEvent('webhookDeleted', webhookId);
            return true;
        }
        
        return false;
    }

    getWebhook(webhookId) {
        const webhooks = this.getWebhooks();
        return webhooks.find(w => w.id === webhookId) || null;
    }

    // Current webhook management
    getCurrentWebhook() {
        return this.getItem(this.STORAGE_KEYS.CURRENT_WEBHOOK);
    }

    setCurrentWebhook(webhook) {
        this.setItem(this.STORAGE_KEYS.CURRENT_WEBHOOK, webhook);
        this.dispatchStorageEvent('currentWebhookChanged', webhook);
    }

    // User settings
    getUserSettings() {
        return this.getItem(this.STORAGE_KEYS.USER_SETTINGS);
    }

    updateUserSettings(settings) {
        const currentSettings = this.getUserSettings() || {};
        const updatedSettings = { ...currentSettings, ...settings };
        this.setItem(this.STORAGE_KEYS.USER_SETTINGS, updatedSettings);
        this.dispatchStorageEvent('settingsUpdated', updatedSettings);
        return updatedSettings;
    }

    // Import/Export functionality
    exportWebhooks() {
        const webhooks = this.getWebhooks();
        const exportData = {
            webhooks: webhooks,
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    importWebhooks(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.webhooks || !Array.isArray(importData.webhooks)) {
                throw new Error('Invalid import data format');
            }

            const existingWebhooks = this.getWebhooks();
            const importedWebhooks = importData.webhooks.map(webhook => ({
                ...webhook,
                id: this.generateId(), // Generate new IDs to avoid conflicts
                importedAt: Date.now()
            }));

            const allWebhooks = [...existingWebhooks, ...importedWebhooks];
            this.setItem(this.STORAGE_KEYS.WEBHOOKS, allWebhooks);
            
            this.dispatchStorageEvent('webhooksImported', importedWebhooks);
            return importedWebhooks;
        } catch (error) {
            console.error('Import error:', error);
            throw new Error('Failed to import webhooks: ' + error.message);
        }
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    dispatchStorageEvent(type, data) {
        const event = new CustomEvent('storageUpdate', {
            detail: { type, data }
        });
        document.dispatchEvent(event);
    }

    // Get storage usage statistics
    getStorageStats() {
        const webhooks = this.getWebhooks();
        const totalSize = new Blob([JSON.stringify(webhooks)]).size;
        
        return {
            webhookCount: webhooks.length,
            totalSize: totalSize,
            sizeFormatted: this.formatBytes(totalSize),
            lastUpdated: webhooks.length > 0 ? Math.max(...webhooks.map(w => w.updatedAt || w.createdAt || 0)) : null
        };
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Clear all data
    clearAllData() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            this.removeItem(key);
        });
        
        this.dispatchStorageEvent('allDataCleared', null);
    }
}

// Global instance
window.storageManager = new StorageManager();