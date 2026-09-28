const https = require('https');

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

function fetchSvg(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`SVG request failed with HTTP ${res.statusCode}: ${url}`));
        return;
      }

      let body = '';
      let responseBytes = 0;
      res.setEncoding('utf8');
      res.on('data', chunk => {
        responseBytes += Buffer.byteLength(chunk, 'utf8');
        if (responseBytes > MAX_RESPONSE_BYTES) {
          request.destroy(new Error(`SVG response exceeded ${MAX_RESPONSE_BYTES} bytes: ${url}`));
          return;
        }
        body += chunk;
      });
      res.on('end', () => {
        const document = body.trim().replace(/^<\?xml[^>]*\?>\s*/i, '');
        if (!/^<svg\b[\s\S]*<\/svg>$/i.test(document)) {
          reject(new Error(`Response was not a valid SVG document: ${url}`));
          return;
        }
        resolve(body);
      });
      res.on('error', reject);
      res.on('aborted', () => reject(new Error(`SVG response ended unexpectedly: ${url}`)));
    });

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`SVG request timed out after ${REQUEST_TIMEOUT_MS} ms: ${url}`));
    });
    request.on('error', reject);
  });
}

module.exports = fetchSvg;
