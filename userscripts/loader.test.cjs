const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createDocument() {
  const body = { children: [], appendChild(element) { this.children.push(element); } };
  const visit = (element, predicate) => predicate(element) || (element.children || []).some(child => visit(child, predicate));
  return {
    body,
    createElement(tagName) {
      return {
        tagName, children: [], style: {}, attributes: {}, textContent: '', value: '', disabled: false,
        appendChild(element) { this.children.push(element); },
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener() {}
      };
    },
    querySelector(selector) {
      const attribute = selector.match(/^\[([^\]]+)\]$/)?.[1];
      return attribute && visit(body, element => Object.hasOwn(element.attributes || {}, attribute)) ? {} : null;
    }
  };
}

function loadInstaller(context) {
  const source = fs.readFileSync(path.join(__dirname, 'loader.user.js'), 'utf8');
  const start = source.indexOf('async function installWorkflowyRecycle()');
  const end = source.indexOf('\nif (location.hostname === \'workflowy.com\')', start);
  return vm.runInNewContext(`${source.slice(start, end)}; installWorkflowyRecycle;`, context);
}

test('routes a new Inbox child through its parent with visible expanded ancestry', async () => {
  const document = createDocument();
  const intervals = [];
  const unsafeWindow = {};
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-09-02T12:00:00Z'])); }
  }
  const context = {
    document,
    unsafeWindow,
    GM: { getValue: async () => ({}), setValue: async () => {} },
    setTimeout: () => {},
    setInterval: callback => { intervals.push(callback); },
    Date: FixedDate,
    Intl,
    console
  };

  const children = [];
  const item = (id, name, itemChildren = []) => ({
    id, name, children: itemChildren,
    getId() { return this.id; },
    getName() { return this.name; },
    getChildren() { return this.children; },
    getParent() { return this.parent; }
  });
  const inbox = item('3deca3d27d28', '🎥 Inbox', children);
  const history = item('history', '🎥 history', [inbox]);
  inbox.parent = history;
  const items = new Map([[inbox.id, inbox], [history.id, history]]);
  const moves = [];
  const expanded = [];
  const selections = [];
  let sequence = 0;
  context.WF = {
    getItemById: id => items.get(id),
    createItem(parent, rank) {
      const folder = item(`folder-${sequence++}`, '');
      folder.parent = parent;
      parent.children.splice(rank, 0, folder);
      items.set(folder.id, folder);
      return folder;
    },
    setItemName(node, name) { node.name = name; },
    moveItems(nodes, parent) {
      moves.push({ nodes, parent });
      nodes.forEach(node => { node.parent = parent; });
    },
    expandItem(node) { expanded.push(node); },
    setSelection(nodes) { selections.push(nodes); }
  };

  const installer = loadInstaller(context);
  await installer();
  assert.equal(intervals.length, 1, 'the router must poll the native WorkFlowy tree');

  await intervals[0]();
  const newFilm = item('new-film', 'Film de test');
  children.push(newFilm);
  await intervals[0]();

  assert.equal(moves.length, 1);
  assert.equal(moves[0].nodes[0], newFilm);
  const yearFolder = history.getChildren().find(node => node.getName() === '🎥 [ 2026 ]');
  const monthFolder = yearFolder.getChildren().find(node => node.getName() === '🎥 [ 09/2026 ]');
  assert.equal(moves[0].parent, monthFolder);
  assert.deepEqual(expanded, [history, yearFolder, monthFolder]);
  assert.equal(selections.length, 1);
  assert.equal(selections[0][0], newFilm);
});
