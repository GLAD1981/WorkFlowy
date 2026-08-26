function createWorkFlowyClient({ apiKey, fetchImpl = fetch }) {
  async function request(path, options = {}) {
    const response = await fetchImpl(`https://workflowy.com${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${apiKey}`, ...options.headers }
    });

    if (!response.ok) throw new Error(`WorkFlowy request failed: ${response.status}`);
    return response.status === 204 ? undefined : response.json();
  }

  return {
    async exportNodes() { return (await request('/api/v1/nodes-export')).nodes; },
    async uncomplete(id) { await request(`/api/v1/nodes/${encodeURIComponent(id)}/uncomplete`, { method: 'POST' }); }
  };
}

module.exports = { createWorkFlowyClient };
