// Vercel Serverless Function (Node.js) — proxies Pollinations.ai
// File: api/image.js

module.exports = async function handler(req, res) {
  const { prompt = 'beautiful landscape', width = '1024', height = '1024', seed, model = 'flux' } = req.query;
  const s = seed || String(Math.floor(Math.random() * 999999));
  const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${s}&nologo=true&enhance=true&model=${model}`;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const fetch = (await import('node-fetch')).default;
    const upstream = await fetch(polUrl, {
      headers: { 'User-Agent': 'ImagiNAI/1.0' },
      timeout: 45000
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Upstream error', status: upstream.status });
      return;
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    upstream.body.pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
