const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');
const url = require('url');

const config = getDefaultConfig(__dirname);

// Add a custom middleware that reads local files on demand.
// This allows the React Native app to fetch skill documentation (SKILL.md)
// files that live on the host machine's filesystem.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Handle /api/readfile?path=<absolutePath>
      if (req.url && req.url.startsWith('/api/readfile')) {
        const parsed = url.parse(req.url, true);
        const filePath = parsed.query && parsed.query.path;

        if (!filePath || typeof filePath !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing ?path= parameter' }));
          return;
        }

        // Security: only allow reading .md files
        if (!filePath.endsWith('.md')) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Only .md files are allowed' }));
          return;
        }

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          res.writeHead(200, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
          });
          res.end(content);
        } catch (err) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found', path: filePath }));
        }
        return;
      }

      // Pass through to the default Metro middleware
      middleware(req, res, next);
    };
  },
};

module.exports = config;

