// Vercel API route: /api/image
// Proxies Pollinations.ai requests server-side, returns image as response
// This bypasses all CORS/CSP issues on iOS Safari

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const prompt = url.searchParams.get('prompt') || 'beautiful landscape';
  const width  = url.searchParams.get('width')  || '1024';
  const height = url.searchParams.get('height') || '1024';
  const seed   = url.searchParams.get('seed')   || String(Math.floor(Math.random()*999999));
  const model  = url.searchParams.get('model')  || 'flux';

  const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true&model=${model}`;

  try {
    const res = await fetch(polUrl, {
      headers: { 'User-Agent': 'ImagiNAI/1.0' },
      signal: AbortSignal.timeout(45000)
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Pollinations error', status: res.status }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const imageBuffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
