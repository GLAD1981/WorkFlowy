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

test('routes a new Inbox child from the native WorkFlowy tree without a DOM mutation', async () => {
  const document = createDocument();
  const intervals = [];
  const unsafeWindow = {};
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-09-02T12:00:00Z'])); }
  }
  const installer = loadInstaller({
    document,
    unsafeWindow,
    GM: { getValue: async () => ({}), setValue: async () => {} },
    setTimeout: () => {},
    setInterval: callback => { intervals.push(callback); },
    Date: FixedDate,
    Intl,
    console
  });

  await installer();
  assert.equal(intervals.length, 1, 'the router must poll the native WorkFlowy tree');

  const children = [];
  const item = (id, name, itemChildren = []) => ({
    id, name, children: itemChildren,
    getId() { return this.id; },
    getName() { return this.name; },
    getChildren() { return this.children; }
  });
  const inbox = item('3deca3d27d28', '🎥 Inbox', children);
  const history = item('history', '🎥 history');
  const films = item('1e0b2fc86478', '🎥 films #d', [history]);
  const items = new Map([[inbox.id, inbox], [history.id, history], [films.id, films]]);
  const moves = [];
  let sequence = 0;
  unsafeWindow.WF = {
    getItemById: id => items.get(id),
    createItem(parent, rank) {
      const folder = item(`folder-${sequence++}`, '');
      parent.children.splice(rank, 0, folder);
      items.set(folder.id, folder);
      return folder;
    },
    setItemName(node, name) { node.name = name; },
    moveItems(nodes, parent) { moves.push({ nodes, parent }); }
  };

  await intervals[0]();
  const newFilm = item('new-film', 'Film de test');
  children.push(newFilm);
  await intervals[0]();

  assert.equal(moves.length, 1);
  assert.equal(moves[0].nodes[0], newFilm);
  assert.equal(moves[0].parent, history.children[0].children[0]);
  assert.equal(history.children[0].getName(), '🎥 [ 2026 ]');
  assert.equal(history.children[0].children[0].getName(), '🎥 [ 09/2026 ]');
});
