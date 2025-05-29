class DiscordMarkdownParser {
    constructor() {
        this.patterns = {
            // Bold: **text**
            bold: /\*\*(.*?)\*\*/g,
            // Italic: *text*
            italic: /(?<!\*)\*([^*\n]+?)\*(?!\*)/g,
            // Underline: __text__
            underline: /__(.*?)__/g,
            // Strikethrough: ~~text~~
            strikethrough: /~~(.*?)~~/g,
            // Inline code: `code`
            inlineCode: /`([^`\n]+?)`/g,
            // Code block: ```code```
            codeBlock: /```([\s\S]*?)```/g,
            // Links: [text](url)
            link: /\[([^\]]+?)\]\(([^)]+?)\)/g,
            // Quote: > text
            quote: /^>\s(.+)$/gm,
            // Spoiler: ||text||
            spoiler: /\|\|(.*?)\|\|/g
        };
    }

    parse(text, isLight = false) {
        if (!text) return '';
        
        let parsed = this.escapeHtml(text);
        
        // Parse in specific order to avoid conflicts
        parsed = this.parseCodeBlocks(parsed);
        parsed = this.parseInlineCode(parsed);
        parsed = this.parseSpoilers(parsed);
        parsed = this.parseLinks(parsed);
        parsed = this.parseFormatting(parsed);
        parsed = this.parseQuotes(parsed, isLight);
        parsed = this.preserveLineBreaks(parsed);
        
        return parsed;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    parseCodeBlocks(text) {
        return text.replace(this.patterns.codeBlock, (match, code) => {
            const trimmedCode = code.trim();
            return `<div class="discord-code-block"><code>${this.escapeHtml(trimmedCode)}</code></div>`;
        });
    }

    parseInlineCode(text) {
        return text.replace(this.patterns.inlineCode, (match, code) => {
            return `<span class="discord-code-inline">${this.escapeHtml(code)}</span>`;
        });
    }

    parseSpoilers(text) {
        return text.replace(this.patterns.spoiler, (match, content) => {
            return `<span class="discord-spoiler" onclick="this.classList.toggle('revealed')" title="Click to reveal spoiler">${content}</span>`;
        });
    }

    parseLinks(text) {
        return text.replace(this.patterns.link, (match, linkText, url) => {
            // Basic URL validation
            if (!this.isValidUrl(url)) {
                return match; // Return original if invalid URL
            }
            return `<a href="${url}" class="discord-link" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        });
    }

    parseFormatting(text) {
        // Parse strikethrough first
        text = text.replace(this.patterns.strikethrough, (match, content) => {
            return `<span class="discord-strikethrough">${content}</span>`;
        });

        // Parse bold (** variant)
        text = text.replace(this.patterns.bold, (match, content) => {
            return `<strong class="discord-bold">${content}</strong>`;
        });

        // Parse underline (__ variant, but not when used for bold)
        text = text.replace(/(?<!\*)__(.*?)__(?!\*)/g, (match, content) => {
            return `<u class="discord-underline">${content}</u>`;
        });

        // Parse italic (* variant, but not when part of bold)
        text = text.replace(this.patterns.italic, (match, content) => {
            return `<em class="discord-italic">${content}</em>`;
        });

        return text;
    }

    parseQuotes(text, isLight = false) {
        const lines = text.split('\n');
        const result = [];
        let inQuote = false;
        let quoteContent = [];

        for (let line of lines) {
            if (line.startsWith('&gt; ')) {
                if (!inQuote) {
                    inQuote = true;
                    quoteContent = [];
                }
                quoteContent.push(line.substring(5)); // Remove '&gt; '
            } else {
                if (inQuote) {
                    result.push(`<div class="discord-quote${isLight ? ' light' : ''}">${quoteContent.join('<br>')}</div>`);
                    inQuote = false;
                    quoteContent = [];
                }
                if (line.trim()) {
                    result.push(line);
                }
            }
        }

        // Handle quote at end of text
        if (inQuote && quoteContent.length > 0) {
            result.push(`<div class="discord-quote${isLight ? ' light' : ''}">${quoteContent.join('<br>')}</div>`);
        }

        return result.join('\n');
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Helper method to preserve line breaks
    preserveLineBreaks(text) {
        return text.replace(/\n/g, '<br>');
    }

    // Parse Discord-style mentions (for future enhancement)
    parseMentions(text) {
        return text
            .replace(/<@!?(\d+)>/g, '<span class="discord-mention">@User</span>')
            .replace(/<@&(\d+)>/g, '<span class="discord-mention discord-role-mention">@Role</span>')
            .replace(/<#(\d+)>/g, '<span class="discord-mention">#channel</span>');
    }

    // Parse custom emojis (for future enhancement)
    parseEmojis(text) {
        return text.replace(/<a?:(\w+):(\d+)>/g, (match, name, id) => {
            const extension = match.startsWith('<a:') ? 'gif' : 'png';
            return `<img src="https://cdn.discordapp.com/emojis/${id}.${extension}" alt=":${name}:" class="discord-emoji" style="width: 22px; height: 22px; vertical-align: -4px;">`;
        });
    }

    // Complete parsing with all features
    parseComplete(text, isLight = false) {
        if (!text) return '';
        
        let parsed = this.escapeHtml(text);
        
        // Parse in specific order to avoid conflicts
        parsed = this.parseCodeBlocks(parsed);
        parsed = this.parseInlineCode(parsed);
        parsed = this.parseSpoilers(parsed);
        parsed = this.parseLinks(parsed);
        parsed = this.parseFormatting(parsed);
        parsed = this.parseQuotes(parsed, isLight);
        parsed = this.parseMentions(parsed);
        parsed = this.parseEmojis(parsed);
        parsed = this.preserveLineBreaks(parsed);
        
        return parsed;
    }
}

// Global instance
window.discordMarkdown = new DiscordMarkdownParser();