class DiscordMarkdownParser {
    constructor() {
        this.patterns = {
            // Bold: **text** or __text__
            bold: /\*\*(.*?)\*\*|__(.*?)__/g,
            // Italic: *text* or _text_
            italic: /(?<!\*)\*([^*]+?)\*(?!\*)|(?<!_)_([^_]+?)_(?!_)/g,
            // Underline: __text__ (when not bold)
            underline: /__(.*?)__/g,
            // Strikethrough: ~~text~~
            strikethrough: /~~(.*?)~~/g,
            // Inline code: `code`
            inlineCode: /`([^`]+?)`/g,
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
        parsed = this.parseFormatting(parsed, isLight);
        parsed = this.parseQuotes(parsed, isLight);
        
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
            return `<pre class="discord-code-block"><code>${this.escapeHtml(trimmedCode)}</code></pre>`;
        });
    }

    parseInlineCode(text) {
        return text.replace(this.patterns.inlineCode, (match, code) => {
            return `<code class="discord-code-inline">${this.escapeHtml(code)}</code>`;
        });
    }

    parseSpoilers(text) {
        return text.replace(this.patterns.spoiler, (match, content) => {
            return `<span class="discord-spoiler" onclick="this.classList.toggle('revealed')">${content}</span>`;
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

    parseFormatting(text, isLight = false) {
        // Parse strikethrough first
        text = text.replace(this.patterns.strikethrough, (match, content) => {
            return `<span class="discord-strikethrough">${content}</span>`;
        });

        // Parse bold (both ** and __ variants)
        text = text.replace(/\*\*(.*?)\*\*/g, (match, content) => {
            return `<strong class="discord-bold">${content}</strong>`;
        });

        // Parse italic (but not when it's part of bold/underline)
        text = text.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, (match, content) => {
            return `<em class="discord-italic">${content}</em>`;
        });

        // Parse underline (__ when not used for bold)
        text = text.replace(/(?<!\*)__(.*?)__(?!\*)/g, (match, content) => {
            return `<u class="discord-underline">${content}</u>`;
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

        return result.join('<br>');
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Parse mentions (for future enhancement)
    parseMentions(text) {
        return text
            .replace(/<@!?(\d+)>/g, '<span class="discord-mention">@User</span>')
            .replace(/<@&(\d+)>/g, '<span class="discord-mention discord-role-mention">@Role</span>')
            .replace(/<#(\d+)>/g, '<span class="discord-mention">#channel</span>');
    }

    // Parse custom emojis (for future enhancement)
    parseEmojis(text) {
        return text.replace(/<a?:(\w+):(\d+)>/g, (match, name, id) => {
            return `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt=":${name}:" class="discord-emoji">`;
        });
    }

    // Parse timestamps (for future enhancement)
    parseTimestamps(text) {
        return text.replace(/<t:(\d+)(?::([tTdDfFR]))?>/g, (match, timestamp, format) => {
            const date = new Date(parseInt(timestamp) * 1000);
            return `<span class="discord-timestamp">${date.toLocaleString()}</span>`;
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
        parsed = this.parseFormatting(parsed, isLight);
        parsed = this.parseQuotes(parsed, isLight);
        parsed = this.parseMentions(parsed);
        parsed = this.parseEmojis(parsed);
        parsed = this.parseTimestamps(parsed);
        
        return parsed;
    }

    // Helper method to preserve line breaks
    preserveLineBreaks(text) {
        return text.replace(/\n/g, '<br>');
    }
}

// Global instance
window.discordMarkdown = new DiscordMarkdownParser();