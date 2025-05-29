class WebhookManager {
    constructor() {
        this.currentWebhook = null;
        this.webhooks = [];
        this.embedFields = [];
        this.messageComponents = [];
        this.messageAttachments = [];
        this.init();
    }

    init() {
        this.loadWebhooks();
        this.setupEventListeners();
        this.setupUI();
        this.initColorPicker();
    }

    loadWebhooks() {
        this.webhooks = window.storageManager.getWebhooks();
        this.currentWebhook = window.storageManager.getCurrentWebhook();
        this.renderWebhookList();
        
        if (this.currentWebhook) {
            this.selectWebhook(this.currentWebhook.id);
        }
    }

    initColorPicker() {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const colorInput = document.getElementById('embedColor');
                if (colorInput && !document.querySelector('.modern-color-picker')) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'modern-color-picker';
                    
                    const colorPreview = document.createElement('div');
                    colorPreview.className = 'color-preview';
                    colorPreview.style.backgroundColor = colorInput.value || '#5865F2';
                    
                    const colorValue = document.createElement('input');
                    colorValue.type = 'text';
                    colorValue.className = 'color-hex-input';
                    colorValue.value = colorInput.value || '#5865F2';
                    colorValue.placeholder = '#5865F2';
                    
                    const colorWheel = document.createElement('input');
                    colorWheel.type = 'color';
                    colorWheel.className = 'color-wheel-input';
                    colorWheel.value = colorInput.value || '#5865F2';
                    
                    wrapper.appendChild(colorPreview);
                    wrapper.appendChild(colorValue);
                    wrapper.appendChild(colorWheel);
                    
                    colorInput.style.display = 'none';
                    colorInput.parentNode.appendChild(wrapper);
                    
                    [colorWheel, colorValue].forEach(input => {
                        input.addEventListener('input', (e) => {
                            const color = e.target.value;
                            if (input === colorValue && !/^#[0-9A-F]{6}$/i.test(color)) return;
                            
                            colorInput.value = color;
                            colorPreview.style.backgroundColor = color;
                            if (input !== colorValue) colorValue.value = color;
                            if (input !== colorWheel) colorWheel.value = color;
                            this.updateCurrentWebhook();
                        });
                    });
                }
            }, 100);
        });
    }

    setupEventListeners() {
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

        document.addEventListener('DOMContentLoaded', () => {
            this.setupFormListeners();
            this.setupModalListeners();
            this.setupAvatarHandling();
            this.setupEmbedBuilder();
            this.setupComponentBuilder();
            this.setupImageHandling();
        });
    }

    setupImageHandling() {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const imageInputs = [
                    { btn: 'messageImageBtn', file: 'messageImageFile', target: null },
                    { btn: 'embedImageBtn', file: 'embedImageFile', target: 'embedImage' },
                    { btn: 'embedThumbnailBtn', file: 'embedThumbnailFile', target: 'embedThumbnail' }
                ];

                imageInputs.forEach(({ btn, file, target }) => {
                    const button = document.getElementById(btn);
                    const fileInput = document.getElementById(file);
                    
                    if (button && fileInput) {
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            fileInput.click();
                        });
                        
                        fileInput.addEventListener('change', (e) => {
                            if (target) {
                                this.handleEmbedImageUpload(e, target);
                            } else {
                                this.handleMessageImageUpload(e);
                            }
                        });
                    }
                });

                document.querySelectorAll('.upload-btn').forEach(button => {
                    if (button.hasAttribute('data-listener-added')) return;
                    
                    button.addEventListener('click', (e) => {
                        e.preventDefault();
                        const section = button.closest('.embed-section');
                        if (section) {
                            const textInput = section.querySelector('input[type="url"]');
                            if (textInput) {
                                this.createFileInput(textInput.id + 'File', textInput.id);
                            }
                        }
                    });
                    
                    button.setAttribute('data-listener-added', 'true');
                });
            }, 1000);
        });
    }

    createFileInput(fileInputId, targetInputId) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = fileInputId;
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (e) => {
            this.handleEmbedImageUpload(e, targetInputId);
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
    }

    async handleMessageImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            this.showToast('Image file is too large (max 8MB)', 'error');
            return;
        }

        try {
            const url = await this.uploadImage(file);
            this.messageAttachments.push({
                name: file.name,
                url: url,
                type: 'image'
            });
            this.updateMessageAttachmentsUI();
            this.updateCurrentWebhook();
            this.showToast('Image uploaded successfully!', 'success');
        } catch (error) {
            console.error('Image upload failed:', error);
            this.showToast('Image upload failed: ' + error.message, 'error');
        }
    }

    async handleEmbedImageUpload(event, targetInputId) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            this.showToast('Image file is too large (max 8MB)', 'error');
            return;
        }

        try {
            const url = await this.uploadImage(file);
            const targetInput = document.getElementById(targetInputId);
            if (targetInput) {
                targetInput.value = url;
                this.updateCurrentWebhook();
                
                if (window.discordPreview) {
                    setTimeout(() => window.discordPreview.refreshPreview(), 100);
                }
                
                this.showToast('Image uploaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            this.showToast('Image upload failed: ' + error.message, 'error');
        }
    }

    async uploadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const response = await fetch('/api/upload-image', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            imageData: e.target.result,
                            filename: file.name
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Upload failed: ${response.status}`);
                    }

                    const data = await response.json();
                    if (data.success) {
                        if (data.fallback) {
                            this.showToast(data.warning, 'warning');
                        }
                        resolve(data.url);
                    } else {
                        throw new Error(data.error || 'Upload failed');
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    setupFormListeners() {
        const buttons = [
            { id: 'saveWebhookBtn', action: () => this.saveCurrentWebhook() },
            { id: 'deleteWebhookBtn', action: () => this.deleteCurrentWebhook() },
            { id: 'sendMessageBtn', action: () => this.sendMessage() },
            { id: 'addWebhookBtn', action: () => this.showAddModal() },
            { id: 'testWebhookBtn', action: () => this.testWebhookConnection() }
        ];

        buttons.forEach(({ id, action }) => {
            const element = document.getElementById(id);
            if (element) element.addEventListener('click', action);
        });

        ['webhookName', 'webhookUrl', 'avatarUrl'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateCurrentWebhook());
            }
        });
    }

    setupEmbedBuilder() {
        const addFieldBtn = document.getElementById('addFieldBtn');
        if (addFieldBtn) {
            addFieldBtn.addEventListener('click', () => this.addEmbedField());
        }

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
        const addComponentBtn = document.getElementById('addComponentBtn');
        if (addComponentBtn) {
            addComponentBtn.addEventListener('click', () => this.addComponent());
        }
    }

    addComponent() {
        const container = document.getElementById('messageComponents');
        const index = this.messageComponents.length;
        
        const html = `
            <div class="component-builder" data-component-index="${index}">
                <div class="component-header">
                    <h5>Component ${index + 1}</h5>
                    <button type="button" class="remove-field-btn" onclick="webhookManager.removeComponent(${index})">Remove</button>
                </div>
                <div class="component-type-select">
                    <label>Type</label>
                    <select id="componentType${index}" onchange="webhookManager.updateComponentType(${index})">
                        <option value="button">Button</option>
                        <option value="select">Select Menu</option>
                    </select>
                </div>
                <div id="componentConfig${index}" class="component-config">
                    ${this.getButtonConfig(index)}
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
        this.messageComponents.push({ type: 'button', label: '', url: '', style: 'link' });
        this.setupComponentListeners(index);
    }

    getButtonConfig(index) {
        return `
            <div class="button-config">
                <div class="embed-section">
                    <label>Label</label>
                    <input type="text" id="componentLabel${index}" placeholder="Click me!" maxlength="80">
                </div>
                <div class="embed-section">
                    <label>Style</label>
                    <select id="componentStyle${index}">
                        <option value="link">Link (URL)</option>
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="success">Success</option>
                        <option value="danger">Danger</option>
                    </select>
                </div>
                <div class="embed-section" id="componentUrlSection${index}">
                    <label>URL</label>
                    <input type="url" id="componentUrl${index}" placeholder="https://example.com">
                </div>
            </div>
        `;
    }

    getSelectConfig(index) {
        return `
            <div class="select-config">
                <div class="embed-section">
                    <label>Placeholder</label>
                    <input type="text" id="componentPlaceholder${index}" placeholder="Select an option..." maxlength="150">
                </div>
                <div class="embed-section">
                    <label>Options</label>
                    <div id="selectOptions${index}" class="select-options">
                        <div class="select-option">
                            <input type="text" placeholder="Option label" class="option-label">
                            <input type="text" placeholder="Option value" class="option-value">
                            <input type="text" placeholder="Description (optional)" class="option-description">
                        </div>
                    </div>
                    <button type="button" onclick="webhookManager.addSelectOption(${index})">Add Option</button>
                </div>
            </div>
        `;
    }

    updateComponentType(index) {
        const typeSelect = document.getElementById(`componentType${index}`);
        const configDiv = document.getElementById(`componentConfig${index}`);
        const type = typeSelect.value;

        if (type === 'button') {
            configDiv.innerHTML = this.getButtonConfig(index);
            this.messageComponents[index] = { type: 'button', label: '', url: '', style: 'link' };
        } else if (type === 'select') {
            configDiv.innerHTML = this.getSelectConfig(index);
            this.messageComponents[index] = { type: 'select', placeholder: '', options: [] };
        }

        this.setupComponentListeners(index);
    }

    setupComponentListeners(index) {
        const inputs = [
            `componentLabel${index}`,
            `componentUrl${index}`,
            `componentStyle${index}`,
            `componentPlaceholder${index}`
        ];

        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateComponent(index));
            }
        });

        const styleSelect = document.getElementById(`componentStyle${index}`);
        if (styleSelect) {
            styleSelect.addEventListener('change', () => {
                const urlSection = document.getElementById(`componentUrlSection${index}`);
                if (urlSection) {
                    urlSection.style.display = styleSelect.value === 'link' ? 'block' : 'none';
                }
                this.updateComponent(index);
            });
        }
    }

    updateComponent(index) {
        const component = this.messageComponents[index];
        if (!component) return;

        if (component.type === 'button') {
            const label = document.getElementById(`componentLabel${index}`)?.value || '';
            const url = document.getElementById(`componentUrl${index}`)?.value || '';
            const style = document.getElementById(`componentStyle${index}`)?.value || 'link';

            this.messageComponents[index] = { type: 'button', label, url, style };
        } else if (component.type === 'select') {
            const placeholder = document.getElementById(`componentPlaceholder${index}`)?.value || '';
            const options = this.getSelectOptions(index);

            this.messageComponents[index] = { type: 'select', placeholder, options };
        }

        this.updateCurrentWebhook();
    }

    getSelectOptions(index) {
        const optionsContainer = document.getElementById(`selectOptions${index}`);
        if (!optionsContainer) return [];

        const options = [];
        optionsContainer.querySelectorAll('.select-option').forEach(option => {
            const label = option.querySelector('.option-label')?.value || '';
            const value = option.querySelector('.option-value')?.value || '';
            const description = option.querySelector('.option-description')?.value || '';

            if (label && value) {
                options.push({ label, value, description });
            }
        });

        return options;
    }

    addSelectOption(index) {
        const container = document.getElementById(`selectOptions${index}`);
        const html = `
            <div class="select-option">
                <input type="text" placeholder="Option label" class="option-label">
                <input type="text" placeholder="Option value" class="option-value">
                <input type="text" placeholder="Description (optional)" class="option-description">
                <button type="button" onclick="this.closest('.select-option').remove()">Remove</button>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    }

    removeComponent(index) {
        const element = document.querySelector(`[data-component-index="${index}"]`);
        if (element) {
            element.remove();
            this.messageComponents.splice(index, 1);
            this.updateCurrentWebhook();
            this.renumberComponents();
        }
    }

    renumberComponents() {
        const elements = document.querySelectorAll('.component-builder');
        elements.forEach((element, index) => {
            element.setAttribute('data-component-index', index);
            const header = element.querySelector('h5');
            if (header) header.textContent = `Component ${index + 1}`;
        });
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
                        <input type="text" id="embedFieldName${fieldIndex}" placeholder="Field name" maxlength="256" class="field-input">
                    </div>
                    <div class="embed-section">
                        <label>Value</label>
                        <textarea id="embedFieldValue${fieldIndex}" placeholder="Field value" maxlength="1024" class="field-input"></textarea>
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
            if (header) header.textContent = `Field ${index + 1}`;
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

    updateMessageAttachmentsUI() {
        const container = document.getElementById('messageAttachments');
        if (!container) return;

        if (this.messageAttachments.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const html = this.messageAttachments.map((attachment, index) => `
            <div class="message-attachment" data-index="${index}">
                <img src="${attachment.url}" alt="${attachment.name}" class="attachment-preview">
                <div class="attachment-info">
                    <span class="attachment-name">${this.escapeHtml(attachment.name)}</span>
                    <button type="button" class="remove-attachment-btn" onclick="webhookManager.removeMessageAttachment(${index})" title="Remove attachment">×</button>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    removeMessageAttachment(index) {
        this.messageAttachments.splice(index, 1);
        this.updateMessageAttachmentsUI();
        this.updateCurrentWebhook();
        this.showToast('Attachment removed', 'info');
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
        
        this.clearAllFormContent();
        this.populateForm(webhook);
        this.showEditor();
        this.updateActiveItem();
        
        document.dispatchEvent(new CustomEvent('webhookSelected', {
            detail: webhook
        }));
    }

    clearAllFormContent() {
        const messageContent = document.getElementById('messageContent');
        if (messageContent) messageContent.value = '';

        const embedInputs = [
            'embedTitle', 'embedDescription', 'embedUrl', 'embedImage', 'embedThumbnail',
            'embedAuthorName', 'embedAuthorUrl', 'embedAuthorIcon',
            'embedFooterText', 'embedFooterIcon'
        ];

        embedInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        const colorInput = document.getElementById('embedColor');
        if (colorInput) {
            colorInput.value = '#5865F2';
            this.updateColorPicker('#5865F2');
        }

        const timestampInput = document.getElementById('embedTimestamp');
        if (timestampInput) timestampInput.checked = false;

        this.clearEmbedFields();
        this.clearMessageComponents();
        this.clearMessageAttachments();
    }

    updateColorPicker(color) {
        const colorPreview = document.querySelector('.color-preview');
        const colorValue = document.querySelector('.color-hex-input');
        const colorWheel = document.querySelector('.color-wheel-input');
        if (colorPreview) colorPreview.style.backgroundColor = color;
        if (colorValue) colorValue.value = color;
        if (colorWheel) colorWheel.value = color;
    }

    clearMessageAttachments() {
        this.messageAttachments = [];
        this.updateMessageAttachmentsUI();
    }

    clearMessageComponents() {
        const container = document.getElementById('messageComponents');
        if (container) container.innerHTML = '';
        this.messageComponents = [];
    }

    populateForm(webhook) {
        const fields = {
            'webhookName': webhook.name || '',
            'webhookUrl': webhook.url || '',
            'avatarUrl': webhook.avatar || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });

        if (webhook.savedContent) {
            const messageContent = document.getElementById('messageContent');
            if (messageContent && webhook.savedContent.message) {
                messageContent.value = webhook.savedContent.message;
            }

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

                if (embed.color) {
                    this.updateColorPicker(embed.color);
                }
            }
        }

        if (webhook.embedFields) {
            webhook.embedFields.forEach((field, index) => {
                this.addEmbedField();
                document.getElementById(`embedFieldName${index}`).value = field.name || '';
                document.getElementById(`embedFieldValue${index}`).value = field.value || '';
                document.getElementById(`embedFieldInline${index}`).checked = field.inline || false;
            });
        }

        if (webhook.messageComponents) {
            webhook.messageComponents.forEach((component) => {
                this.addComponent();
                const index = this.messageComponents.length - 1;
                
                if (component.type === 'button') {
                    document.getElementById(`componentType${index}`).value = 'button';
                    this.updateComponentType(index);
                    document.getElementById(`componentLabel${index}`).value = component.label || '';
                    document.getElementById(`componentUrl${index}`).value = component.url || '';
                    document.getElementById(`componentStyle${index}`).value = component.style || 'link';
                }
            });
        }

        if (webhook.messageAttachments) {
            this.messageAttachments = [...webhook.messageAttachments];
            this.updateMessageAttachmentsUI();
        }

        this.updateAvatarPreview();
    }

    clearEmbedFields() {
        const fieldsContainer = document.getElementById('embedFields');
        if (fieldsContainer) fieldsContainer.innerHTML = '';
        this.embedFields = [];
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
        const avatar = document.getElementById('avatarUrl')?.value || '';

        const messageContent = document.getElementById('messageContent')?.value || '';
        const embedData = this.getEmbedData();

        this.currentWebhook.name = name;
        this.currentWebhook.url = url;
        this.currentWebhook.avatar = avatar;
        this.currentWebhook.embedFields = this.embedFields;
        this.currentWebhook.messageComponents = this.messageComponents;
        this.currentWebhook.messageAttachments = this.messageAttachments;
        
        this.currentWebhook.savedContent = {
            message: messageContent,
            embed: embedData
        };

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
            this.currentWebhook.name = name;
            this.currentWebhook.url = url;
            this.currentWebhook.avatar = document.getElementById('avatarUrl')?.value || '';
            this.currentWebhook.embedFields = this.embedFields;
            this.currentWebhook.messageComponents = this.messageComponents;
            this.currentWebhook.messageAttachments = this.messageAttachments;

            const messageContent = document.getElementById('messageContent')?.value || '';
            const embedData = this.getEmbedData();
            this.currentWebhook.savedContent = {
                message: messageContent,
                embed: embedData
            };

            const savedWebhook = window.storageManager.saveWebhook(this.currentWebhook);
            this.currentWebhook = savedWebhook;

            this.showToast('Webhook saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving webhook:', error);
            this.showToast('Failed to save webhook: ' + error.message, 'error');
        }
    }

    async sendMessage() {
        if (!this.currentWebhook || !this.currentWebhook.url) {
            this.showToast('Please save the webhook first', 'error');
            return;
        }

        const messageContent = document.getElementById('messageContent')?.value?.trim();
        const embedData = this.getEmbedData();

        if (!messageContent && !this.hasEmbedContent(embedData) && this.messageComponents.length === 0) {
            this.showToast('Please enter a message, embed content, or add components', 'error');
            return;
        }

        const validation = this.validateMessage();
        if (!validation.valid) {
            this.showToast(`Validation error: ${validation.errors.join(', ')}`, 'error');
            return;
        }

        try {
            const sendBtn = document.getElementById('sendMessageBtn');
            const originalText = sendBtn?.textContent;
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.textContent = 'Sending...';
                sendBtn.classList.add('loading');
            }

            const payload = this.buildWebhookPayload(messageContent, embedData);
            
            console.log('Sending webhook payload:', JSON.stringify(payload, null, 2));

            const response = await fetch('/api/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    webhookUrl: this.currentWebhook.url,
                    payload: payload,
                    useComponents: this.messageComponents.length > 0
                })
            });

            if (response.ok) {
                this.showToast('Message sent successfully!', 'success');
            } else {
                const errorData = await response.json();
                console.error('Send error:', errorData);
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast(`Failed to send message: ${error.message}`, 'error');
        } finally {
            const sendBtn = document.getElementById('sendMessageBtn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.textContent = originalText || 'Send Message';
                sendBtn.classList.remove('loading');
            }
        }
    }

    validateMessage() {
        const messageContent = document.getElementById('messageContent')?.value?.trim() || '';
        const embedData = this.getEmbedData();
        const errors = [];

        if (messageContent.length > 2000) {
            errors.push('Message content exceeds 2000 characters');
        }

        if (embedData.title && embedData.title.length > 256) {
            errors.push('Embed title exceeds 256 characters');
        }
        if (embedData.description && embedData.description.length > 4096) {
            errors.push('Embed description exceeds 4096 characters');
        }

        if (this.embedFields.length > 25) {
            errors.push('Embed cannot have more than 25 fields');
        }

        this.embedFields.forEach((field, index) => {
            if (field.name.length > 256) {
                errors.push(`Field ${index + 1} name exceeds 256 characters`);
            }
            if (field.value.length > 1024) {
                errors.push(`Field ${index + 1} value exceeds 1024 characters`);
            }
        });

        const validComponents = this.messageComponents.filter(c => 
            c.type === 'button' ? (c.label && c.url) : (c.placeholder && c.options?.length > 0)
        );

        if (validComponents.length > 5) {
            errors.push('Cannot have more than 5 components per message');
        }

        this.messageComponents.forEach((component, index) => {
            if (component.type === 'button') {
                if (component.label && component.label.length > 80) {
                    errors.push(`Button ${index + 1} label exceeds 80 characters`);
                }
                if (component.url && !this.isValidUrl(component.url)) {
                    errors.push(`Button ${index + 1} has invalid URL`);
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    buildWebhookPayload(content, embedData) {
        const payload = {};

        if (content) payload.content = content;
        if (this.currentWebhook.name) payload.username = this.currentWebhook.name;
        if (this.currentWebhook.avatar && this.isValidUrl(this.currentWebhook.avatar)) {
            payload.avatar_url = this.currentWebhook.avatar;
        }

        if (this.hasEmbedContent(embedData)) {
            const embed = this.buildEmbedObject(embedData);
            payload.embeds = [embed];
        }

        const validComponents = this.messageComponents.filter(c => 
            c.type === 'button' && c.label?.trim() && c.url?.trim() && this.isValidUrl(c.url)
        );
        
        if (validComponents.length > 0) {
            console.log('Adding components to payload:', validComponents);
            
            payload.components = [{
                type: 1,
                components: validComponents.map(c => ({
                    type: 2,
                    style: 5,
                    label: c.label.trim().substring(0, 80),
                    url: c.url.trim()
                }))
            }];
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
            if (embedData.authorUrl && this.isValidUrl(embedData.authorUrl)) {
                embed.author.url = embedData.authorUrl;
            }
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
                testBtn.classList.add('loading');
            }

            this.showToast('Testing webhook connection...', 'info');
            
            const testPayload = {
                content: "🔧 **Webhook Connection Test**\n✅ Your webhook is working correctly!",
                username: this.currentWebhook.name || "Webhook Test",
                embeds: [{
                    title: "Connection Test Successful",
                    description: "This is a test message to verify your webhook configuration.",
                    color: 0x57F287,
                    footer: {
                        text: "AniHook Manager"
                    },
                    timestamp: new Date().toISOString()
                }],
                components: [{
                    type: 1,
                    components: [{
                        type: 2,
                        style: 5,
                        label: "Test Button",
                        url: "https://discord.com"
                    }]
                }]
            };

            const response = await fetch('/api/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    webhookUrl: this.currentWebhook.url,
                    payload: testPayload,
                    useComponents: true
                })
            });

            if (response.ok) {
                this.showToast('✅ Webhook connection successful! Check Discord for the test message.', 'success');
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }
            
        } catch (error) {
            console.error('Webhook test failed:', error);
            this.showToast(`❌ Connection test failed: ${error.message}`, 'error');
            return false;
        } finally {
            const testBtn = document.getElementById('testWebhookBtn');
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = 'Test Connection';
                testBtn.classList.remove('loading');
            }
        }
    }

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
            messageComponents: [],
            messageAttachments: [],
            savedContent: { message: '', embed: {} }
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

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            this.showToast('Image file is too large (max 8MB)', 'error');
            return;
        }

        try {
            const url = await this.uploadImage(file);
            const avatarUrl = document.getElementById('avatarUrl');
            if (avatarUrl) {
                avatarUrl.value = url;
                this.updateAvatarPreview();
                this.updateCurrentWebhook();
                this.showToast('Avatar uploaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Avatar upload failed:', error);
            this.showToast('Avatar upload failed', 'error');
        }
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
        this.showToast('Avatar cleared', 'info');
    }

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
            if (container.children.length === 0) {
                container.remove();
            }
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

window.webhookManager = new WebhookManager();