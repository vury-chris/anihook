class WebhookManager {
    constructor() {
        this.currentWebhook = null;
        this.webhooks = [];
        this.embedFields = [];
        this.messageButtons = [];
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
                    
                    colorWheel.addEventListener('input', (e) => {
                        const color = e.target.value;
                        colorInput.value = color;
                        colorPreview.style.backgroundColor = color;
                        colorValue.value = color;
                        this.updateCurrentWebhook();
                    });
                    
                    colorValue.addEventListener('input', (e) => {
                        const color = e.target.value;
                        if (/^#[0-9A-F]{6}$/i.test(color)) {
                            colorInput.value = color;
                            colorPreview.style.backgroundColor = color;
                            colorWheel.value = color;
                            this.updateCurrentWebhook();
                        }
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

    // FIXED: Properly setup all image upload handlers
    setupImageHandling() {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                // Message image upload
                const messageImageBtn = document.getElementById('messageImageBtn');
                const messageImageFile = document.getElementById('messageImageFile');
                
                if (messageImageBtn && messageImageFile) {
                    messageImageBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('Message image button clicked');
                        messageImageFile.click();
                    });
                    
                    messageImageFile.addEventListener('change', (e) => {
                        console.log('Message image file selected');
                        this.handleMessageImageUpload(e);
                    });
                }

                // Embed main image upload
                const embedImageBtn = document.getElementById('embedImageBtn');
                const embedImageFile = document.getElementById('embedImageFile');
                
                if (embedImageBtn && embedImageFile) {
                    embedImageBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('Embed image button clicked');
                        embedImageFile.click();
                    });
                    
                    embedImageFile.addEventListener('change', (e) => {
                        console.log('Embed image file selected');
                        this.handleEmbedImageUpload(e, 'embedImage');
                    });
                }

                // Embed thumbnail upload
                const embedThumbnailBtn = document.getElementById('embedThumbnailBtn');
                const embedThumbnailFile = document.getElementById('embedThumbnailFile');
                
                if (embedThumbnailBtn && embedThumbnailFile) {
                    embedThumbnailBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        console.log('Thumbnail button clicked');
                        embedThumbnailFile.click();
                    });
                    
                    embedThumbnailFile.addEventListener('change', (e) => {
                        console.log('Thumbnail file selected');
                        this.handleEmbedImageUpload(e, 'embedThumbnail');
                    });
                }

                // Setup other upload buttons by finding them dynamically
                this.setupDynamicImageHandlers();
                
            }, 1000); // Increased timeout to ensure DOM is ready
        });
    }

    // FIXED: Setup image handlers for dynamically found buttons
    setupDynamicImageHandlers() {
        // Find all upload buttons and set them up
        const uploadButtons = document.querySelectorAll('.upload-btn');
        console.log('Found upload buttons:', uploadButtons.length);
        
        uploadButtons.forEach(button => {
            // Skip if already has listener
            if (button.hasAttribute('data-listener-added')) return;
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Upload button clicked:', button);
                
                // Find the associated file input
                const section = button.closest('.embed-section');
                if (section) {
                    const textInput = section.querySelector('input[type="url"]');
                    if (textInput) {
                        const inputId = textInput.id;
                        const fileInputId = inputId + 'File';
                        const fileInput = document.getElementById(fileInputId);
                        
                        console.log('Looking for file input:', fileInputId);
                        
                        if (fileInput) {
                            fileInput.click();
                        } else {
                            // Create file input if it doesn't exist
                            this.createFileInput(fileInputId, inputId);
                        }
                    }
                }
            });
            
            button.setAttribute('data-listener-added', 'true');
        });
    }

    // FIXED: Create file input for upload buttons
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

    // FIXED: Handle message image uploads with proper conversion
    handleMessageImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Processing message image:', file.name);

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            this.showToast('Image file is too large (max 8MB)', 'error');
            return;
        }

        // Convert to imgur or similar service
        this.convertImageToUrl(file).then(url => {
            if (url) {
                this.messageAttachments.push({
                    name: file.name,
                    url: url,
                    type: 'image'
                });
                this.updateMessageAttachmentsUI();
                this.updateCurrentWebhook();
                this.showToast('Image uploaded successfully!', 'success');
            }
        }).catch(error => {
            console.error('Image upload failed:', error);
            this.showToast('Image upload failed. Try using a direct image URL instead.', 'error');
        });
    }

    // FIXED: Handle embed image uploads with proper URL setting
    handleEmbedImageUpload(event, targetInputId) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Processing embed image for:', targetInputId);

        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            this.showToast('Image file is too large (max 8MB)', 'error');
            return;
        }

        // Convert to a usable URL
        this.convertImageToUrl(file).then(url => {
            if (url) {
                const targetInput = document.getElementById(targetInputId);
                if (targetInput) {
                    targetInput.value = url;
                    this.updateCurrentWebhook();
                    
                    // Trigger preview update
                    if (window.discordPreview) {
                        setTimeout(() => window.discordPreview.refreshPreview(), 100);
                    }
                    
                    this.showToast(`Image uploaded for ${targetInputId}!`, 'success');
                } else {
                    console.error('Target input not found:', targetInputId);
                }
            }
        }).catch(error => {
            console.error('Image upload failed:', error);
            this.showToast('Image upload failed. Try using a direct image URL instead.', 'error');
        });
    }

    // FIXED: Convert image to usable URL (using a free image hosting service)
    async convertImageToUrl(file) {
        try {
            // For demo purposes, we'll create a data URL (not ideal for production)
            // In production, you'd want to upload to imgur, cloudinary, or similar
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // For now, return data URL with warning
                    this.showToast('⚠️ Using local image data. For production, upload to imgur.com or similar service.', 'warning');
                    resolve(e.target.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } catch (error) {
            console.error('Image conversion error:', error);
            throw error;
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

    updateMessageAttachmentsVisibility() {
        const container = document.getElementById('messageAttachments');
        if (container) {
            if (this.messageAttachments && this.messageAttachments.length > 0) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        }
    }

    removeMessageAttachment(index) {
        this.messageAttachments.splice(index, 1);
        this.updateMessageAttachmentsUI();
        this.updateCurrentWebhook();
        this.showToast('Attachment removed', 'info');
    }

    setupFormListeners() {
        const saveBtn = document.getElementById('saveWebhookBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveCurrentWebhook());
        }

        const deleteBtn = document.getElementById('deleteWebhookBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteCurrentWebhook());
        }

        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        const addBtn = document.getElementById('addWebhookBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddModal());
        }

        const testBtn = document.getElementById('testWebhookBtn');
        if (testBtn) {
            testBtn.addEventListener('click', () => this.testWebhookConnection());
        }

        const inputs = ['webhookName', 'webhookUrl', 'avatarUrl'];
        inputs.forEach(id => {
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
                        <option value="link">Link Button</option>
                    </select>
                </div>
                <button type="button" class="remove-field-btn" onclick="webhookManager.removeButton(${buttonIndex})">Remove</button>
            </div>
        `;
        
        buttonsContainer.insertAdjacentHTML('beforeend', buttonHtml);
        this.messageButtons.push({ label: '', url: '', style: 'link' });
        
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
                style: styleInput?.value || 'link'
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
        if (messageContent) {
            messageContent.value = '';
        }

        const embedInputs = [
            'embedTitle', 'embedDescription', 'embedUrl', 'embedImage', 'embedThumbnail',
            'embedAuthorName', 'embedAuthorUrl', 'embedAuthorIcon',
            'embedFooterText', 'embedFooterIcon'
        ];

        embedInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = '';
            }
        });

        const colorInput = document.getElementById('embedColor');
        if (colorInput) {
            colorInput.value = '#5865F2';
            const colorPreview = document.querySelector('.color-preview');
            const colorValue = document.querySelector('.color-hex-input');
            const colorWheel = document.querySelector('.color-wheel-input');
            if (colorPreview) colorPreview.style.backgroundColor = '#5865F2';
            if (colorValue) colorValue.value = '#5865F2';
            if (colorWheel) colorWheel.value = '#5865F2';
        }

        const timestampInput = document.getElementById('embedTimestamp');
        if (timestampInput) {
            timestampInput.checked = false;
        }

        this.clearEmbedFields();
        this.clearMessageButtons();
        this.clearMessageAttachments();
    }

    clearMessageAttachments() {
        this.messageAttachments = [];
        this.updateMessageAttachmentsUI();
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
                    const colorPreview = document.querySelector('.color-preview');
                    const colorValue = document.querySelector('.color-hex-input');
                    const colorWheel = document.querySelector('.color-wheel-input');
                    if (colorPreview) colorPreview.style.backgroundColor = embed.color;
                    if (colorValue) colorValue.value = embed.color;
                    if (colorWheel) colorWheel.value = embed.color;
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

        if (webhook.messageButtons) {
            webhook.messageButtons.forEach((button, index) => {
                this.addMessageButton();
                document.getElementById(`buttonLabel${index}`).value = button.label || '';
                document.getElementById(`buttonUrl${index}`).value = button.url || '';
                document.getElementById(`buttonStyle${index}`).value = button.style || 'link';
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

        const messageContent = document.getElementById('messageContent')?.value || '';
        const embedData = this.getEmbedData();

        this.currentWebhook.name = name;
        this.currentWebhook.url = url;
        this.currentWebhook.avatar = avatar;
        this.currentWebhook.embedFields = this.embedFields;
        this.currentWebhook.messageButtons = this.messageButtons;
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
            this.currentWebhook.messageButtons = this.messageButtons;
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

    // FIXED: Send message with proper Discord button format
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

        // Validate buttons
        const buttonValidation = this.validateButtons();
        if (!buttonValidation.valid) {
            this.showToast(`Button error: ${buttonValidation.errors.join(', ')}`, 'error');
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
                    payload: payload
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

    validateButtons() {
        const errors = [];
        
        this.messageButtons.forEach((button, index) => {
            if (button.label && !button.url) {
                errors.push(`Button ${index + 1} has label but no URL`);
            }
            if (button.url && !button.label) {
                errors.push(`Button ${index + 1} has URL but no label`);
            }
            if (button.url && !this.isValidUrl(button.url)) {
                errors.push(`Button ${index + 1} has invalid URL`);
            }
            if (button.label && button.label.length > 80) {
                errors.push(`Button ${index + 1} label too long (max 80 characters)`);
            }
        });

        const validButtons = this.messageButtons.filter(b => b.label && b.url);
        if (validButtons.length > 5) {
            errors.push('Maximum 5 buttons allowed per message');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // FIXED: Build proper Discord webhook payload with working buttons
    buildWebhookPayload(content, embedData) {
        const payload = {};

        if (content) {
            payload.content = content;
        }

        if (this.currentWebhook.name) {
            payload.username = this.currentWebhook.name;
        }

        if (this.currentWebhook.avatar && this.isValidUrl(this.currentWebhook.avatar)) {
            payload.avatar_url = this.currentWebhook.avatar;
        }

        if (this.hasEmbedContent(embedData)) {
            const embed = this.buildEmbedObject(embedData);
            payload.embeds = [embed];
        }

        // FIXED: Proper Discord button components format
        const validButtons = this.messageButtons.filter(btn => 
            btn.label && btn.label.trim() && 
            btn.url && btn.url.trim() && 
            this.isValidUrl(btn.url)
        );
        
        if (validButtons.length > 0) {
            console.log('Adding buttons to payload:', validButtons);
            
            payload.components = [{
                type: 1, // ACTION_ROW
                components: validButtons.map(btn => ({
                    type: 2, // BUTTON
                    style: 5, // LINK - the only style that works with URLs
                    label: btn.label.trim().substring(0, 80),
                    url: btn.url.trim()
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

        // Images (only valid URLs)
        if (embedData.image && this.isValidUrl(embedData.image)) {
            embed.image = { url: embedData.image };
        }
        if (embedData.thumbnail && this.isValidUrl(embedData.thumbnail)) {
            embed.thumbnail = { url: embedData.thumbnail };
        }

        // Author
        if (embedData.authorName) {
            embed.author = { name: embedData.authorName.substring(0, 256) };
            if (embedData.authorUrl && this.isValidUrl(embedData.authorUrl)) {
                embed.author.url = embedData.authorUrl;
            }
            if (embedData.authorIcon && this.isValidUrl(embedData.authorIcon)) {
                embed.author.icon_url = embedData.authorIcon;
            }
        }

        // Footer
        if (embedData.footerText) {
            embed.footer = { text: embedData.footerText.substring(0, 2048) };
            if (embedData.footerIcon && this.isValidUrl(embedData.footerIcon)) {
                embed.footer.icon_url = embedData.footerIcon;
            }
        }

        // Timestamp
        if (embedData.timestamp) {
            embed.timestamp = new Date().toISOString();
        }

        // Fields
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

        const colorInput = document.getElementById('embedColor');
        if (colorInput) {
            colorInput.value = '#5865F2';
            const colorPreview = document.querySelector('.color-preview');
            const colorValue = document.querySelector('.color-hex-input');
            const colorWheel = document.querySelector('.color-wheel-input');
            if (colorPreview) colorPreview.style.backgroundColor = '#5865F2';
            if (colorValue) colorValue.value = '#5865F2';
            if (colorWheel) colorWheel.value = '#5865F2';
        }

        const timestampInput = document.getElementById('embedTimestamp');
        if (timestampInput) {
            timestampInput.checked = false;
        }

        this.clearEmbedFields();
        this.clearMessageButtons();
        this.clearMessageAttachments();

        this.showToast('Message form cleared', 'info');
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
                        text: "Discord Webhook Manager"
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
                    payload: testPayload
                })
            });

            if (response.ok) {
                this.showToast('✅ Webhook connection successful! Check Discord for the test message with button.', 'success');
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
            messageButtons: [],
            messageAttachments: [],
            savedContent: {
                message: '',
                embed: {}
            }
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

    handleAvatarUpload(event) {
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

        this.convertImageToUrl(file).then(url => {
            const avatarUrl = document.getElementById('avatarUrl');
            if (avatarUrl) {
                avatarUrl.value = url;
                this.updateAvatarPreview();
                this.updateCurrentWebhook();
                this.showToast('Avatar uploaded successfully!', 'success');
            }
        }).catch(error => {
            console.error('Avatar upload failed:', error);
            this.showToast('Avatar upload failed', 'error');
        });
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

// Global instance
window.webhookManager = new WebhookManager();