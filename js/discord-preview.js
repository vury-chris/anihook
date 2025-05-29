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
        const inputs = [
            'messageContent', 'messageImage',
            'embedTitle', 'embedDescription', 'embedColor', 'embedUrl', 
            'embedImage', 'embedThumbnail', 'embedAuthorName', 'embedAuthorIcon',
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

        // Listen for webhook selection
        document.addEventListener('webhookSelected', (e) => {
            this.currentWebhook = e.detail;
            this.refreshPreview();
        });

        document.addEventListener('webhookUpdated', (e) => {
            this.currentWebhook = e.detail;
            this.refreshPreview();
        });

        // Listen for embed field changes
        document.addEventListener('embedFieldsChanged', () => {
            this.refreshPreview();
        });
    }

    updateTheme() {
        if (this.previewElement) {
            this.previewElement.className = `preview-content ${this.currentTheme}`;
        }
    }

    refreshPreview() {
        if (!this.previewElement) {
            return;
        }

        if (!this.currentWebhook) {
            this.showPlaceholder();
            return;
        }

        const messageContent = document.getElementById('messageContent')?.value || '';
        const messageImage = document.getElementById('messageImage')?.value || '';
        const embedData = this.getEmbedData();
        
        if (!messageContent.trim() && !messageImage && !this.hasEmbedContent(embedData)) {
            this.showPlaceholder();
            return;
        }

        this.renderMessage(messageContent, messageImage, embedData);
    }

    getEmbedData() {
        const embedFields = this.getEmbedFields();
        
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
            timestamp: document.getElementById('embedTimestamp')?.checked || false,
            fields: embedFields
        };
    }

    getEmbedFields() {
        const fields = [];
        const fieldElements = document.querySelectorAll('.embed-field');
        
        fieldElements.forEach((element) => {
            const nameInput = element.querySelector('.field-name');
            const valueInput = element.querySelector('.field-value');
            const inlineInput = element.querySelector('.field-inline');
            
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

    hasEmbedContent(embedData) {
        return embedData.title || embedData.description || embedData.image || 
               embedData.thumbnail || embedData.authorName || embedData.footerText ||
               embedData.fields.length > 0;
    }

    showPlaceholder() {
        if (this.previewElement) {
            this.previewElement.innerHTML = `
                <div class="preview-placeholder">
                    <h3>Message Preview</h3>
                    <p>Your message preview will appear here</p>
                    <small>Start typing to see the preview</small>
                </div>
            `;
        }
    }

    renderMessage(content, imageUrl, embedData) {
        if (!this.previewElement) return;

        const webhookName = this.currentWebhook.name || 'Webhook';
        const webhookAvatar = this.currentWebhook.avatar || '';
        const timestamp = this.formatTimestamp(new Date());
        const isLight = this.currentTheme === 'light';

        let messageHtml = `
            <div class="discord-message ${isLight ? 'light' : ''}">
                <div class="discord-avatar">
                    ${webhookAvatar ? `<img src="${webhookAvatar}" alt="${webhookName}" onerror="this.parentElement.innerHTML='${webhookName.charAt(0).toUpperCase()}'">` : webhookName.charAt(0).toUpperCase()}
                </div>
                <div class="discord-content">
                    <div class="discord-header">
                        <span class="discord-username ${isLight ? 'light' : ''}">${this.escapeHtml(webhookName)}</span>
                        <span class="discord-timestamp ${isLight ? 'light' : ''}">${timestamp}</span>
                    </div>
        `;

        if (content.trim()) {
            const parsedContent = window.discordMarkdown.parse(content, isLight);
            messageHtml += `
                <div class="discord-message-content ${isLight ? 'light' : ''}">${parsedContent}</div>
            `;
        }

        if (imageUrl && this.isValidImageUrl(imageUrl)) {
            messageHtml += `
                <div class="discord-attachment">
                    <img src="${imageUrl}" alt="Message attachment" class="discord-attachment-image" onerror="this.style.display='none'">
                </div>
            `;
        }

        if (this.hasEmbedContent(embedData)) {
            messageHtml += this.renderEmbed(embedData, isLight);
        }

        messageHtml += `
                </div>
            </div>
        `;

        this.previewElement.innerHTML = messageHtml;
        
        // Add animation
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
        
        if (embedData.color) {
            embedHtml += ` style="border-left-color: ${embedData.color};"`;
        }
        
        embedHtml += '>';

        // Thumbnail (positioned absolutely)
        if (embedData.thumbnail && this.isValidImageUrl(embedData.thumbnail)) {
            embedHtml += `<img src="${embedData.thumbnail}" alt="Thumbnail" class="discord-embed-thumbnail" onerror="this.style.display='none'">`;
        }

        // Author
        if (embedData.authorName) {
            embedHtml += '<div class="discord-embed-author">';
            if (embedData.authorIcon && this.isValidImageUrl(embedData.authorIcon)) {
                embedHtml += `<img src="${embedData.authorIcon}" alt="Author Icon" class="discord-embed-author-icon" onerror="this.style.display='none'">`;
            }
            embedHtml += `<div class="discord-embed-author-name ${isLight ? 'light' : ''}">${this.escapeHtml(embedData.authorName)}</div>`;
            embedHtml += '</div>';
        }

        // Title
        if (embedData.title) {
            const titleContent = embedData.url && this.isValidUrl(embedData.url) 
                ? `<a href="${embedData.url}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(embedData.title)}</a>`
                : this.escapeHtml(embedData.title);
            
            embedHtml += `<div class="discord-embed-title ${isLight ? 'light' : ''}">${titleContent}</div>`;
        }

        // Description
        if (embedData.description) {
            const parsedDescription = window.discordMarkdown.parse(embedData.description, isLight);
            embedHtml += `<div class="discord-embed-description ${isLight ? 'light' : ''}">${parsedDescription}</div>`;
        }

        // Fields
        if (embedData.fields && embedData.fields.length > 0) {
            embedHtml += '<div class="discord-embed-fields">';
            embedData.fields.forEach(field => {
                const inlineClass = field.inline ? ' inline' : '';
                const parsedValue = window.discordMarkdown.parse(field.value, isLight);
                embedHtml += `
                    <div class="discord-embed-field${inlineClass}">
                        <div class="discord-embed-field-name ${isLight ? 'light' : ''}">${this.escapeHtml(field.name)}</div>
                        <div class="discord-embed-field-value ${isLight ? 'light' : ''}">${parsedValue}</div>
                    </div>
                `;
            });
            embedHtml += '</div>';
        }

        // Image
        if (embedData.image && this.isValidImageUrl(embedData.image)) {
            embedHtml += `<img src="${embedData.image}" alt="Embed Image" class="discord-embed-image" onerror="this.style.display='none'">`;
        }

        // Footer
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
            }) + ` at ${date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            })}`;
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

    clear() {
        this.currentWebhook = null;
        this.showPlaceholder();
    }

    // Validate message content against Discord limits
    validateMessage() {
        const messageContent = document.getElementById('messageContent')?.value || '';
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
        if (embedData.footerText && embedData.footerText.length > 2048) {
            errors.push('Embed footer text exceeds 2048 characters');
        }

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

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// Global instance
window.discordPreview = new DiscordPreview();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.discordPreview.init();
});