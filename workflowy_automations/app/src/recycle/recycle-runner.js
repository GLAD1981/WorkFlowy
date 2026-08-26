const { selectUncompleteIds } = require('./select-uncomplete-ids');

function createRecycleRunner({ client, stateStore, now = () => new Date(), dateFor = date => date.toISOString().slice(0, 10) }) {
  let active = false;
  return {
    async run(reason) {
      if (active) throw new Error('Recycle already running');
      active = true;
      const finishedAt = now().toISOString();
      const date = dateFor(new Date(finishedAt));
      try {
        const nodeIds = selectUncompleteIds(await client.exportNodes());
        for (const id of nodeIds) await client.uncomplete(id);
        stateStore.recordSuccess({ date, count: nodeIds.length, finishedAt });
        return { date, count: nodeIds.length, reason };
      } catch {
        stateStore.recordFailure({ date, message: 'Recycle failed', finishedAt });
        throw new Error('Recycle failed');
      } finally { active = false; }
    }
  };
}

module.exports = { createRecycleRunner };
