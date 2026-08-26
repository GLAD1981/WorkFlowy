function createAddOnEnv({ workflowy_api_key, manual_trigger_token }) {
  return {
    WORKFLOWY_API_KEY: workflowy_api_key,
    MANUAL_TRIGGER_TOKEN: manual_trigger_token,
    STATE_DB_PATH: '/data/recycle.sqlite',
    PORT: '3210',
    SERVICE_HOST: '0.0.0.0'
  };
}

module.exports = { createAddOnEnv };
