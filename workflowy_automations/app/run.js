const { readFileSync } = require('node:fs');
const { createAddOnEnv } = require('./src/recycle/home-assistant-env');
const { createApplication } = require('./src/recycle/main');

const options = JSON.parse(readFileSync('/data/options.json', 'utf8'));

createApplication({ env: createAddOnEnv(options) }).start().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
