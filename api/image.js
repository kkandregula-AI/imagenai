// Vercel Serverless Function — proxies Pollinations.ai images
// Deployed at: /api/image?prompt=...&width=...&height=...&seed=...

const https = require('https');
const http = require('http');

module.exports = async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { prompt = 'beautiful landscape', width = '1024', height = '1024', seed, model = 'flux' } = req.query;
  const s = seed || String(Math.floor(Math.random() * 999999));
  
  const encodedPrompt = encodeURIComponent(prompt);
  const polPath = `/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${s}&nologo=true&enhance=true&model=${model}`;
  
  const options = {
    hostname: 'image.pollinations.ai',
    port: 443,
    path: polPath,
    method: 'GET',
    headers: { 'User-Agent': 'ImagiNAI-Proxy/1.0' },
    timeout: 50000
  };

  return new Promise((resolve) => {
    const request = https.request(options, (upstream) => {
      if (upstream.statusCode !== 200) {
        res.status(upstream.statusCode || 500).json({ 
          error: 'Upstream error', 
          status: upstream.statusCode,
          url: `https://image.pollinations.ai${polPath}`
        });
        resolve();
        return;
      }

      const contentType = upstream.headers['content-type'] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Proxy', 'ImagiNAI');
      
      upstream.pipe(res);
      upstream.on('end', resolve);
      upstream.on('error', (e) => {
        if (!res.headersSent) res.status(500).json({ error: e.message });
        resolve();
      });
    });

    request.on('timeout', () => {
      request.destroy();
      if (!res.headersSent) res.status(504).json({ error: 'Pollinations timeout after 50s' });
      resolve();
    });

    request.on('error', (e) => {
      if (!res.headersSent) res.status(500).json({ error: e.message });
      resolve();
    });

    request.end();
  });
};
