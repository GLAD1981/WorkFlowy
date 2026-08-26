FROM node:24-alpine

LABEL \
  io.hass.version="1.0.0" \
  io.hass.type="app" \
  io.hass.arch="amd64|aarch64"

COPY app /app

CMD ["node", "/app/run.js"]
