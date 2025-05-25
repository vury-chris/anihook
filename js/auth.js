// Secure Discord OAuth - uses Vercel serverless functions
class DiscordAuth {
    constructor() {
        this.user = null;
        this.accessToken = null;
        this.authUrl = null;
        this.redirectUri = null;
        this.init();
    }

    init() {
        // Check for stored auth data
        this.loadStoredAuth();
        
        // Check for OAuth success from callback page
        this.checkOAuthCallback();
        
        // Handle OAuth callback if present (fallback)
        this.handleCallback();
        
        // Load auth URL from backend
        this.loadAuthUrl();
    }

    checkOAuthCallback() {
        // Check if we just returned from OAuth callback
        const oauthSuccess = sessionStorage.getItem('oauth_success');
        if (oauthSuccess) {
            try {
                const authData = JSON.parse(oauthSuccess);
                console.log('Found OAuth success data from callback');
                
                // Clear the temporary storage
                sessionStorage.removeItem('oauth_success');
                
                // Set user data
                this.accessToken = authData.access_token;
                this.user = authData.user;
                
                // Store permanently
                this.storeAuth(authData);
                this.updateUI();
                
                this.showToast(`Welcome back, ${this.user.username}!`, 'success');
                
                // Clean URL if it has OAuth params
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('code') || urlParams.get('error')) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                
            } catch (error) {
                console.error('Error processing OAuth callback:', error);
                sessionStorage.removeItem('oauth_success');
            }
        }
    }

    async loadAuthUrl() {
        try {
            const response = await fetch('/api/auth');
            if (response.ok) {
                const data = await response.json();
                this.authUrl = data.authUrl;
                this.redirectUri = data.redirectUri;
            } else {
                console.error('Failed to load auth URL from backend');
            }
        } catch (error) {
            console.error('Error loading auth URL:', error);
        }
    }

    loadStoredAuth() {
        const storedAuth = localStorage.getItem('discord_auth');
        if (storedAuth) {
            try {
                const authData = JSON.parse(storedAuth);
                if (this.isTokenValid(authData)) {
                    this.user = authData.user;
                    this.accessToken = authData.accessToken;
                    this.updateUI();
                } else {
                    this.clearStoredAuth();
                }
            } catch (error) {
                console.error('Error loading stored auth:', error);
                this.clearStoredAuth();
            }
        }
    }

    isTokenValid(authData) {
        if (!authData.expiresAt) return false;
        return Date.now() < authData.expiresAt;
    }

    clearStoredAuth() {
        localStorage.removeItem('discord_auth');
        this.user = null;
        this.accessToken = null;
    }

    handleCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
            console.error('OAuth error:', error);
            this.showToast('Authentication failed', 'error');
            return;
        }

        if (code) {
            this.exchangeCodeForToken(code);
        }
    }

    async exchangeCodeForToken(code) {
        try {
            this.showToast('Authenticating with Discord...', 'info');
            
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    redirectUri: this.redirectUri
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Authentication failed');
            }

            const data = await response.json();
            
            if (data.access_token && data.user) {
                this.accessToken = data.access_token;
                this.user = data.user;
                
                this.storeAuth(data);
                this.updateUI();
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                this.showToast('Successfully logged in!', 'success');
            } else {
                throw new Error('Invalid response from authentication server');
            }
        } catch (error) {
            console.error('Token exchange error:', error);
            this.showToast('Authentication failed: ' + error.message, 'error');
        }
    }

    storeAuth(tokenData) {
        const authData = {
            user: this.user,
            accessToken: this.accessToken,
            expiresAt: Date.now() + (tokenData.expires_in * 1000)
        };
        localStorage.setItem('discord_auth', JSON.stringify(authData));
    }

    async login() {
        if (!this.authUrl) {
            // Try to load auth URL if not loaded yet
            await this.loadAuthUrl();
        }
        
        if (this.authUrl) {
            window.location.href = this.authUrl;
        } else {
            this.showToast('Authentication service unavailable', 'error');
        }
    }

    logout() {
        this.clearStoredAuth();
        this.updateUI();
        this.showToast('Successfully logged out', 'success');
        
        // Clear webhooks if any
        if (window.webhookManager) {
            window.webhookManager.clearWebhooks();
        }
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const loginBtnMain = document.getElementById('loginBtnMain');
        const userProfile = document.getElementById('userProfile');
        const userAvatar = document.getElementById('userAvatar');
        const username = document.getElementById('username');
        const loginPrompt = document.getElementById('loginPrompt');
        const appContent = document.getElementById('appContent');

        if (this.isAuthenticated()) {
            // Hide login elements
            if (loginBtn) loginBtn.classList.add('hidden');
            if (loginBtnMain) loginBtnMain.classList.add('hidden');
            if (loginPrompt) loginPrompt.classList.add('hidden');
            
            // Show user profile and app
            if (userProfile) userProfile.classList.remove('hidden');
            if (appContent) appContent.classList.remove('hidden');
            
            // Update user info
            if (userAvatar && this.user) {
                userAvatar.src = this.getUserAvatarUrl();
                userAvatar.alt = this.user.username;
            }
            if (username && this.user) {
                username.textContent = this.user.username;
            }
        } else {
            // Show login elements
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (loginBtnMain) loginBtnMain.classList.remove('hidden');
            if (loginPrompt) loginPrompt.classList.remove('hidden');
            
            // Hide user profile and app
            if (userProfile) userProfile.classList.add('hidden');
            if (appContent) appContent.classList.add('hidden');
        }
    }

    isAuthenticated() {
        return this.user !== null && this.accessToken !== null;
    }

    getUser() {
        return this.user;
    }

    getUserAvatarUrl() {
        if (!this.user || !this.user.avatar) {
            return 'assets/default-avatar.png';
        }
        return `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.png?size=128`;
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
}

// Initialize auth system
window.discordAuth = new DiscordAuth();

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnMain = document.getElementById('loginBtnMain');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => window.discordAuth.login());
    }
    
    if (loginBtnMain) {
        loginBtnMain.addEventListener('click', () => window.discordAuth.login());
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => window.discordAuth.logout());
    }
});