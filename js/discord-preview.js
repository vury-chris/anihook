class DiscordPreview {
    constructor() {
        this.previewElement = null;
        this.currentTheme = 'dark';
        this.currentWebhook = null;
        this.init();
    }

    init() {
        this.previewElement = document.getElementById('discordPreview');
        this.setupThemeToggle();
        this.setupEventListeners();
    }

    setupThemeToggle() {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.currentTheme = e.target.value;
                this.updateTheme();
                this.refreshPreview();
            });
        }
    }

    setupEventListeners() {
        // Listen for input changes
        const inputs = [
            'messageContent',
            'embedTitle', 'embedDescription', 'embedColor', 'embedUrl', 'embedImage', 'embedThumbnail',
            'embedAuthorName', 'embedAuthorUrl', 'embedAuthorIcon',
            'embedFooterText', 'embedFooterIcon', 'embedTimestamp'
        ];

        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.refreshPreview();
                });
            }
        });

        // Listen for webhook data changes
        document.addEventListener('webhookSelected', (e) => {
            this.currentWebhook = e.detail;
            this.refreshPreview();
        });

        document.addEventListener('webhookUpdated', (e) => {
            this.currentWebhook = e.detail;
            this.refreshPreview();
        });
    }

    updateTheme() {
        if (this.previewElement) {
            this.previewElement.className = `discord-preview ${this.currentTheme}`;
        }
    }

    refreshPreview() {
        if (!this.previewElement || !this.currentWebhook) {
            this.showPlaceholder();
            return;
        }

        const messageContent = document.getElementById('messageContent')?.value || '';
        const embedData = this.getEmbedData();
        const buttons = this.getMessageButtons();
        
        if (!messageContent.trim() && !this.hasEmbedContent(embedData) && buttons.length === 0) {
            this.showPlaceholder();
            return;
        }

        this.renderMessage(messageContent, embedData, buttons);
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
            timestamp: document.getElementById('embedTimestamp')?.checked || false,
            fields: this.getEmbedFields()
        };
    }

    getEmbedFields() {
        const fields = [];
        const fieldElements = document.querySelectorAll('.embed-field');
        
        fieldElements.forEach((element, index) => {
            const nameInput = document.getElementById(`embedFieldName${index}`);
            const valueInput = document.getElementById(`embedFieldValue${index}`);
            const inlineInput = document.getElementById(`embedFieldInline${index}`);
            
            if (nameInput?.value && valueInput?.value) {
                fields.push({
                    name: nameInput.value,
                    value: valueInput.value,
                    inline: inlineInput?.checked || false
                });
            }
        });
        
        return fields;
    }

    getMessageButtons() {
        const buttons = [];
        const buttonElements = document.querySelectorAll('[data-button-index]');
        
        buttonElements.forEach((element, index) => {
            const labelInput = document.getElementById(`buttonLabel${index}`);
            const urlInput = document.getElementById(`buttonUrl${index}`);
            const styleInput = document.getElementById(`buttonStyle${index}`);
            
            if (labelInput?.value && urlInput?.value) {
                buttons.push({
                    label: labelInput.value,
                    url: urlInput.value,
                    style: styleInput?.value || 'primary'
                });
            }
        });
        
        return buttons;
    }

    hasEmbedContent(embedData) {
        return embedData.title || embedData.description || embedData.image || 
               embedData.thumbnail || embedData.authorName || embedData.footerText ||
               embedData.fields.length > 0;
    }

    showPlaceholder() {
        if (this.previewElement) {
            this.previewElement.innerHTML = `
                <div class="preview-placeholder">
                    <h3>💬 Message Preview</h3>
                    <p>Your message preview will appear here</p>
                    <small>Start typing a message or creating an embed to see the preview</small>
                </div>
            `;
        }
    }

    renderMessage(content, embedData, buttons) {
        if (!this.previewElement) return;

        const webhookName = this.currentWebhook.name || 'Webhook';
        const webhookAvatar = this.currentWebhook.avatar || 'assets/default-avatar.png';
        const timestamp = this.formatTimestamp(new Date());
        const isLight = this.currentTheme === 'light';

        let messageHtml = `
            <div class="discord-message ${isLight ? 'light' : ''}">
                <img src="${webhookAvatar}" alt="${webhookName}" class="discord-avatar" onerror="this.src='assets/default-avatar.png'">
                <div class="discord-content">
                    <div class="discord-header">
                        <span class="discord-username ${isLight ? 'light' : ''}">${this.escapeHtml(webhookName)}</span>
                        <span class="discord-timestamp ${isLight ? 'light' : ''}">${timestamp}</span>
                    </div>
        `;

        // Add message content if present
        if (content.trim()) {
            const parsedContent = window.discordMarkdown.parse(content, isLight);
            messageHtml += `
                <div class="discord-message-text ${isLight ? 'light' : ''}">${parsedContent}</div>
            `;
        }

        // Add embed if present
        if (this.hasEmbedContent(embedData)) {
            messageHtml += this.renderEmbed(embedData, isLight);
        }

        // Add components (buttons) if present
        if (buttons.length > 0) {
            messageHtml += this.renderComponents(buttons, isLight);
        }

        messageHtml += `
                </div>
            </div>
        `;

        this.previewElement.innerHTML = messageHtml;
        
        // Add animation class
        const messageElement = this.previewElement.querySelector('.discord-message');
        if (messageElement) {
            messageElement.classList.add('new-message');
            setTimeout(() => {
                messageElement.classList.remove('new-message');
            }, 300);
        }
    }

    renderEmbed(embedData, isLight = false) {
        let embedHtml = `<div class="discord-embed ${isLight ? 'light' : ''}"`;
        
        // Add color border
        if (embedData.color) {
            embedHtml += ` style="border-left-color: ${embedData.color};"`;
        }
        
        embedHtml += '>';

        // Add thumbnail if present
        if (embedData.thumbnail && this.isValidImageUrl(embedData.thumbnail)) {
            embedHtml += `<img src="${embedData.thumbnail}" alt="Thumbnail" class="discord-embed-thumbnail" onerror="this.style.display='none'">`;
        }

        // Add author if present
        if (embedData.authorName) {
            embedHtml += '<div class="discord-embed-author">';
            if (embedData.authorIcon && this.isValidImageUrl(embedData.authorIcon)) {
                embedHtml += `<img src="${embedData.authorIcon}" alt="Author Icon" class="discord-embed-author-icon" onerror="this.style.display='none'">`;
            }
            const authorContent = embedData.authorUrl && this.isValidUrl(embedData.authorUrl) 
                ? `<a href="${embedData.authorUrl}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(embedData.authorName)}</a>`
                : this.escapeHtml(embedData.authorName);
            embedHtml += `<div class="discord-embed-author-name ${isLight ? 'light' : ''}">${authorContent}</div>`;
            embedHtml += '</div>';
        }

        // Add title
        if (embedData.title) {
            const titleContent = embedData.url && this.isValidUrl(embedData.url) 
                ? `<a href="${embedData.url}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(embedData.title)}</a>`
                : this.escapeHtml(embedData.title);
            
            embedHtml += `<div class="discord-embed-title ${isLight ? 'light' : ''}">${titleContent}</div>`;
        }

        // Add description
        if (embedData.description) {
            const parsedDescription = window.discordMarkdown.parse(embedData.description, isLight);
            embedHtml += `<div class="discord-embed-description ${isLight ? 'light' : ''}">${parsedDescription}</div>`;
        }

        // Add fields
        if (embedData.fields && embedData.fields.length > 0) {
            embedHtml += '<div class="discord-embed-fields">';
            embedData.fields.forEach(field => {
                const inlineClass = field.inline ? ' inline' : '';
                embedHtml += `
                    <div class="discord-embed-field${inlineClass}">
                        <div class="discord-embed-field-name ${isLight ? 'light' : ''}">${this.escapeHtml(field.name)}</div>
                        <div class="discord-embed-field-value ${isLight ? 'light' : ''}">${window.discordMarkdown.parse(field.value, isLight)}</div>
                    </div>
                `;
            });
            embedHtml += '</div>';
        }

        // Add image
        if (embedData.image && this.isValidImageUrl(embedData.image)) {
            embedHtml += `<img src="${embedData.image}" alt="Embed Image" class="discord-embed-image" onerror="this.style.display='none'">`;
        }

        // Add footer
        if (embedData.footerText || embedData.timestamp) {
            embedHtml += '<div class="discord-embed-footer">';
            
            if (embedData.footerIcon && this.isValidImageUrl(embedData.footerIcon)) {
                embedHtml += `<img src="${embedData.footerIcon}" alt="Footer Icon" class="discord-embed-footer-icon" onerror="this.style.display='none'">`;
            }
            
            if (embedData.footerText) {
                embedHtml += `<span class="discord-embed-footer-text ${isLight ? 'light' : ''}">${this.escapeHtml(embedData.footerText)}</span>`;
            }
            
            if (embedData.footerText && embedData.timestamp) {
                embedHtml += `<div class="discord-embed-footer-separator ${isLight ? 'light' : ''}"></div>`;
            }
            
            if (embedData.timestamp) {
                const now = new Date();
                embedHtml += `<span class="discord-embed-footer-text ${isLight ? 'light' : ''}">${this.formatTimestamp(now)}</span>`;
            }
            
            embedHtml += '</div>';
        }

        embedHtml += '</div>';
        return embedHtml;
    }

    renderComponents(buttons, isLight = false) {
        if (buttons.length === 0) return '';
        
        let componentsHtml = '<div class="discord-components">';
        componentsHtml += '<div class="discord-button-row">';
        
        buttons.forEach(button => {
            const buttonClass = `discord-button discord-button-${button.style}`;
            componentsHtml += `
                <a href="${button.url}" target="_blank" rel="noopener noreferrer" class="${buttonClass}">
                    ${this.escapeHtml(button.label)}
                </a>
            `;
        });
        
        componentsHtml += '</div>';
        componentsHtml += '</div>';
        
        return componentsHtml;
    }

    formatTimestamp(date) {
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();
        
        if (isToday) {
            return `Today at ${date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            })}`;
        } else {
            return date.toLocaleDateString('en-US', { 
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            }) + ' ' + date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
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

    isValidImageUrl(url) {
        if (!this.isValidUrl(url)) return false;
        
        // Basic image URL validation
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
        const lowercaseUrl = url.toLowerCase();
        
        return imageExtensions.some(ext => lowercaseUrl.includes(ext)) || 
               lowercaseUrl.includes('cdn.discordapp.com') ||
               lowercaseUrl.includes('media.discordapp.net') ||
               lowercaseUrl.includes('cdn.discord.com') ||
               lowercaseUrl.includes('images.discord') ||
               url.startsWith('data:image/');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Preview a specific webhook configuration
    previewWebhook(webhook, content = '', embedData = null, buttons = []) {
        this.currentWebhook = webhook;
        
        if (content || embedData || buttons.length > 0) {
            // Temporarily set form values for preview
            const messageContent = document.getElementById('messageContent');
            if (messageContent && content) {
                messageContent.value = content;
            }

            if (embedData) {
                this.setEmbedFormData(embedData);
            }

            if (buttons.length > 0) {
                this.setButtonFormData(buttons);
            }
        }
        
        this.refreshPreview();
    }

    setEmbedFormData(embedData) {
        const fields = [
            'embedTitle', 'embedDescription', 'embedColor', 'embedUrl', 'embedImage', 'embedThumbnail',
            'embedAuthorName', 'embedAuthorUrl', 'embedAuthorIcon',
            'embedFooterText', 'embedFooterIcon'
        ];

        fields.forEach(field => {
            const element = document.getElementById(field);
            const key = field.replace('embed', '').toLowerCase();
            if (element && embedData[key]) {
                element.value = embedData[key];
            }
        });

        const timestampElement = document.getElementById('embedTimestamp');
        if (timestampElement && embedData.timestamp !== undefined) {
            timestampElement.checked = embedData.timestamp;
        }
    }

    setButtonFormData(buttons) {
        // Clear existing buttons first
        const buttonsContainer = document.getElementById('messageButtons');
        if (buttonsContainer) {
            buttonsContainer.innerHTML = '';
        }

        // Add buttons
        buttons.forEach((button, index) => {
            if (window.webhookManager) {
                window.webhookManager.addMessageButton();
                document.getElementById(`buttonLabel${index}`).value = button.label || '';
                document.getElementById(`buttonUrl${index}`).value = button.url || '';
                document.getElementById(`buttonStyle${index}`).value = button.style || 'primary';
            }
        });
    }

    // Clear preview
    clear() {
        this.currentWebhook = null;
        this.showPlaceholder();
    }

    // Export current preview as image (future enhancement)
    async exportAsImage() {
        try {
            // This would require html2canvas or similar library
            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(this.previewElement);
                const link = document.createElement('a');
                link.download = 'discord-message-preview.png';
                link.href = canvas.toDataURL();
                link.click();
            } else {
                console.log('html2canvas library not loaded - Export as image feature not available');
                alert('Export as image feature requires additional library. Coming soon!');
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export image. Please try again.');
        }
    }

    // Get preview statistics
    getPreviewStats() {
        if (!this.currentWebhook) return null;

        const messageContent = document.getElementById('messageContent')?.value || '';
        const embedData = this.getEmbedData();
        const buttons = this.getMessageButtons();

        return {
            webhook: this.currentWebhook.name,
            messageLength: messageContent.length,
            hasEmbed: this.hasEmbedContent(embedData),
            embedFieldCount: embedData.fields.length,
            buttonCount: buttons.length,
            theme: this.currentTheme
        };
    }

    // Validate message before sending
    validateMessage() {
        const messageContent = document.getElementById('messageContent')?.value?.trim() || '';
        const embedData = this.getEmbedData();
        const buttons = this.getMessageButtons();
        const errors = [];

        // Check message content length
        if (messageContent.length > 2000) {
            errors.push('Message content exceeds 2000 characters');
        }

        // Check embed limits
        if (embedData.title && embedData.title.length > 256) {
            errors.push('Embed title exceeds 256 characters');
        }
        if (embedData.description && embedData.description.length > 4096) {
            errors.push('Embed description exceeds 4096 characters');
        }
        if (embedData.footerText && embedData.footerText.length > 2048) {
            errors.push('Embed footer text exceeds 2048 characters');
        }

        // Check field limits
        if (embedData.fields.length > 25) {
            errors.push('Embed cannot have more than 25 fields');
        }

        embedData.fields.forEach((field, index) => {
            if (field.name.length > 256) {
                errors.push(`Field ${index + 1} name exceeds 256 characters`);
            }
            if (field.value.length > 1024) {
                errors.push(`Field ${index + 1} value exceeds 1024 characters`);
            }
        });

        // Check button limits
        if (buttons.length > 5) {
            errors.push('Cannot have more than 5 buttons per message');
        }

        buttons.forEach((button, index) => {
            if (button.label.length > 80) {
                errors.push(`Button ${index + 1} label exceeds 80 characters`);
            }
            if (button.url && !this.isValidUrl(button.url)) {
                errors.push(`Button ${index + 1} has invalid URL`);
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// Global instance
window.discordPreview = new DiscordPreview();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.discordPreview.init();
});