class WebhookManager {
    constructor() {
        this.currentWebhook = null;
        this.webhooks = [];
        this.embedFields = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadWebhooks();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupFormListeners();
            this.setupModalListeners();
            this.setupTabListeners();
            this.setupColorPicker();
        });

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
            }
        });
    }

    setupFormListeners() {
        // Action buttons
        const buttons = [
            { id: 'saveWebhookBtn', action: () => this.saveCurrentWebhook() },
            { id: 'deleteWebhookBtn', action: () => this.deleteCurrentWebhook() },
            { id: 'sendMessageBtn', action: () => this.sendMessage() },
            { id: 'addWebhookBtn', action: () => this.showAddModal() },
            { id: 'testWebhookBtn', action: () => this.testWebhookConnection() }
        ];

        buttons.forEach(({ id, action }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', action);
            }
        });

        // Form inputs - update current webhook on change
        ['webhookName', 'webhookUrl', 'webhookAvatar'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateCurrentWebhook());
            }
        });

        // Embed fields button
        const addFieldBtn = document.getElementById('addFieldBtn');
        if (addFieldBtn) {
            addFieldBtn.addEventListener('click', () => this.addEmbedField());
        }

        // Image upload buttons
        this.setupImageUploads();
    }

    setupImageUploads() {
        const imageUploads = [
            { btnId: 'messageImageUploadBtn', fileId: 'messageImageFile', targetId: 'messageImage' },
            { btnId: 'embedImageUploadBtn', fileId: 'embedImageFile', targetId: 'embedImage' },
            { btnId: 'embedThumbnailUploadBtn', fileId: 'embedThumbnailFile', targetId: 'embedThumbnail' },
            { btnId: 'embedAuthorIconUploadBtn', fileId: 'embedAuthorIconFile', targetId: 'embedAuthorIcon' },
            { btnId: 'embedFooterIconUploadBtn', fileId: 'embedFooterIconFile', targetId: 'embedFooterIcon' },
            { btnId: 'webhookAvatarUploadBtn', fileId: 'webhookAvatarFile', targetId: 'webhookAvatar' }
        ];

        imageUploads.forEach(({ btnId, fileId, targetId }) => {
            const button = document.getElementById(btnId);
            const fileInput = document.getElementById(fileId);
            const targetInput = document.getElementById(targetId);

            if (button && fileInput && targetInput) {
                button.addEventListener('click', () => {
                    fileInput.click();
                });

                fileInput.addEventListener('change', (e) => {
                    this.handleImageUpload(e, targetInput, button);
                });
            }
        });
    }

    async handleImageUpload(event, targetInput, uploadButton) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        try {
            // Show uploading state
            uploadButton.classList.add('uploading');

            // Convert to data URL
            const dataUrl = await this.fileToDataUrl(file);
            
            // Set the data URL in the target input
            targetInput.value = dataUrl;
            
            // Trigger update events
            targetInput.dispatchEvent(new Event('input'));
            this.updateCurrentWebhook();

            this.showToast('Image uploaded successfully!', 'success');

        } catch (error) {
            console.error('Image upload error:', error);
            this.showToast('Failed to upload image', 'error');
        } finally {
            // Reset button state
            uploadButton.classList.remove('uploading');
            
            // Clear file input
            event.target.value = '';
        }
    }

    fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
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
                if (e.target === modal) this.hideModal();
            });
        }
    }

    setupTabListeners() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    setupColorPicker() {
        const colorPreview = document.getElementById('colorPreview');
        const colorInput = document.getElementById('embedColor');
        const colorHex = document.getElementById('colorHex');

        if (colorPreview && colorInput && colorHex) {
            colorPreview.addEventListener('click', () => {
                colorInput.click();
            });

            colorInput.addEventListener('input', (e) => {
                const color = e.target.value;
                colorPreview.style.backgroundColor = color;
                colorHex.value = color;
                this.updateCurrentWebhook();
            });

            colorHex.addEventListener('input', (e) => {
                const color = e.target.value;
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    colorInput.value = color;
                    colorPreview.style.backgroundColor = color;
                    this.updateCurrentWebhook();
                }
            });
        }
    }

    loadWebhooks() {
        this.webhooks = window.storageManager.getWebhooks();
        this.currentWebhook = window.storageManager.getCurrentWebhook();
        this.renderWebhookList();
        
        if (this.currentWebhook) {
            this.selectWebhook(this.currentWebhook.id);
        }
    }

    renderWebhookList() {
        const listElement = document.getElementById('webhookList');
        if (!listElement) return;

        if (this.webhooks.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <p>No webhooks yet</p>
                    <small>Click + to add your first webhook</small>
                </div>
            `;
            return;
        }

        const html = this.webhooks.map(webhook => `
            <div class="webhook-item ${webhook.id === this.currentWebhook?.id ? 'active' : ''}" 
                 data-webhook-id="${webhook.id}">
                <div class="webhook-avatar">
                    ${webhook.avatar ? 
                        `<img src="${webhook.avatar}" alt="${webhook.name || 'Webhook'}" onerror="this.parentElement.innerHTML='${(webhook.name || 'W').charAt(0).toUpperCase()}'">` :
                        (webhook.name || 'W').charAt(0).toUpperCase()
                    }
                </div>
                <div class="webhook-info">
                    <div class="webhook-name">${this.escapeHtml(webhook.name || 'Unnamed Webhook')}</div>
                    <div class="webhook-url">${this.truncateUrl(webhook.url || '')}</div>
                </div>
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
        // Basic webhook info
        const fields = {
            'webhookName': webhook.name || '',
            'webhookUrl': webhook.url || '',
            'webhookAvatar': webhook.avatar || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });

        // Load saved content if available
        if (webhook.savedContent) {
            const messageContent = document.getElementById('messageContent');
            if (messageContent && webhook.savedContent.message) {
                messageContent.value = webhook.savedContent.message;
            }

            const messageImage = document.getElementById('messageImage');
            if (messageImage && webhook.savedContent.image) {
                messageImage.value = webhook.savedContent.image;
            }

            // Load embed data
            if (webhook.savedContent.embed) {
                const embed = webhook.savedContent.embed;
                Object.entries(embed).forEach(([key, value]) => {
                    const element = document.getElementById('embed' + key.charAt(0).toUpperCase() + key.slice(1));
                    if (element && value !== undefined) {
                        if (element.type === 'checkbox') {
                            element.checked = value;
                        } else {
                            element.value = value;
                        }
                    }
                });

                // Update color picker
                if (embed.color) {
                    this.updateColorPicker(embed.color);
                }
            }
        }

        // Load embed fields
        this.clearEmbedFields();
        if (webhook.embedFields && webhook.embedFields.length > 0) {
            webhook.embedFields.forEach((field) => {
                this.addEmbedField(field);
            });
        }
    }

    updateColorPicker(color) {
        const colorPreview = document.getElementById('colorPreview');
        const colorInput = document.getElementById('embedColor');
        const colorHex = document.getElementById('colorHex');

        if (colorPreview) colorPreview.style.backgroundColor = color;
        if (colorInput) colorInput.value = color;
        if (colorHex) colorHex.value = color;
    }

    showEditor() {
        document.getElementById('welcomeMessage')?.classList.add('hidden');
        document.getElementById('webhookEditor')?.classList.remove('hidden');
    }

    hideEditor() {
        document.getElementById('welcomeMessage')?.classList.remove('hidden');
        document.getElementById('webhookEditor')?.classList.add('hidden');
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
        const avatar = document.getElementById('webhookAvatar')?.value || '';

        this.currentWebhook.name = name;
        this.currentWebhook.url = url;
        this.currentWebhook.avatar = avatar;
        
        // Save current content
        this.currentWebhook.savedContent = {
            message: document.getElementById('messageContent')?.value || '',
            image: document.getElementById('messageImage')?.value || '',
            embed: this.getEmbedData()
        };

        this.currentWebhook.embedFields = this.embedFields;

        // Update preview
        document.dispatchEvent(new CustomEvent('webhookUpdated', {
            detail: this.currentWebhook
        }));
    }

    getEmbedData() {
        return {
            title: document.getElementById('embedTitle')?.value || '',
            description: document.getElementById('embedDescription')?.value || '',
            color: document.getElementById('embedColor')?.value || '#5865F2',
            url: document.getElementById('embedUrl')?.value || '',
            image: document.getElementById('embedImage')?.value || '',
            thumbnail: document.getElementById('embedThumbnail')?.value || '',
            authorName: document.getElementById('embedAuthorName')?.value || '',
            authorIcon: document.getElementById('embedAuthorIcon')?.value || '',
            footerText: document.getElementById('embedFooterText')?.value || '',
            footerIcon: document.getElementById('embedFooterIcon')?.value || '',
            timestamp: document.getElementById('embedTimestamp')?.checked || false
        };
    }

    // Embed Fields Management
    addEmbedField(fieldData = null) {
        const fieldsContainer = document.getElementById('embedFieldsList');
        if (!fieldsContainer) return;

        const fieldIndex = this.embedFields.length;
        const field = fieldData || { name: '', value: '', inline: false };
        
        const fieldHtml = `
            <div class="embed-field" data-field-index="${fieldIndex}">
                <div class="embed-field-header">
                    <span class="embed-field-title">Field ${fieldIndex + 1}</span>
                    <button type="button" class="remove-field-btn" onclick="webhookManager.removeEmbedField(${fieldIndex})">Remove</button>
                </div>
                <div class="embed-field-row">
                    <div class="form-group">
                        <label class="form-label">Name</label>
                        <input type="text" class="form-input field-name" placeholder="Field name" maxlength="256" value="${this.escapeHtml(field.name)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Value</label>
                        <textarea class="form-input form-textarea field-value" placeholder="Field value" maxlength="1024">${this.escapeHtml(field.value)}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" class="field-inline" ${field.inline ? 'checked' : ''}> Inline
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        fieldsContainer.insertAdjacentHTML('beforeend', fieldHtml);
        this.embedFields.push(field);
        
        // Add event listeners to the new field
        const newField = fieldsContainer.lastElementChild;
        const inputs = newField.querySelectorAll('.field-name, .field-value, .field-inline');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateEmbedField(fieldIndex);
            });
        });
    }

    removeEmbedField(index) {
        const fieldElement = document.querySelector(`[data-field-index="${index}"]`);
        if (fieldElement) {
            fieldElement.remove();
            this.embedFields.splice(index, 1);
            this.renumberFields();
            this.updateCurrentWebhook();
            
            // Trigger preview update
            document.dispatchEvent(new CustomEvent('embedFieldsChanged'));
        }
    }

    updateEmbedField(index) {
        const fieldElement = document.querySelector(`[data-field-index="${index}"]`);
        if (!fieldElement || !this.embedFields[index]) return;

        const nameInput = fieldElement.querySelector('.field-name');
        const valueInput = fieldElement.querySelector('.field-value');
        const inlineInput = fieldElement.querySelector('.field-inline');
        
        this.embedFields[index] = {
            name: nameInput?.value || '',
            value: valueInput?.value || '',
            inline: inlineInput?.checked || false
        };

        this.updateCurrentWebhook();
        
        // Trigger preview update
        document.dispatchEvent(new CustomEvent('embedFieldsChanged'));
    }

    renumberFields() {
        const fieldElements = document.querySelectorAll('.embed-field');
        fieldElements.forEach((element, index) => {
            element.setAttribute('data-field-index', index);
            const title = element.querySelector('.embed-field-title');
            if (title) title.textContent = `Field ${index + 1}`;
            
            // Update remove button onclick
            const removeBtn = element.querySelector('.remove-field-btn');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `webhookManager.removeEmbedField(${index})`);
            }
        });
    }

    clearEmbedFields() {
        const fieldsContainer = document.getElementById('embedFieldsList');
        if (fieldsContainer) {
            fieldsContainer.innerHTML = '';
        }
        this.embedFields = [];
    }

    // Webhook CRUD Operations
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
            this.updateCurrentWebhook();
            const savedWebhook = window.storageManager.saveWebhook(this.currentWebhook);
            this.currentWebhook = savedWebhook;
            this.showToast('Webhook saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving webhook:', error);
            this.showToast('Failed to save webhook', 'error');
        }
    }

    async deleteCurrentWebhook() {
        if (!this.currentWebhook) return;

        const confirmed = confirm(`Are you sure you want to delete "${this.currentWebhook.name}"?\n\nThis action cannot be undone.`);
        if (!confirmed) return;

        try {
            window.storageManager.deleteWebhook(this.currentWebhook.id);
            this.showToast('Webhook deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting webhook:', error);
            this.showToast('Failed to delete webhook', 'error');
        }
    }

    async testWebhookConnection() {
        if (!this.currentWebhook?.url) {
            this.showToast('No webhook URL to test', 'error');
            return;
        }
        
        try {
            const testBtn = document.getElementById('testWebhookBtn');
            const originalText = testBtn?.textContent;
            if (testBtn) {
                testBtn.disabled = true;
                testBtn.textContent = 'Testing...';
            }

            const testPayload = {
                content: "**Webhook Connection Test**\nYour webhook is working correctly!",
                username: this.currentWebhook.name || "Webhook Test",
                embeds: [{
                    title: "Connection Test Successful",
                    description: "This is a test message to verify your webhook configuration.",
                    color: 0x57F287,
                    footer: {
                        text: "Discord Webhook Manager"
                    },
                    timestamp: new Date().toISOString()
                }]
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
                this.showToast('Webhook connection successful! Check Discord for the test message.', 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.error('Webhook test failed:', error);
            this.showToast(`Connection test failed: ${error.message}`, 'error');
        } finally {
            const testBtn = document.getElementById('testWebhookBtn');
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
            }
        }
    }

    async sendMessage() {
        if (!this.currentWebhook || !this.currentWebhook.url) {
            this.showToast('Please save the webhook first', 'error');
            return;
        }

        const messageContent = document.getElementById('messageContent')?.value?.trim();
        const messageImage = document.getElementById('messageImage')?.value?.trim();
        const embedData = this.getEmbedData();

        if (!messageContent && !messageImage && !this.hasEmbedContent(embedData)) {
            this.showToast('Please enter a message, image, or embed content', 'error');
            return;
        }

        const validation = window.discordPreview.validateMessage();
        if (!validation.valid) {
            this.showToast(`Validation error: ${validation.errors[0]}`, 'error');
            return;
        }

        try {
            const sendBtn = document.getElementById('sendMessageBtn');
            const originalText = sendBtn?.textContent;
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.textContent = 'Sending...';
            }

            const payload = this.buildWebhookPayload(messageContent, messageImage, embedData);
            
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
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast(`Failed to send message: ${error.message}`, 'error');
        } finally {
            const sendBtn = document.getElementById('sendMessageBtn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send Message';
            }
        }
    }

    buildWebhookPayload(content, imageUrl, embedData) {
        const payload = {};

        // Set webhook name and avatar
        if (this.currentWebhook.name) payload.username = this.currentWebhook.name;
        if (this.currentWebhook.avatar && this.isValidUrl(this.currentWebhook.avatar)) {
            payload.avatar_url = this.currentWebhook.avatar;
        }

        // Handle message content and image
        let messageText = content || '';
        if (imageUrl && this.isValidUrl(imageUrl)) {
            if (messageText) {
                messageText += '\n' + imageUrl;
            } else {
                messageText = imageUrl;
            }
        }

        if (messageText) {
            payload.content = messageText;
        }

        // Only add embed if there's actual embed content
        if (this.hasEmbedContent(embedData)) {
            const embed = this.buildEmbedObject(embedData);
            payload.embeds = [embed];
        }

        return payload;
    }

    buildEmbedObject(embedData) {
        const embed = {};
        
        if (embedData.title) embed.title = embedData.title.substring(0, 256);
        if (embedData.description) embed.description = embedData.description.substring(0, 4096);
        if (embedData.color) {
            embed.color = parseInt(embedData.color.replace('#', ''), 16);
        }
        if (embedData.url && this.isValidUrl(embedData.url)) {
            embed.url = embedData.url;
        }

        if (embedData.image && this.isValidUrl(embedData.image)) {
            embed.image = { url: embedData.image };
        }
        if (embedData.thumbnail && this.isValidUrl(embedData.thumbnail)) {
            embed.thumbnail = { url: embedData.thumbnail };
        }

        if (embedData.authorName) {
            embed.author = { name: embedData.authorName.substring(0, 256) };
            if (embedData.authorIcon && this.isValidUrl(embedData.authorIcon)) {
                embed.author.icon_url = embedData.authorIcon;
            }
        }

        if (embedData.footerText) {
            embed.footer = { text: embedData.footerText.substring(0, 2048) };
            if (embedData.footerIcon && this.isValidUrl(embedData.footerIcon)) {
                embed.footer.icon_url = embedData.footerIcon;
            }
        }

        if (embedData.timestamp) {
            embed.timestamp = new Date().toISOString();
        }

        const validFields = this.embedFields.filter(field => field.name && field.value);
        if (validFields.length > 0) {
            embed.fields = validFields.slice(0, 25).map(field => ({
                name: field.name.substring(0, 256),
                value: field.value.substring(0, 1024),
                inline: Boolean(field.inline)
            }));
        }

        return embed;
    }

    hasEmbedContent(embedData) {
        return embedData.title || embedData.description || embedData.image || 
               embedData.thumbnail || embedData.authorName || embedData.footerText ||
               this.embedFields.some(field => field.name && field.value);
    }

    // Modal Management
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
            avatar: '',
            embedFields: [],
            savedContent: { message: '', image: '', embed: {} }
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

    // Tab Management
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

    // Event Handlers
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

    // Utility Methods
    isValidWebhookUrl(url) {
        try {
            const urlObj = new URL(url);
            const validHosts = ['discord.com', 'discordapp.com'];
            if (!validHosts.includes(urlObj.hostname)) return false;
            const webhookPattern = /\/api\/webhooks\/\d+\/[\w-]+/;
            return webhookPattern.test(urlObj.pathname);
        } catch {
            return false;
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    truncateUrl(url) {
        if (!url || url.length <= 35) return url;
        return url.substring(0, 20) + '...' + url.substring(url.length - 12);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-title">${this.getToastTitle(type)}</div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) {
                container.remove();
            }
        }, 5000);
    }

    getToastTitle(type) {
        switch (type) {
            case 'success': return 'Success';
            case 'error': return 'Error';
            case 'warning': return 'Warning';
            default: return 'Info';
        }
    }

    // Public API
    getWebhooks() {
        return this.webhooks;
    }

    getCurrentWebhook() {
        return this.currentWebhook;
    }
}

// Global instance
window.webhookManager = new WebhookManager();