/**
 * Vercel Serverless Function: proxy server-to-server tới VNPT SmartCA (tránh CORS / chặn header Origin).
 * Được gọi qua rewrite trong vercel.json:
 *   /api/vnpt/*      -> /api/vnpt-proxy?t=prod&p=*
 *   /api/vnpt-uat/*  -> /api/vnpt-proxy?t=uat&p=*
 */
const TARGETS = {
  prod: 'https://gwsca.vnpt.vn',
  uat: 'https://rmgateway.vnptit.vn',
};

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body;
    return JSON.stringify(req.body);
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  try {
    const t = String(req.query.t || 'prod');
    const base = TARGETS[t] || TARGETS.prod;

    let p = '';
    if (Array.isArray(req.query.match)) {
      p = req.query.match.join('/');
    } else if (req.query.match) {
      p = String(req.query.match);
    } else if (Array.isArray(req.query.p)) {
      p = req.query.p.join('/');
    } else if (req.query.p) {
      p = String(req.query.p);
    }

    const matchQueryP = req.url.match(/[?&]p=([^&]+)/);
    if (matchQueryP) {
      const decoded = decodeURIComponent(matchQueryP[1]);
      if (decoded.length > p.length) p = decoded;
    }
    const directPathMatch = req.url.match(/\/api\/vnpt(?:-uat)?\/(.+?)(?:\?|$)/);
    if (directPathMatch) {
      const decoded = decodeURIComponent(directPathMatch[1]);
      if (decoded.length > p.length) p = decoded;
    }

    p = p.replace(/^\/+/, '');
    const url = `${base}/${p}`;

    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const body = hasBody ? await readBody(req) : undefined;

    const reqHeaders = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      Accept: 'application/json',
    };
    if (req.headers['authorization']) {
      reqHeaders['Authorization'] = req.headers['authorization'];
    }

    const upstream = await fetch(url, {
      method: req.method,
      headers: reqHeaders,
      body: hasBody && body && body.length !== 0 ? body : undefined,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ status_code: 502, message: `Proxy error: ${e && e.message ? e.message : e}` });
  }
};

