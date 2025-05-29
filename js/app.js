// Main Application Controller
class DiscordWebhookApp {
    constructor() {
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) return;
        
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeApp();
        });
    }

    initializeApp() {
        console.log('🚀 Discord Webhook Manager - Initializing...');
        
        // Check if all required components are loaded
        if (!this.checkDependencies()) {
            console.error('❌ Missing required dependencies');
            return;
        }

        // Set up global event listeners
        this.setupGlobalListeners();
        
        // Load application state
        this.loadApplicationState();
        
        this.initialized = true;
        console.log('✅ Discord Webhook Manager - Ready!');
    }

    checkDependencies() {
        const required = [
            'storageManager',
            'webhookManager',
            'discordPreview',
            'discordMarkdown'
        ];

        return required.every(dep => {
            const exists = window[dep] !== undefined;
            if (!exists) {
                console.error(`Missing dependency: ${dep}`);
            }
            return exists;
        });
    }

    setupGlobalListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window events
        window.addEventListener('beforeunload', (e) => {
            this.handleBeforeUnload(e);
        });

        // Error handling
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e);
        });

        // Prevent accidental form submissions
        document.addEventListener('submit', (e) => {
            e.preventDefault();
        });
    }

    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + S: Save current webhook
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            if (window.webhookManager && window.webhookManager.currentWebhook) {
                window.webhookManager.saveCurrentWebhook();
            }
        }

        // Ctrl/Cmd + Enter: Send message
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (window.webhookManager && window.webhookManager.currentWebhook) {
                window.webhookManager.sendMessage();
            }
        }

        // Escape: Close modal
        if (event.key === 'Escape') {
            const modal = document.querySelector('.modal:not(.hidden)');
            if (modal) {
                modal.classList.add('hidden');
            }
        }

        // Ctrl/Cmd + N: New webhook
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            if (window.webhookManager) {
                window.webhookManager.showAddModal();
            }
        }
    }

    handleBeforeUnload(event) {
        // Auto-save current webhook if there are changes
        if (window.webhookManager && window.webhookManager.currentWebhook) {
            const messageContent = document.getElementById('messageContent')?.value?.trim();
            if (messageContent && messageContent.length > 0) {
                window.webhookManager.updateCurrentWebhook();
            }
        }
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        
        // Show user-friendly error message
        if (window.webhookManager) {
            window.webhookManager.showToast('An unexpected error occurred. Please refresh the page if issues persist.', 'error');
        }
        
        // Log error details for debugging
        if (event.error && event.error.stack) {
            console.error('Stack trace:', event.error.stack);
        }
    }

    loadApplicationState() {
        // Load user settings
        const settings = window.storageManager?.getUserSettings();
        if (settings) {
            this.applyUserSettings(settings);
        }
    }

    applyUserSettings(settings) {
        // Apply theme
        if (settings.theme) {
            const themeSelect = document.getElementById('themeSelect');
            if (themeSelect) {
                themeSelect.value = settings.theme;
                themeSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    // Public API methods
    exportData() {
        try {
            const data = window.storageManager?.exportWebhooks();
            if (data) {
                this.downloadFile('webhook-export.json', data);
                if (window.webhookManager) {
                    window.webhookManager.showToast('Data exported successfully!', 'success');
                }
            }
        } catch (error) {
            console.error('Export error:', error);
            if (window.webhookManager) {
                window.webhookManager.showToast('Failed to export data', 'error');
            }
        }
    }

    importData(jsonData) {
        try {
            const imported = window.storageManager?.importWebhooks(jsonData);
            if (imported && imported.length > 0) {
                if (window.webhookManager) {
                    window.webhookManager.showToast(`Imported ${imported.length} webhooks successfully!`, 'success');
                    window.webhookManager.loadWebhooks();
                }
            }
        } catch (error) {
            console.error('Import error:', error);
            if (window.webhookManager) {
                window.webhookManager.showToast('Failed to import data: ' + error.message, 'error');
            }
        }
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Utility methods for console debugging
    getAppState() {
        return {
            initialized: this.initialized,
            webhookCount: window.storageManager?.getWebhooks()?.length || 0,
            currentWebhook: window.webhookManager?.getCurrentWebhook(),
            storageStats: window.storageManager?.getStorageStats(),
            theme: window.discordPreview?.currentTheme || 'dark'
        };
    }

    resetApp() {
        if (confirm('This will clear all data and reset the application. Are you sure?')) {
            window.storageManager?.clearAllData();
            location.reload();
        }
    }

    // Helper methods for file handling
    handleFileUpload(event, callback) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                callback(e.target.result);
            } catch (error) {
                console.error('File processing error:', error);
                if (window.webhookManager) {
                    window.webhookManager.showToast('Failed to process file', 'error');
                }
            }
        };
        reader.readAsText(file);
    }

    // Theme management
    setTheme(theme) {
        if (window.discordPreview) {
            window.discordPreview.currentTheme = theme;
            window.discordPreview.updateTheme();
            window.discordPreview.refreshPreview();
        }

        // Save theme preference
        window.storageManager?.updateUserSettings({ theme: theme });
    }

    // Message validation
    validateCurrentMessage() {
        if (window.discordPreview) {
            return window.discordPreview.validateMessage();
        }
        return { valid: true, errors: [] };
    }

    // Batch operations
    exportWebhook(webhookId) {
        const webhook = window.storageManager?.getWebhook(webhookId);
        if (webhook) {
            const exportData = {
                webhook: webhook,
                exportDate: new Date().toISOString(),
                version: '2.0'
            };
            this.downloadFile(`webhook-${webhook.name}.json`, JSON.stringify(exportData, null, 2));
        }
    }

    // Statistics
    getUsageStats() {
        const webhooks = window.storageManager?.getWebhooks() || [];
        const totalMessages = webhooks.reduce((sum, webhook) => {
            return sum + (webhook.messagesSent || 0);
        }, 0);

        return {
            totalWebhooks: webhooks.length,
            totalMessages: totalMessages,
            storageUsed: window.storageManager?.getStorageStats()?.sizeFormatted || '0 Bytes',
            lastUsed: webhooks.length > 0 ? new Date(Math.max(...webhooks.map(w => w.updatedAt || w.createdAt || 0))) : null
        };
    }
}

// Initialize the application
window.discordWebhookApp = new DiscordWebhookApp();

// Development helpers (available in console)
if (typeof window !== 'undefined') {
    window.app = window.discordWebhookApp;
    
    // Console helpers
    window.exportData = () => window.app.exportData();
    window.resetApp = () => window.app.resetApp();
    window.getStats = () => window.app.getUsageStats();
    window.validateMessage = () => window.app.validateCurrentMessage();
}