
export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { webhookUrl, payload } = req.body;

        if (!webhookUrl || !payload) {
            return res.status(400).json({ error: 'Missing webhookUrl or payload' });
        }

        // Validate webhook URL format
        const webhookPattern = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
        if (!webhookPattern.test(webhookUrl)) {
            return res.status(400).json({ error: 'Invalid Discord webhook URL format' });
        }

        console.log('Proxying webhook request to:', webhookUrl);
        console.log('Payload:', JSON.stringify(payload, null, 2));

        // Forward request to Discord
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'DiscordWebhookManager/1.0'
            },
            body: JSON.stringify(payload)
        });

        console.log('Discord response status:', response.status);

        if (response.ok) {
            // Discord webhooks return 204 No Content on success
            return res.status(200).json({ 
                success: true, 
                message: 'Message sent successfully',
                status: response.status 
            });
        } else {
            // Get error details from Discord
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: `HTTP ${response.status}` };
            }

            console.error('Discord API error:', errorData);

            return res.status(response.status).json({
                error: errorData.message || `Discord API error: ${response.status}`,
                code: errorData.code,
                details: errorData
            });
        }

    } catch (error) {
        console.error('Webhook proxy error:', error);
        return res.status(500).json({ 
            error: 'Internal server error while sending webhook',
            details: error.message 
        });
    }
}