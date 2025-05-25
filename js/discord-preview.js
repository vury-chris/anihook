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
            'embedTitle',
            'embedDescription',
            'embedColor',
            'embedUrl',
            'embedImage',
            'embedThumbnail'
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
        
        if (!messageContent.trim() && !this.hasEmbedContent(embedData)) {
            this.showPlaceholder();
            return;
        }

        this.renderMessage(messageContent, embedData);
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

    showPlaceholder() {
        if (this.previewElement) {
            this.previewElement.innerHTML = `
                <div class="preview-placeholder">
                    <p>Your message preview will appear here</p>
                </div>
            `;
        }
    }

    renderMessage(content, embedData) {
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
                        <span class="discord-username ${isLight ? 'light' : ''}">${webhookName}</span>
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

        // Add image
        if (embedData.image && this.isValidImageUrl(embedData.image)) {
            embedHtml += `<img src="${embedData.image}" alt="Embed Image" class="discord-embed-image" onerror="this.style.display='none'">`;
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
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const lowercaseUrl = url.toLowerCase();
        
        return imageExtensions.some(ext => lowercaseUrl.includes(ext)) || 
               lowercaseUrl.includes('cdn.discordapp.com') ||
               lowercaseUrl.includes('media.discordapp.net');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Preview a specific webhook configuration
    previewWebhook(webhook, content = '', embedData = null) {
        this.currentWebhook = webhook;
        
        if (content || embedData) {
            // Temporarily set form values for preview
            const messageContent = document.getElementById('messageContent');
            if (messageContent && content) {
                messageContent.value = content;
            }

            if (embedData) {
                this.setEmbedFormData(embedData);
            }
        }
        
        this.refreshPreview();
    }

    setEmbedFormData(embedData) {
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
            if (element && embedData[key]) {
                element.value = embedData[key];
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
        // This would require html2canvas or similar library
        console.log('Export as image feature - coming soon!');
    }
}

// Global instance
window.discordPreview = new DiscordPreview();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.discordPreview.init();
});