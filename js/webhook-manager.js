class WebhookManager {
    constructor() {
        this.currentWebhook = null;
        this.webhooks = [];
        this.embedFields = [];
        this.messageButtons = [];
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
            this.setupEmbedBuilder();
            this.setupComponentBuilder();
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

    setupEmbedBuilder() {
        // Add field button
        const addFieldBtn = document.getElementById('addFieldBtn');
        if (addFieldBtn) {
            addFieldBtn.addEventListener('click', () => this.addEmbedField());
        }

        // Embed input listeners
        const embedInputs = [
            'embedTitle', 'embedDescription', 'embedUrl', 'embedColor',
            'embedAuthorName', 'embedAuthorUrl', 'embedAuthorIcon',
            'embedImage', 'embedThumbnail',
            'embedFooterText', 'embedFooterIcon', 'embedTimestamp'
        ];

        embedInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateCurrentWebhook());
            }
        });
    }

    setupComponentBuilder() {
        // Add button
        const addButtonBtn = document.getElementById('addButtonBtn');
        if (addButtonBtn) {
            addButtonBtn.addEventListener('click', () => this.addMessageButton());
        }
    }

    addEmbedField() {
        const fieldsContainer = document.getElementById('embedFields');
        const fieldIndex = this.embedFields.length;
        
        const fieldHtml = `
            <div class="embed-field" data-field-index="${fieldIndex}">
                <div class="embed-field-header">
                    <h5>Field ${fieldIndex + 1}</h5>
                    <button type="button" class="remove-field-btn" onclick="webhookManager.removeEmbedField(${fieldIndex})">Remove</button>
                </div>
                <div class="embed-field-row">
                    <div class="embed-section">
                        <label>Name</label>
                        <input type="text" id="embedFieldName${fieldIndex}" placeholder="Field name" maxlength="256">
                    </div>
                    <div class="embed-section">
                        <label>Value</label>
                        <textarea id="embedFieldValue${fieldIndex}" placeholder="Field value" maxlength="1024"></textarea>
                    </div>
                    <div class="embed-section">
                        <label>
                            <input type="checkbox" id="embedFieldInline${fieldIndex}">
                            Inline
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        fieldsContainer.insertAdjacentHTML('beforeend', fieldHtml);
        this.embedFields.push({ name: '', value: '', inline: false });
        
        // Add event listeners for new field
        ['embedFieldName' + fieldIndex, 'embedFieldValue' + fieldIndex, 'embedFieldInline' + fieldIndex].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateEmbedField(fieldIndex));
            }
        });
    }

    removeEmbedField(index) {
        const fieldElement = document.querySelector(`[data-field-index="${index}"]`);
        if (fieldElement) {
            fieldElement.remove();
            this.embedFields.splice(index, 1);
            this.updateCurrentWebhook();
            this.renumberFields();
        }
    }

    renumberFields() {
        const fieldElements = document.querySelectorAll('.embed-field');
        fieldElements.forEach((element, index) => {
            element.setAttribute('data-field-index', index);
            const header = element.querySelector('h5');
            if (header) {
                header.textContent = `Field ${index + 1}`;
            }
            const removeBtn = element.querySelector('.remove-field-btn');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `webhookManager.removeEmbedField(${index})`);
            }
        });
    }

    updateEmbedField(index) {
        const nameInput = document.getElementById(`embedFieldName${index}`);
        const valueInput = document.getElementById(`embedFieldValue${index}`);
        const inlineInput = document.getElementById(`embedFieldInline${index}`);
        
        if (this.embedFields[index]) {
            this.embedFields[index] = {
                name: nameInput?.value || '',
                value: valueInput?.value || '',
                inline: inlineInput?.checked || false
            };
            this.updateCurrentWebhook();
        }
    }

    addMessageButton() {
        const buttonsContainer = document.getElementById('messageButtons');
        const buttonIndex = this.messageButtons.length;
        
        const buttonHtml = `
            <div class="button-row" data-button-index="${buttonIndex}">
                <div class="embed-section">
                    <label>Button Label</label>
                    <input type="text" id="buttonLabel${buttonIndex}" placeholder="Click me!" maxlength="80">
                </div>
                <div class="embed-section">
                    <label>Button URL</label>
                    <input type="url" id="buttonUrl${buttonIndex}" placeholder="https://example.com">
                </div>
                <div class="embed-section">
                    <label>Style</label>
                    <select id="buttonStyle${buttonIndex}" class="button-style-select">
                        <option value="primary">Primary (Blue)</option>
                        <option value="secondary">Secondary (Gray)</option>
                        <option value="success">Success (Green)</option>
                        <option value="danger">Danger (Red)</option>
                        <option value="link">Link</option>
                    </select>
                </div>
                <button type="button" class="remove-field-btn" onclick="webhookManager.removeButton(${buttonIndex})">Remove</button>
            </div>
        `;
        
        buttonsContainer.insertAdjacentHTML('beforeend', buttonHtml);
        this.messageButtons.push({ label: '', url: '', style: 'primary' });
        
        // Add event listeners for new button
        ['buttonLabel' + buttonIndex, 'buttonUrl' + buttonIndex, 'buttonStyle' + buttonIndex].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateMessageButton(buttonIndex));
            }
        });
    }

    removeButton(index) {
        const buttonElement = document.querySelector(`[data-button-index="${index}"]`);
        if (buttonElement) {
            buttonElement.remove();
            this.messageButtons.splice(index, 1);
            this.updateCurrentWebhook();
            this.renumberButtons();
        }
    }

    renumberButtons() {
        const buttonElements = document.querySelectorAll('[data-button-index]');
        buttonElements.forEach((element, index) => {
            element.setAttribute('data-button-index', index);
            const removeBtn = element.querySelector('.remove-field-btn');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `webhookManager.removeButton(${index})`);
            }
        });
    }

    updateMessageButton(index) {
        const labelInput = document.getElementById(`buttonLabel${index}`);
        const urlInput = document.getElementById(`buttonUrl${index}`);
        const styleInput = document.getElementById(`buttonStyle${index}`);
        
        if (this.messageButtons[index]) {
            this.messageButtons[index] = {
                label: labelInput?.value || '',
                url: urlInput?.value || '',
                style: styleInput?.value || 'primary'
            };
            this.updateCurrentWebhook();
        }
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
                <img src="${webhook.avatar || 'assets/default-avatar.png'}" 
                     alt="${webhook.name || 'Webhook'}" 
                     class="webhook-avatar"
                     onerror="this.src='assets/default-avatar.png'">
                <div class="webhook-info">
                    <div class="webhook-item-name">${this.escapeHtml(webhook.name || 'Unnamed Webhook')}</div>
                    <div class="webhook-item-url">${this.truncateUrl(webhook.url || '')}</div>
                </div>
                <div class="webhook-status ${webhook.url ? 'online' : 'offline'}"></div>
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

        // Populate embed fields if they exist
        this.clearEmbedFields();
        this.clearMessageButtons();
        
        if (webhook.embedFields) {
            webhook.embedFields.forEach((field, index) => {
                this.addEmbedField();
                document.getElementById(`embedFieldName${index}`).value = field.name || '';
                document.getElementById(`embedFieldValue${index}`).value = field.value || '';
                document.getElementById(`embedFieldInline${index}`).checked = field.inline || false;
            });
        }

        if (webhook.messageButtons) {
            webhook.messageButtons.forEach((button, index) => {
                this.addMessageButton();
                document.getElementById(`buttonLabel${index}`).value = button.label || '';
                document.getElementById(`buttonUrl${index}`).value = button.url || '';
                document.getElementById(`buttonStyle${index}`).value = button.style || 'primary';
            });
        }

        this.updateAvatarPreview();
    }

    clearEmbedFields() {
        const fieldsContainer = document.getElementById('embedFields');
        if (fieldsContainer) {
            fieldsContainer.innerHTML = '';
        }
        this.embedFields = [];
    }

    clearMessageButtons() {
        const buttonsContainer = document.getElementById('messageButtons');
        if (buttonsContainer) {
            buttonsContainer.innerHTML = '';
        }
        this.messageButtons = [];
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
        this.currentWebhook.embedFields = this.embedFields;
        this.currentWebhook.messageButtons = this.messageButtons;

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
            this.currentWebhook.embedFields = this.embedFields;
            this.currentWebhook.messageButtons = this.messageButtons;

            // Save to storage
            const savedWebhook = window.storageManager.saveWebhook(this.currentWebhook);
            this.currentWebhook = savedWebhook;

            this.showToast('Webhook saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving webhook:', error);
            this.showToast('Failed to save webhook: ' + error.message, 'error');
        }
    }

    // Enhanced send message with components
    async sendMessage() {
        if (!this.currentWebhook || !this.currentWebhook.url) {
            this.showToast('Please save the webhook first', 'error');
            return;
        }

        const messageContent = document.getElementById('messageContent')?.value?.trim();
        const embedData = this.getEmbedData();

        if (!messageContent && !this.hasEmbedContent(embedData) && this.messageButtons.length === 0) {
            this.showToast('Please enter a message, embed content, or add buttons', 'error');
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
            
            console.log('Sending enhanced webhook payload:', payload);

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

            // Author
            if (embedData.authorName) {
                embed.author = { name: embedData.authorName };
                if (embedData.authorUrl) embed.author.url = embedData.authorUrl;
                if (embedData.authorIcon) embed.author.icon_url = embedData.authorIcon;
            }

            // Footer
            if (embedData.footerText) {
                embed.footer = { text: embedData.footerText };
                if (embedData.footerIcon) embed.footer.icon_url = embedData.footerIcon;
            }

            // Timestamp
            if (embedData.timestamp) {
                embed.timestamp = new Date().toISOString();
            }

            // Fields
            if (this.embedFields.length > 0) {
                embed.fields = this.embedFields.filter(field => field.name && field.value);
            }

            payload.embeds = [embed];
        }

        // Components (buttons)
        if (this.messageButtons.length > 0) {
            const validButtons = this.messageButtons.filter(btn => btn.label && btn.url);
            if (validButtons.length > 0) {
                payload.components = [{
                    type: 1, // Action Row
                    components: validButtons.map(btn => ({
                        type: 2, // Button
                        style: this.getButtonStyle(btn.style),
                        label: btn.label,
                        url: btn.url
                    }))
                }];
            }
        }

        return payload;
    }

    getButtonStyle(style) {
        const styles = {
            'primary': 5,   // Link button (blue)
            'secondary': 2, // Secondary (gray)
            'success': 3,   // Success (green)
            'danger': 4,    // Danger (red)
            'link': 5       // Link button
        };
        return styles[style] || 5;
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
            authorUrl: document.getElementById('embedAuthorUrl')?.value || '',
            authorIcon: document.getElementById('embedAuthorIcon')?.value || '',
            footerText: document.getElementById('embedFooterText')?.value || '',
            footerIcon: document.getElementById('embedFooterIcon')?.value || '',
            timestamp: document.getElementById('embedTimestamp')?.checked || false
        };
    }

    hasEmbedContent(embedData) {
        return embedData.title || embedData.description || embedData.image || 
               embedData.thumbnail || embedData.authorName || embedData.footerText ||
               this.embedFields.some(field => field.name && field.value);
    }

    clearMessageForm() {
        const inputs = [
            'messageContent',
            'embedTitle', 'embedDescription', 'embedUrl', 'embedImage', 'embedThumbnail',
            'embedAuthorName', 'embedAuthorUrl', 'embedAuthorIcon',
            'embedFooterText', 'embedFooterIcon'
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

        // Reset timestamp checkbox
        const timestampInput = document.getElementById('embedTimestamp');
        if (timestampInput) {
            timestampInput.checked = false;
        }

        // Clear dynamic fields and buttons
        this.clearEmbedFields();
        this.clearMessageButtons();
    }

    // Test webhook connection
    async testWebhookConnection() {
        if (!this.currentWebhook?.url) {
            this.showToast('No webhook URL to test', 'error');
            return;
        }
        
        try {
            this.showToast('Testing webhook connection...', 'info');
            
            const testPayload = {
                content: "🔧 **Webhook Connection Test**\n✅ Your webhook is working correctly!",
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
                this.showToast('✅ Webhook connection successful!', 'success');
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }
            
        } catch (error) {
            console.error('Webhook test failed:', error);
            this.showToast(`❌ Connection test failed: ${error.message}`, 'error');
            return false;
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
            avatar: '',
            embedFields: [],
            messageButtons: []
        };

        try {
            const savedWebhook = window.storageManager.saveWebhook(newWebhook);
            this.selectWebhook(savedWebhook.id);
            this.hideModal();
            this.showToast('✅ Webhook added successfully!', 'success');
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
            this.showToast('🗑️ Webhook deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting webhook:', error);
            this.showToast('Failed to delete webhook', 'error');
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
            
            const validHosts = ['discord.com', 'discordapp.com'];
            if (!validHosts.includes(urlObj.hostname)) {
                return false;
            }
            
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
        if (url.length <= 35) return url;
        return url.substring(0, 20) + '...' + url.substring(url.length - 12);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
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