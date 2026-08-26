const { hasExactTag } = require('./exact-tag');

function selectUncompleteIds(nodes, tag = '#d') {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const selected = new Set();

  for (const node of nodes) {
    if (!node.completed || !hasExactTag(node.name, tag)) continue;

    for (let current = node; current?.completed; current = byId.get(current.parent_id)) {
      selected.add(current.id);
    }
  }

  return [...selected];
}

module.exports = { selectUncompleteIds };
