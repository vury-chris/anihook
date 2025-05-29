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
        const { imageData, filename } = req.body;

        if (!imageData || !filename) {
            return res.status(400).json({ error: 'Missing image data or filename' });
        }

        // Remove data URL prefix if present
        const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
        
        // Upload to Imgur (free anonymous upload)
        const imgurResponse = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': 'Client-ID 546c25a59c58ad7',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64Data,
                type: 'base64',
                name: filename,
                title: filename
            })
        });

        if (!imgurResponse.ok) {
            throw new Error(`Imgur upload failed: ${imgurResponse.status}`);
        }

        const imgurData = await imgurResponse.json();
        
        if (!imgurData.success) {
            throw new Error('Imgur upload failed: ' + (imgurData.data?.error || 'Unknown error'));
        }

        return res.status(200).json({
            success: true,
            url: imgurData.data.link,
            deleteHash: imgurData.data.deletehash
        });

    } catch (error) {
        console.error('Image upload error:', error);
        
        // Fallback: return optimized data URL for testing
        return res.status(200).json({
            success: true,
            url: req.body.imageData,
            fallback: true,
            warning: 'Using data URL fallback - image may not display properly in Discord'
        });
    }
}