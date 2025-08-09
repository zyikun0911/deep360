#!/usr/bin/env node
const http = require('http');

const host = process.env.HEALTHCHECK_HOST || '127.0.0.1';
const port = process.env.PORT || 3000;
const path = '/health';

function exitWith(code, msg) {
  if (msg) console.log(msg);
  process.exit(code);
}

const req = http.request({ host, port, path, method: 'GET', timeout: 3000 }, (res) => {
  if (res.statusCode >= 200 && res.statusCode < 300) {
    exitWith(0, 'healthy');
  } else {
    exitWith(1, 'unhealthy');
  }
});

req.on('timeout', () => {
  req.destroy();
  exitWith(1, 'timeout');
});

req.on('error', () => exitWith(1, 'error'));
req.end();