// Vercel serverless function - api/auth.js
// Handles Discord OAuth securely without exposing Client ID/Secret

export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Get secrets from environment variables (set in Vercel dashboard)
    const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
        return res.status(500).json({ 
            error: 'Server configuration error - missing Discord credentials' 
        });
    }
    
    // Get authentication URL
    if (req.method === 'GET') {
        try {
            const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://localhost:3000';
            const redirectUri = `${origin}/login.html`;
            
            const authUrl = `https://discord.com/api/oauth2/authorize?` + new URLSearchParams({
                client_id: CLIENT_ID,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: 'identify'
            }).toString();
            
            return res.json({ 
                authUrl,
                redirectUri // Send back for verification
            });
        } catch (error) {
            console.error('Auth URL generation error:', error);
            return res.status(500).json({ error: 'Failed to generate auth URL' });
        }
    }
    
    // Exchange authorization code for access token
    if (req.method === 'POST') {
        try {
            const { code, redirectUri } = req.body;
            
            if (!code) {
                return res.status(400).json({ error: 'Authorization code is required' });
            }
            
            // Exchange code for token with Discord
            const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded' 
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: redirectUri || `${req.headers.origin}/login.html`
                })
            });
            
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.text();
                console.error('Discord token exchange failed:', errorData);
                return res.status(400).json({ error: 'Invalid authorization code' });
            }
            
            const tokenData = await tokenResponse.json();
            
            // Get user info
            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`
                }
            });
            
            if (!userResponse.ok) {
                return res.status(400).json({ error: 'Failed to fetch user data' });
            }
            
            const userData = await userResponse.json();
            
            // Return both token and user data
            return res.json({
                access_token: tokenData.access_token,
                expires_in: tokenData.expires_in,
                user: userData
            });
            
        } catch (error) {
            console.error('Token exchange error:', error);
            return res.status(500).json({ error: 'Token exchange failed' });
        }
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
}