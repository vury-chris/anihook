class WebhookManager {
    constructor() {
        this.currentWebhook = null;
        this.webhooks = [];
        this.init();
    }

    init() {
        this.loadWebhooks();
        this.setupEventListeners();
        this.setupUI();
    }

    loadWebhooks() {
        this.webhooks = window.storageManager.getWebhooks();
        this.currentWebhook = window.storageManager.getCurrentWebhook();
        this.renderWebhookList();
        
        if (this.currentWebhook) {
            this.selectWebhook(this.currentWebhook.id);
        }
    }

    setupEventListeners() {
        // Storage events
        document.addEventListener('storageUpdate', (e) => {
            const { type, data } = e.detail;
            switch (type) {
                case 'webhookSaved':
                    this.onWebhookSaved(data);
                    break;
                case 'webhookDeleted':
                    this.onWebhookDeleted(data);
                    break;
                case 'webhooksImported':
                    this.loadWebhooks();
                    break;
            }
        });

        // Form events
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFormListeners();
            this.setupModalListeners();
            this.setupAvatarHandling();
        });
    }

    setupFormListeners() {
        // Save webhook button
        const saveBtn = document.getElementById('saveWebhookBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentWebhook());
        }

        // Delete webhook button
        const deleteBtn = document.getElementById('deleteWebhookBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentWebhook());
        }

        // Send message button
        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Add webhook button
        const addBtn = document.getElementById('addWebhookBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        // Test webhook button
        const testBtn = document.getElementById('testWebhookBtn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testWebhookConnection());
        }

        // Form input listeners for real-time updates
        const inputs = ['webhookName', 'webhookUrl', 'avatarUrl'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateCurrentWebhook());
            }
        });
    }

    setupModalListeners() {
        const modal = document.getElementById('webhookModal');
        const modalSaveBtn = document.getElementById('modalSaveBtn');
        const closeButtons = modal?.querySelectorAll('.modal-close');

        if (modalSaveBtn) {
            modalSaveBtn.addEventListener('click', () => this.saveFromModal());
        }

        if (closeButtons) {
            closeButtons.forEach(btn => {
                btn.addEventListener('click', () => this.hideModal());
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal();
                }
            });
        }
    }

    setupAvatarHandling() {
        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const avatarFile = document.getElementById('avatarFile');
        const avatarUrl = document.getElementById('avatarUrl');
        const clearBtn = document.getElementById('clearAvatarBtn');
        const preview = document.getElementById('avatarPreview');

        if (uploadBtn && avatarFile) {
            uploadBtn.addEventListener('click', () => avatarFile.click());
            avatarFile.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        if (avatarUrl) {
            avatarUrl.addEventListener('input', () => this.updateAvatarPreview());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAvatar());
        }
    }

    setupUI() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    renderWebhookList() {
        const listElement = document.getElementById('webhookList');
        if (!listElement) return;

        if (this.webhooks.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <p>No webhooks yet</p>
                    <small>Click the + button to add your first webhook</small>
                </div>
            `;
            return;
        }

        const html = this.webhooks.map(webhook => `
            <div class="webhook-item ${webhook.id === this.currentWebhook?.id ? 'active' : ''}" 
                 data-webhook-id="${webhook.id}">
                <div class="webhook-item-name">${this.escapeHtml(webhook.name || 'Unnamed Webhook')}</div>
                <div class="webhook-item-url">${this.truncateUrl(webhook.url || '')}</div>
            </div>
        `).join('');

        listElement.innerHTML = html;

        // Add click listeners
        listElement.querySelectorAll('.webhook-item').forEach(item => {
            item.addEventListener('click', () => {
                const webhookId = item.dataset.webhookId;
                this.selectWebhook(webhookId);
            });
        });
    }

    selectWebhook(webhookId) {
        const webhook = this.webhooks.find(w => w.id === webhookId);
        if (!webhook) return;

        this.currentWebhook = webhook;
        window.storageManager.setCurrentWebhook(webhook);
        
        this.populateForm(webhook);
        this.showEditor();
        this.updateActiveItem();
        
        // Dispatch event for preview
        document.dispatchEvent(new CustomEvent('webhookSelected', {
            detail: webhook
        }));
    }

    populateForm(webhook) {
        const fields = {
            'webhookName': webhook.name || '',
            'webhookUrl': webhook.url || '',
            'avatarUrl': webhook.avatar || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });

        this.updateAvatarPreview();
    }

    showEditor() {
        const welcomeMsg = document.getElementById('welcomeMessage');
        const editor = document.getElementById('webhookEditor');
        
        if (welcomeMsg) welcomeMsg.classList.add('hidden');
        if (editor) editor.classList.remove('hidden');
    }

    hideEditor() {
        const welcomeMsg = document.getElementById('welcomeMessage');
        const editor = document.getElementById('webhookEditor');
        
        if (welcomeMsg) welcomeMsg.classList.remove('hidden');
        if (editor) editor.classList.add('hidden');
    }

    updateActiveItem() {
        const items = document.querySelectorAll('.webhook-item');
        items.forEach(item => {
            item.classList.toggle('active', 
                item.dataset.webhookId === this.currentWebhook?.id);
        });
    }

    updateCurrentWebhook() {
        if (!this.currentWebhook) return;

        const name = document.getElementById('webhookName')?.value || '';
        const url = document.getElementById('webhookUrl')?.value || '';
        const avatar = document.getElementById('avatarUrl')?.value || '';

        // Update current webhook object
        this.currentWebhook.name = name;
        this.currentWebhook.url = url;
        this.currentWebhook.avatar = avatar;

        // Dispatch update event for preview
        document.dispatchEvent(new CustomEvent('webhookUpdated', {
            detail: this.currentWebhook
        }));
    }

    async saveCurrentWebhook() {
        if (!this.currentWebhook) return;

        const name = document.getElementById('webhookName')?.value?.trim();
        const url = document.getElementById('webhookUrl')?.value?.trim();

        if (!name) {
            this.showToast('Please enter a webhook name', 'error');
            return;
        }

        if (!url) {
            this.showToast('Please enter a webhook URL', 'error');
            return;
        }

        if (!this.isValidWebhookUrl(url)) {
            this.showToast('Please enter a valid Discord webhook URL', 'error');
            return;
        }

        try {
            // Update webhook properties
            this.currentWebhook.name = name;
            this.currentWebhook.url = url;
            this.currentWebhook.avatar = document.getElementById('avatarUrl')?.value || '';

            // Sync name and avatar with Discord if they've changed
            await this.syncWebhookWithDiscord(this.currentWebhook);

            // Save to storage
            const savedWebhook = window.storageManager.saveWebhook(this.currentWebhook);
            this.currentWebhook = savedWebhook;

            this.showToast('Webhook saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving webhook:', error);
            this.showToast('Failed to save webhook: ' + error.message, 'error');
        }
    }

    async syncWebhookWithDiscord(webhook) {
        if (!webhook.url) return;

        try {
            // Get current webhook info from Discord
            const response = await fetch(webhook.url);
            
            if (!response.ok) {
                throw new Error('Invalid webhook URL or webhook no longer exists');
            }

            const webhookData = await response.json();
            
            // Prepare update payload
            const updateData = {};
            
            if (webhook.name && webhook.name !== webhookData.name) {
                updateData.name = webhook.name;
            }
            
            if (webhook.avatar && webhook.avatar !== webhookData.avatar) {
                // If avatar is a URL, convert to base64
                if (webhook.avatar.startsWith('http')) {
                    updateData.avatar = await this.convertImageToBase64(webhook.avatar);
                } else if (webhook.avatar.startsWith('data:')) {
                    updateData.avatar = webhook.avatar;
                }
            }

            // Update webhook on Discord if needed
            if (Object.keys(updateData).length > 0) {
                const updateResponse = await fetch(webhook.url, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updateData)
                });

                if (!updateResponse.ok) {
                    throw new Error('Failed to update webhook on Discord');
                }

                console.log('Webhook synced with Discord successfully');
            }
        } catch (error) {
            console.warn('Could not sync with Discord:', error.message);
            // Don't throw error here as local save should still work
        }
    }

    async convertImageToBase64(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            throw new Error('Failed to convert image to base64');
        }
    }

    async deleteCurrentWebhook() {
        if (!this.currentWebhook) return;

        const confirmed = confirm(`Are you sure you want to delete "${this.currentWebhook.name}"?`);
        if (!confirmed) return;

        try {
            window.storageManager.deleteWebhook(this.currentWebhook.id);
            this.showToast('Webhook deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting webhook:', error);
            this.showToast('Failed to delete webhook', 'error');
        }
    }

    // FIXED: Send message via proxy to avoid CORS
    async sendMessage() {
        if (!this.currentWebhook || !this.currentWebhook.url) {
            this.showToast('Please save the webhook first', 'error');
            return;
        }

        const messageContent = document.getElementById('messageContent')?.value?.trim();
        const embedData = this.getEmbedData();

        if (!messageContent && !this.hasEmbedContent(embedData)) {
            this.showToast('Please enter a message or embed content', 'error');
            return;
        }

        try {
            // Show loading state
            const sendBtn = document.getElementById('sendMessageBtn');
            const originalText = sendBtn?.textContent;
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.textContent = 'Sending...';
            }

            const payload = this.buildWebhookPayload(messageContent, embedData);
            
            console.log('Sending webhook payload via proxy:', payload);

            // Send via our proxy API instead of directly to Discord
            const response = await fetch('/api/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    webhookUrl: this.currentWebhook.url,
                    payload: payload
                })
            });

            if (response.ok) {
                this.showToast('Message sent successfully!', 'success');
                this.clearMessageForm();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast(`Failed to send message: ${error.message}`, 'error');
        } finally {
            // Restore button state
            const sendBtn = document.getElementById('sendMessageBtn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = originalText || 'Send Message';
            }
        }
    }

    // FIXED: Test connection via proxy
    async testWebhookConnection() {
        if (!this.currentWebhook?.url) {
            this.showToast('No webhook URL to test', 'error');
            return;
        }
        
        try {
            this.showToast('Testing webhook connection...', 'info');
            
            // Test with a simple payload
            const testPayload = {
                content: "🔧 Webhook test - connection successful!",
                username: this.currentWebhook.name || "Webhook Test"
            };

            const response = await fetch('/api/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    webhookUrl: this.currentWebhook.url,
                    payload: testPayload
                })
            });

            if (response.ok) {
                this.showToast('Webhook connection successful!', 'success');
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }
            
        } catch (error) {
            console.error('Webhook test failed:', error);
            this.showToast(`Connection test failed: ${error.message}`, 'error');
            return false;
        }
    }

    buildWebhookPayload(content, embedData) {
        const payload = {};

        if (content) {
            payload.content = content;
        }

        if (this.currentWebhook.name) {
            payload.username = this.currentWebhook.name;
        }

        if (this.currentWebhook.avatar) {
            payload.avatar_url = this.currentWebhook.avatar;
        }

        if (this.hasEmbedContent(embedData)) {
            const embed = {};
            
            if (embedData.title) embed.title = embedData.title;
            if (embedData.description) embed.description = embedData.description;
            if (embedData.color) {
                embed.color = parseInt(embedData.color.replace('#', ''), 16);
            }
            if (embedData.url) embed.url = embedData.url;
            if (embedData.image) embed.image = { url: embedData.image };
            if (embedData.thumbnail) embed.thumbnail = { url: embedData.thumbnail };

            payload.embeds = [embed];
        }

        return payload;
    }

    getEmbedData() {
        return {
            title: document.getElementById('embedTitle')?.value || '',
            description: document.getElementById('embedDescription')?.value || '',
            color: document.getElementById('embedColor')?.value || '#5865F2',
            url: document.getElementById('embedUrl')?.value || '',
            image: document.getElementById('embedImage')?.value || '',
            thumbnail: document.getElementById('embedThumbnail')?.value || ''
        };
    }

    hasEmbedContent(embedData) {
        return embedData.title || embedData.description || embedData.image || embedData.thumbnail;
    }

    clearMessageForm() {
        const inputs = [
            'messageContent',
            'embedTitle',
            'embedDescription',
            'embedUrl',
            'embedImage',
            'embedThumbnail'
        ];

        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        // Reset embed color to default
        const colorInput = document.getElementById('embedColor');
        if (colorInput) {
            colorInput.value = '#5865F2';
        }
    }

    // Modal functions
    showAddModal() {
        const modal = document.getElementById('webhookModal');
        const title = document.getElementById('modalTitle');
        const nameInput = document.getElementById('modalWebhookName');
        const urlInput = document.getElementById('modalWebhookUrl');

        if (title) title.textContent = 'Add New Webhook';
        if (nameInput) nameInput.value = '';
        if (urlInput) urlInput.value = '';
        if (modal) modal.classList.remove('hidden');
    }

    hideModal() {
        const modal = document.getElementById('webhookModal');
        if (modal) modal.classList.add('hidden');
    }

    saveFromModal() {
        const name = document.getElementById('modalWebhookName')?.value?.trim();
        const url = document.getElementById('modalWebhookUrl')?.value?.trim();

        if (!name || !url) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!this.isValidWebhookUrl(url)) {
            this.showToast('Please enter a valid Discord webhook URL', 'error');
            return;
        }

        const newWebhook = {
            name: name,
            url: url,
            avatar: ''
        };

        try {
            const savedWebhook = window.storageManager.saveWebhook(newWebhook);
            this.selectWebhook(savedWebhook.id);
            this.hideModal();
            this.showToast('Webhook added successfully!', 'success');
        } catch (error) {
            console.error('Error saving webhook:', error);
            this.showToast('Failed to save webhook', 'error');
        }
    }

    // Avatar handling
    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 8 * 1024 * 1024) { // 8MB limit
            this.showToast('Image file is too large (max 8MB)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarUrl = document.getElementById('avatarUrl');
            if (avatarUrl) {
                avatarUrl.value = e.target.result;
                this.updateAvatarPreview();
                this.updateCurrentWebhook();
            }
        };
        reader.readAsDataURL(file);
    }

    updateAvatarPreview() {
        const avatarUrl = document.getElementById('avatarUrl')?.value;
        const preview = document.getElementById('avatarPreview');
        
        if (preview) {
            if (avatarUrl) {
                preview.src = avatarUrl;
                preview.onerror = () => {
                    preview.src = 'assets/default-avatar.png';
                };
            } else {
                preview.src = 'assets/default-avatar.png';
            }
        }
    }

    clearAvatar() {
        const avatarUrl = document.getElementById('avatarUrl');
        const fileInput = document.getElementById('avatarFile');
        
        if (avatarUrl) avatarUrl.value = '';
        if (fileInput) fileInput.value = '';
        
        this.updateAvatarPreview();
        this.updateCurrentWebhook();
    }

    // Tab switching
    switchTab(tabName) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabName + 'Tab');
        });
    }

    // Event handlers
    onWebhookSaved(webhook) {
        this.loadWebhooks();
        if (webhook.id === this.currentWebhook?.id) {
            this.currentWebhook = webhook;
        }
    }

    onWebhookDeleted(webhookId) {
        this.loadWebhooks();
        if (this.currentWebhook?.id === webhookId) {
            this.currentWebhook = null;
            this.hideEditor();
            window.discordPreview?.clear();
        }
    }

    // Utility methods
    isValidWebhookUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // Check if it's a Discord webhook URL
            const validHosts = ['discord.com', 'discordapp.com'];
            if (!validHosts.includes(urlObj.hostname)) {
                return false;
            }
            
            // Check if it matches Discord webhook URL pattern
            const webhookPattern = /\/api\/webhooks\/\d+\/[\w-]+/;
            if (!webhookPattern.test(urlObj.pathname)) {
                return false;
            }
            
            return true;
        } catch {
            return false;
        }
    }

    truncateUrl(url) {
        if (url.length <= 50) return url;
        return url.substring(0, 25) + '...' + url.substring(url.length - 20);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    getToastTitle(type) {
        switch (type) {
            case 'success': return 'Success';
            case 'error': return 'Error';
            case 'warning': return 'Warning';
            default: return 'Info';
        }
    }

    // Public methods for external access
    clearWebhooks() {
        this.webhooks = [];
        this.currentWebhook = null;
        this.renderWebhookList();
        this.hideEditor();
    }

    getWebhooks() {
        return this.webhooks;
    }

    getCurrentWebhook() {
        return this.currentWebhook;
    }
}

// Global instance
window.webhookManager = new WebhookManager();