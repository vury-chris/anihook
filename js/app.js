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

        // Initialize components in correct order
        this.initializeComponents();
        
        // Set up global event listeners
        this.setupGlobalListeners();
        
        // Load saved state
        this.loadApplicationState();
        
        // Set up periodic tasks
        this.setupPeriodicTasks();
        
        this.initialized = true;
        console.log('✅ Discord Webhook Manager - Ready!');
        
        // Show welcome message for new users
        this.showWelcomeIfNeeded();
    }

    checkDependencies() {
        const required = [
            'storageManager',
            'discordAuth', 
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

    initializeComponents() {
        // Auth system is already initialized
        console.log('✓ Auth system ready');
        
        // Storage system is already initialized  
        console.log('✓ Storage system ready');
        
        // Initialize webhook manager
        if (window.webhookManager && typeof window.webhookManager.init === 'function') {
            window.webhookManager.init();
        }
        console.log('✓ Webhook manager ready');
        
        // Initialize preview system
        if (window.discordPreview && typeof window.discordPreview.init === 'function') {
            window.discordPreview.init();
        }
        console.log('✓ Preview system ready');
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

        // Storage events
        document.addEventListener('storageUpdate', (e) => {
            this.handleStorageUpdate(e);
        });

        // Auth events
        document.addEventListener('authStateChanged', (e) => {
            this.handleAuthStateChange(e);
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
        // Check for unsaved changes
        const messageContent = document.getElementById('messageContent')?.value?.trim();
        const hasUnsavedContent = messageContent && messageContent.length > 0;
        
        if (hasUnsavedContent) {
            // Save draft before leaving
            window.storageManager?.saveDraft({
                message: messageContent,
                embed: this.getCurrentEmbedData(),
                timestamp: Date.now()
            });
        }
    }

    handleGlobalError(event) {
        console.error('Global error:', event.error);
        
        // Show user-friendly error message
        this.showToast('An unexpected error occurred. Please refresh the page if issues persist.', 'error');
        
        // Log error details for debugging
        if (event.error && event.error.stack) {
            console.error('Stack trace:', event.error.stack);
        }
    }

    handleStorageUpdate(event) {
        const { type, data } = event.detail;
        
        switch (type) {
            case 'webhookSaved':
                console.log('Webhook saved:', data.name);
                break;
            case 'webhookDeleted':
                console.log('Webhook deleted:', data);
                break;
            case 'allDataCleared':
                console.log('All data cleared');
                this.showToast('All data has been cleared', 'info');
                break;
        }
    }

    handleAuthStateChange(event) {
        const { isAuthenticated, user } = event.detail;
        
        if (isAuthenticated) {
            console.log('User authenticated:', user.username);
            this.onUserAuthenticated(user);
        } else {
            console.log('User logged out');
            this.onUserLoggedOut();
        }
    }

    onUserAuthenticated(user) {
        // Load user's webhooks
        if (window.webhookManager) {
            window.webhookManager.loadWebhooks();
        }
        
        // Load user preferences
        this.loadUserPreferences();
        
        // Show welcome message
        this.showToast(`Welcome back, ${user.username}!`, 'success');
    }

    onUserLoggedOut() {
        // Clear sensitive data
        if (window.webhookManager) {
            window.webhookManager.clearWebhooks();
        }
        
        if (window.discordPreview) {
            window.discordPreview.clear();
        }
    }

    loadApplicationState() {
        // Load user settings
        const settings = window.storageManager?.getUserSettings();
        if (settings) {
            this.applyUserSettings(settings);
        }

        // Load draft if available
        const draft = window.storageManager?.getDraft();
        if (draft) {
            this.loadDraft(draft);
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

    loadDraft(draft) {
        if (draft.message) {
            const messageContent = document.getElementById('messageContent');
            if (messageContent && !messageContent.value) {
                messageContent.value = draft.message;
            }
        }

        if (draft.embed) {
            this.loadEmbedDraft(draft.embed);
        }
    }

    loadEmbedDraft(embedData) {
        const fields = [
            'embedTitle',
            'embedDescription',
            'embedColor',
            'embedUrl',
            'embedImage',
            'embedThumbnail'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            const key = field.replace('embed', '').toLowerCase();
            if (element && embedData[key] && !element.value) {
                element.value = embedData[key];
            }
        });
    }

    getCurrentEmbedData() {
        const embedData = {};
        const fields = [
            'embedTitle',
            'embedDescription',
            'embedColor',
            'embedUrl',
            'embedImage',
            'embedThumbnail'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                const key = field.replace('embed', '').toLowerCase();
                embedData[key] = element.value;
            }
        });

        return embedData;
    }

    setupPeriodicTasks() {
        // Auto-save drafts every 30 seconds
        setInterval(() => {
            const messageContent = document.getElementById('messageContent')?.value?.trim();
            if (messageContent) {
                window.storageManager?.saveDraft({
                    message: messageContent,
                    embed: this.getCurrentEmbedData(),
                    timestamp: Date.now()
                });
            }
        }, 30000);

        // Cleanup old data every hour
        setInterval(() => {
            window.storageManager?.cleanup();
        }, 3600000);
    }

    loadUserPreferences() {
        const settings = window.storageManager?.getUserSettings();
        
        if (settings) {
            // Apply saved settings
            Object.entries(settings).forEach(([key, value]) => {
                this.applySetting(key, value);
            });
        }
    }

    applySetting(key, value) {
        switch (key) {
            case 'theme':
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect && themeSelect.value !== value) {
                    themeSelect.value = value;
                    themeSelect.dispatchEvent(new Event('change'));
                }
                break;
            case 'autoSave':
                // Auto-save is handled by storage manager
                break;
            default:
                console.log(`Unknown setting: ${key}`);
        }
    }

    showWelcomeIfNeeded() {
        const webhooks = window.storageManager?.getWebhooks() || [];
        const isFirstTime = webhooks.length === 0 && !localStorage.getItem('welcomed');
        
        if (isFirstTime && window.discordAuth?.isAuthenticated()) {
            setTimeout(() => {
                this.showWelcomeModal();
                localStorage.setItem('welcomed', 'true');
            }, 1000);
        }
    }

    showWelcomeModal() {
        // Create and show welcome modal with tips
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Welcome to Discord Webhook Manager!</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Get started by creating your first webhook:</p>
                    <ol>
                        <li>Click the <strong>+</strong> button in the sidebar</li>
                        <li>Enter your webhook name and Discord webhook URL</li>
                        <li>Customize the avatar and name that will appear in Discord</li>
                        <li>Start composing messages with full markdown support!</li>
                    </ol>
                    <p><strong>Pro tip:</strong> Use <kbd>Ctrl+S</kbd> to save and <kbd>Ctrl+Enter</kbd> to send messages quickly!</p>
                </div>
                <div class="modal-footer">
                    <button class="modal-close primary-btn">Got it!</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add close listeners
        modal.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-title">${this.getToastTitle(type)}</div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    getToastTitle(type) {
        switch (type) {
            case 'success': return 'Success';
            case 'error': return 'Error';
            case 'warning': return 'Warning';
            default: return 'Info';
        }
    }

    // Public API methods
    exportData() {
        try {
            const data = window.storageManager?.exportWebhooks();
            if (data) {
                this.downloadFile('webhook-export.json', data);
                this.showToast('Data exported successfully!', 'success');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Failed to export data', 'error');
        }
    }

    importData(jsonData) {
        try {
            const imported = window.storageManager?.importWebhooks(jsonData);
            if (imported && imported.length > 0) {
                this.showToast(`Imported ${imported.length} webhooks successfully!`, 'success');
                window.webhookManager?.loadWebhooks();
            }
        } catch (error) {
            console.error('Import error:', error);
            this.showToast('Failed to import data: ' + error.message, 'error');
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

    // Debug methods
    getAppState() {
        return {
            initialized: this.initialized,
            authenticated: window.discordAuth?.isAuthenticated(),
            currentUser: window.discordAuth?.getUser(),
            webhookCount: window.storageManager?.getWebhooks()?.length || 0,
            currentWebhook: window.webhookManager?.getCurrentWebhook(),
            storageStats: window.storageManager?.getStorageStats()
        };
    }

    resetApp() {
        if (confirm('This will clear all data and reset the application. Are you sure?')) {
            window.storageManager?.clearAllData();
            window.discordAuth?.logout();
            location.reload();
        }
    }
}

// Initialize the application
window.discordWebhookApp = new DiscordWebhookApp();

// Development helpers (available in console)
if (typeof window !== 'undefined') {
    window.app = window.discordWebhookApp;
}