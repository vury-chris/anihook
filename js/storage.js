class StorageManager {
    constructor() {
        this.STORAGE_KEYS = {
            WEBHOOKS: 'discord_webhooks',
            CURRENT_WEBHOOK: 'current_webhook',
            USER_SETTINGS: 'user_settings',
            DRAFT_MESSAGE: 'draft_message'
        };
        this.init();
    }

    init() {
        // Initialize storage structure if needed
        this.ensureStorageStructure();
        
        // Set up auto-save for drafts
        this.setupAutoSave();
    }

    ensureStorageStructure() {
        if (!this.getWebhooks()) {
            this.setItem(this.STORAGE_KEYS.WEBHOOKS, []);
        }
        
        if (!this.getUserSettings()) {
            this.setItem(this.STORAGE_KEYS.USER_SETTINGS, {
                theme: 'dark',
                autoSave: true,
                notifications: true
            });
        }
    }

    // Generic storage methods
    setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    getItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
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
            webhooks[existingIndex] = webhook;
        } else {
            webhook.id = this.generateId();
            webhook.createdAt = Date.now();
            webhooks.push(webhook);
        }
        
        webhook.updatedAt = Date.now();
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

    // Draft management
    saveDraft(content) {
        const draft = {
            content: content,
            timestamp: Date.now()
        };
        this.setItem(this.STORAGE_KEYS.DRAFT_MESSAGE, draft);
    }

    getDraft() {
        const draft = this.getItem(this.STORAGE_KEYS.DRAFT_MESSAGE);
        
        // Only return draft if it's less than 24 hours old
        if (draft && Date.now() - draft.timestamp < 86400000) {
            return draft.content;
        }
        
        return null;
    }

    clearDraft() {
        this.removeItem(this.STORAGE_KEYS.DRAFT_MESSAGE);
    }

    // Auto-save functionality
    setupAutoSave() {
        let saveTimeout;
        
        const autoSave = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const messageContent = document.getElementById('messageContent');
                if (messageContent && messageContent.value.trim()) {
                    this.saveDraft({
                        message: messageContent.value,
                        embed: this.getCurrentEmbedData()
                    });
                }
            }, 2000); // Save after 2 seconds of inactivity
        };

        // Set up auto-save listeners when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            const messageContent = document.getElementById('messageContent');
            if (messageContent) {
                messageContent.addEventListener('input', autoSave);
            }
        });
    }

    getCurrentEmbedData() {
        const embedElements = [
            'embedTitle',
            'embedDescription',
            'embedColor',
            'embedUrl',
            'embedImage',
            'embedThumbnail'
        ];

        const embedData = {};
        embedElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const key = id.replace('embed', '').toLowerCase();
                embedData[key] = element.value;
            }
        });

        return embedData;
    }

    // Import/Export functionality
    exportWebhooks() {
        const webhooks = this.getWebhooks();
        const exportData = {
            webhooks: webhooks,
            exportDate: new Date().toISOString(),
            version: '1.0'
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

    // Data cleanup and maintenance
    cleanup() {
        // Remove old drafts
        const draft = this.getItem(this.STORAGE_KEYS.DRAFT_MESSAGE);
        if (draft && Date.now() - draft.timestamp > 86400000) {
            this.clearDraft();
        }
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

// Initialize cleanup on page load
document.addEventListener('DOMContentLoaded', () => {
    window.storageManager.cleanup();
});