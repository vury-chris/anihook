export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(200).end();
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { webhookUrl, payload, useComponents } = req.body;

        if (!webhookUrl || !payload) {
            return res.status(400).json({ error: 'Missing webhookUrl or payload' });
        }

        const webhookPattern = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
        if (!webhookPattern.test(webhookUrl)) {
            return res.status(400).json({ error: 'Invalid Discord webhook URL format' });
        }

        let finalUrl = webhookUrl;
        if (useComponents && payload.components && payload.components.length > 0) {
            finalUrl += '?wait=true';
        }

        console.log('Sending to:', finalUrl);
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(finalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'AniHook-Manager/2.0'
            },
            body: JSON.stringify(payload)
        });

        console.log('Discord response status:', response.status);

        if (response.ok) {
            let responseData = null;
            try {
                responseData = await response.json();
            } catch (e) {
                // No response body is normal for some webhook calls
            }

            return res.status(200).json({ 
                success: true, 
                message: 'Message sent successfully',
                status: response.status,
                data: responseData
            });
        } else {
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