// ImagiNAI - Vercel Serverless Function
// Proxies Pollinations.ai to avoid iOS Safari CORS restrictions
// Uses Node.js built-in https module - no npm dependencies needed

const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const {
    prompt = 'beautiful landscape',
    width = '768',
    height = '768', 
    seed,
    model = 'flux'
  } = req.query;

  const s = seed || String(Math.floor(Math.random() * 999999));
  const fullPrompt = encodeURIComponent(prompt);
  const path = `/prompt/${fullPrompt}?width=${width}&height=${height}&seed=${s}&nologo=true&enhance=true&model=${model}`;

  console.log('Fetching:', `https://image.pollinations.ai${path}`);

  return new Promise((resolve) => {
    const req2 = https.get({
      hostname: 'image.pollinations.ai',
      path: path,
      port: 443,
      headers: { 'User-Agent': 'Mozilla/5.0 ImagiNAI/1.0' }
    }, (upstream) => {
      console.log('Upstream status:', upstream.statusCode);
      
      // Handle redirects
      if (upstream.statusCode === 301 || upstream.statusCode === 302) {
        const location = upstream.headers['location'];
        console.log('Redirect to:', location);
        res.writeHead(302, { 'Location': location, 'Access-Control-Allow-Origin': '*' });
        res.end();
        resolve();
        return;
      }

      if (upstream.statusCode !== 200) {
        res.status(upstream.statusCode).json({
          error: 'Pollinations returned ' + upstream.statusCode,
          path: path
        });
        resolve();
        return;
      }

      const ct = upstream.headers['content-type'] || 'image/jpeg';
      res.writeHead(200, {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'X-Proxied-By': 'ImagiNAI'
      });

      upstream.pipe(res);
      res.on('finish', resolve);
      res.on('error', resolve);
    });

    req2.setTimeout(55000, () => {
      req2.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Timeout: Pollinations took too long' });
      }
      resolve();
    });

    req2.on('error', (err) => {
      console.error('Request error:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
      resolve();
    });
  });
};
