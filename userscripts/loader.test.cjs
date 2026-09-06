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
        addEventListener(name, callback) { this.listeners = this.listeners || {}; this.listeners[name] = callback; }
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

function loadTodoInstaller(context) {
  const source = fs.readFileSync(path.join(__dirname, 'loader.user.js'), 'utf8');
  const start = source.indexOf('function installTodoExporter()');
  const end = source.indexOf("\nif (location.hostname === 'to-do.live.com')", start);
  return vm.runInNewContext(`${source.slice(start, end)}; installTodoExporter;`, context);
}

test('routes a new simple history child without re-routing folders it creates', async () => {
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
  const history = item('cb6bcd3bf1ba', '🎥 history', children);
  const previousYear = item('old-year', '🎥 [ 2025 ]');
  previousYear.parent = history;
  children.push(previousYear);
  const items = new Map([[history.id, history]]);
  const moves = [];
  const expanded = [];
  const selections = [];
  const edited = [];
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
    setSelection(nodes) { selections.push(nodes); },
    editItemName(node) { edited.push(node); }
  };

  const installer = loadInstaller(context);
  await installer();
  const menu = document.body.children.find(element => element.attributes['data-workflowy-recycle-menu'] !== undefined);
  assert.ok(menu);
  assert.equal(menu.style.flexDirection, 'column');
  assert.equal(menu.style.border, '0');
  const buttons = menu.children.flatMap(section => section.children).filter(element => element.tagName === 'button');
  assert.deepEqual(buttons.map(button => button.textContent), ['Recycle']);
  assert.equal(buttons[0].style.border, '0');
  assert.equal(intervals.length, 1, 'the router must poll the native WorkFlowy tree');

  await intervals[0]();
  const newFilm = item('new-film', 'Film de test');
  newFilm.parent = history;
  children.push(newFilm);
  await intervals[0]();

  assert.equal(moves.length, 1);
  assert.equal(moves[0].nodes[0], newFilm);
  const yearFolder = history.getChildren().find(node => node.getName() === '🎥 [ 2026 ]');
  const monthFolder = yearFolder.getChildren().find(node => node.getName() === '🎥 [ 09/2026 ]');
  assert.equal(moves[0].parent, monthFolder);
  assert.equal(history.getChildren()[0], yearFolder);
  assert.equal(yearFolder.getChildren()[0], monthFolder);
  assert.deepEqual(expanded, [history, yearFolder, monthFolder]);
  assert.equal(selections.length, 0);
  assert.deepEqual(edited, [newFilm]);
  await intervals[0]();
  assert.equal(moves.length, 1);
});

test('writes tomorrow Paris weather to the configured WorkFlowy note', async () => {
  const document = createDocument();
  const intervals = [];
  const requests = [];
  const notes = [];
  const weatherNode = { getId: () => '5989c44498ec', getName: () => 'je regarde la météo', getChildren: () => [] };
  const context = {
    document,
    unsafeWindow: {},
    GM: {
      xmlHttpRequest: options => {
        requests.push(options.url);
        options.onload({ status: 200, responseText: JSON.stringify({ daily: {
          time: ['2026-09-06', '2026-09-07'],
          temperature_2m_max: [21, 24],
          temperature_2m_min: [12, 14],
          precipitation_probability_max: [10, 35]
        } }) });
      }
    },
    setTimeout: () => {},
    setInterval: callback => { intervals.push(callback); },
    Date: class FixedDate extends Date {
      constructor(...args) { super(...(args.length ? args : ['2026-09-06T12:00:00Z'])); }
    },
    Intl,
    console
  };
  context.WF = {
    getItemById: id => id === weatherNode.getId() ? weatherNode : null,
    setItemNote: (node, note) => notes.push({ node, note })
  };

  const installer = loadInstaller(context);
  await installer();
  await intervals[0]();

  assert.equal(requests.length, 1);
  assert.match(requests[0], /latitude=48\.8566/);
  assert.match(requests[0], /longitude=2\.3522/);
  assert.match(requests[0], /timezone=Europe%2FParis/);
  assert.deepEqual(notes, [{ node: weatherNode, note: 'demain lundi : maximale 24 °C, minimale 14 °C, pluie 35 %' }]);
});

test('copies visible Microsoft To Do items as WorkFlowy lines', () => {
  const elements = [];
  const task = textContent => ({ textContent, querySelector: () => null });
  const document = {
    body: { appendChild: element => elements.push(element) },
    querySelector: () => null,
    querySelectorAll: () => [task('Lait'), task('Pain'), task('Lait')],
    createElement: tagName => ({
      tagName, style: {}, attributes: {}, children: [], textContent: '',
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, callback) { this.listeners = this.listeners || {}; this.listeners[name] = callback; },
      appendChild(element) { this.children.push(element); }
    })
  };
  let clipboard = '';
  const context = { document, GM_setClipboard: (value, type) => { clipboard = `${type}:${value}`; }, setTimeout: () => {} };
  const installer = loadTodoInstaller(context);
  installer();
  const button = elements.find(element => element.attributes['data-workflowy-todo-export'] !== undefined);
  button.listeners.click();
  assert.equal(clipboard, 'text:Lait\nPain');
});

test('recycles in app mode when the native root is an object', async () => {
  const document = createDocument();
  const intervals = [];
  const completed = [];
  const leaf = {
    getId: () => 'done-item',
    getName: () => 'À recycler #d',
    getChildren: () => [],
    isCompleted: () => true,
    data: { id: 'done-item' }
  };
  const root = {
    getId: () => 'root', getName: () => 'Root', getChildren: () => [leaf],
    isCompleted: () => false, data: { id: 'root' }
  };
  const context = {
    document, unsafeWindow: {},
    GM: {}, setTimeout: () => {}, setInterval: callback => intervals.push(callback), Intl, Date, console
  };
  context.WF = {
    rootItem: root,
    getItemById: () => null,
    completeItem: item => completed.push(item)
  };

  const installer = loadInstaller(context);
  await installer();
  const menu = document.body.children.find(element => element.attributes['data-workflowy-recycle-menu'] !== undefined);
  const recycle = menu.children.flatMap(section => section.children).find(element => element.textContent === 'Recycle');
  await recycle.listeners.click();
  assert.deepEqual(completed, [leaf]);
});
