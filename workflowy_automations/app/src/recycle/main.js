const { createRecycleRunner } = require('./recycle-runner');
const { createStateStore } = require('./state-store');
const { createWorkFlowyClient } = require('./workflowy-client');
const { createServer } = require('./server');
const { parisDate, shouldCatchUp, millisecondsUntilNextFiveParis } = require('./schedule');

function listen(server, port, host) {
  return new Promise(resolve => server.listen(port, host, resolve));
}

function createApplication({
  env = process.env,
  now = () => new Date(),
  setTimeoutImpl = setTimeout,
  logger = console,
  client,
  stateStore,
  runner,
  server
} = {}) {
  for (const name of ['WORKFLOWY_API_KEY', 'MANUAL_TRIGGER_TOKEN', 'STATE_DB_PATH']) {
    if (!env[name]) throw new Error(`Missing required environment variable: ${name}`);
  }

  const activeClient = client ?? createWorkFlowyClient({ apiKey: env.WORKFLOWY_API_KEY });
  const activeStore = stateStore ?? createStateStore(env.STATE_DB_PATH);
  const activeRunner = runner ?? createRecycleRunner({
    client: activeClient,
    stateStore: activeStore,
    now,
    dateFor: parisDate
  });
  const activeServer = server ?? createServer({
    runner: activeRunner,
    stateStore: activeStore,
    manualToken: env.MANUAL_TRIGGER_TOKEN
  });
  const port = Number(env.PORT ?? 3210);
  const host = env.SERVICE_HOST ?? '0.0.0.0';

  function scheduleNext() {
    const delay = millisecondsUntilNextFiveParis(now());
    setTimeoutImpl(async () => {
      try {
        await activeRunner.run('scheduled');
      } catch {
        logger.error('Scheduled recycle failed');
      } finally {
        scheduleNext();
      }
    }, delay);
  }

  return {
    async start() {
      await listen(activeServer, port, host);
      if (shouldCatchUp({ now: now(), lastSuccessDate: activeStore.getLastSuccessDate() })) {
        await activeRunner.run('catch-up');
      }
      scheduleNext();
      return activeServer;
    }
  };
}

module.exports = { createApplication };
