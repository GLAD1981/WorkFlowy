const { timingSafeEqual } = require('node:crypto');
const { createServer: createHttpServer } = require('node:http');

function isAuthorized(header, token) {
  const expected = Buffer.from(`Bearer ${token}`);
  const received = Buffer.from(header ?? '');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function createServer({ runner, stateStore, manualToken }) {
  return createHttpServer(async (request, response) => {
    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, stateStore.getStatus() ?? { status: 'never-run' });
      return;
    }

    if (request.method === 'POST' && request.url === '/recycle') {
      if (!isAuthorized(request.headers.authorization, manualToken)) {
        sendJson(response, 401, { error: 'Unauthorized' });
        return;
      }

      try {
        sendJson(response, 200, await runner.run('manual'));
      } catch (error) {
        const isActiveRun = error.message === 'Recycle already running';
        sendJson(response, isActiveRun ? 409 : 500, {
          error: isActiveRun ? 'Recycle already running' : 'Recycle failed',
        });
      }
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  });
}

module.exports = { createServer };
