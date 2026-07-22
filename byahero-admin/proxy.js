const http = require('http');
const https = require('https');

const PORT = 3000;
const TARGET_HOST = 'byahero.alwaysdata.net';

const server = http.createServer((req, res) => {
  // Add CORS headers to all responses
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,accept,authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const isApi = req.url.startsWith('/api');
  const targetHost = isApi ? TARGET_HOST : 'localhost';
  const targetPort = isApi ? 443 : 8081;
  const targetProtocol = isApi ? https : http;

  console.log(`[Proxy] Incoming request: ${req.method} ${req.url} -> Forwarding to ${isApi ? 'API' : 'Metro'} (${targetHost}:${targetPort})`);

  const forwardHeaders = { ...req.headers };
  if (isApi) {
    delete forwardHeaders.origin;
    delete forwardHeaders.referer;
    forwardHeaders.host = TARGET_HOST;
  } else {
    forwardHeaders.host = `localhost:${targetPort}`;
  }

  // Forward the request to the target host
  const options = {
    hostname: targetHost,
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: forwardHeaders
  };

  const proxyReq = targetProtocol.request(options, (proxyRes) => {
    console.log(`[Proxy] Response from ${targetHost}:${targetPort} for ${req.url}: Status ${proxyRes.statusCode}`);
    // Copy headers from target response, but don't overwrite our CORS headers
    Object.keys(proxyRes.headers).forEach(key => {
      if (!key.toLowerCase().startsWith('access-control-')) {
        res.setHeader(key, proxyRes.headers[key]);
      }
    });
    res.writeHead(proxyRes.statusCode);
    proxyRes.pipe(res, { end: true });
  });

  req.pipe(proxyReq, { end: true });
  
  proxyReq.on('error', (e) => {
    console.error('Proxy Error:', e);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end(`Proxy Error: ${e.message}`);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Local CORS Proxy running at http://localhost:${PORT}`);
  console.log(`Forwarding /api requests to https://${TARGET_HOST}`);
  console.log(`Forwarding other requests to Metro at http://localhost:8081`);
});
