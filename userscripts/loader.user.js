// ==UserScript==
// @name         Personal script loader
// @namespace    personal-script-loader
// @version      1.1.2
// @match        *://*/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.addValueChangeListener
// @grant        GM.setClipboard
// @grant        GM.xmlHttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_setClipboard
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
  const modules = {"src/script-loader/manifest.js":"function matchesUrl(pattern, href) {\n  const escaped = pattern.replace(/[.+?^${}()|[\\]\\\\]/g, '\\\\$&');\n  return new RegExp(`^${escaped.replaceAll('*', '.*')}$`).test(href);\n}\n\nfunction isValidScript(entry) {\n  if (!entry || typeof entry !== 'object') return false;\n  if (!['id', 'version', 'url', 'updatedAt'].every(key => typeof entry[key] === 'string' && entry[key])) return false;\n  if (entry.kind !== undefined && !['module', 'userscript'].includes(entry.kind)) return false;\n  if (!Array.isArray(entry.matches) || entry.matches.length === 0 || !entry.matches.every(match => typeof match === 'string')) return false;\n  if (!Array.isArray(entry.connect) || !entry.connect.every(host => typeof host === 'string' && host)) return false;\n\n  try {\n    if (new URL(entry.url).protocol !== 'https:') return false;\n    if (Number.isNaN(Date.parse(entry.updatedAt))) return false;\n    return entry.connect.every(host => {\n      const url = new URL(`http://${host}`);\n      return url.host === host && url.pathname === '/' && !url.username && !url.password;\n    });\n  } catch {\n    return false;\n  }\n}\n\nfunction parseManifest(manifest) {\n  if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.scripts)) {\n    throw new Error('Invalid manifest');\n  }\n  if (!manifest.scripts.every(isValidScript)) {\n    throw new Error('Invalid script entry');\n  }\n  return manifest;\n}\n\nfunction selectScripts(manifest, href) {\n  return manifest.scripts.filter(script => script.matches.some(pattern => matchesUrl(pattern, href)));\n}\n\nmodule.exports = { parseManifest, selectScripts };\n","src/script-loader/runtime.js":"const { parseManifest, selectScripts } = require('./manifest');\n\nconst MANIFEST_CACHE_DURATION = 15 * 60 * 1_000;\n\nfunction createRuntime({ getValue, setValue, request, now = Date.now, logger = console }) {\n  async function loadManifest(registryUrl) {\n    const key = `registry:${registryUrl}`;\n    const cached = await getValue(key);\n\n    if (cached?.expiresAt >= now()) {\n      return cached.manifest;\n    }\n\n    try {\n      const manifest = parseManifest(JSON.parse(await request({ url: registryUrl, method: 'GET' })));\n      await setValue(key, { manifest, expiresAt: now() + MANIFEST_CACHE_DURATION });\n      return manifest;\n    } catch {\n      if (cached?.manifest) return cached.manifest;\n      logger.error('Script registry is unavailable');\n      return null;\n    }\n  }\n\n  async function loadSource(script) {\n    const key = `script:${script.id}:${script.version}`;\n    const cached = await getValue(key);\n    if (cached?.source) return cached.source;\n\n    try {\n      const source = await request({ url: script.url, method: 'GET' });\n      await setValue(key, { source });\n      return source;\n    } catch {\n      logger.error(`Unable to load script: ${script.id}`);\n      return null;\n    }\n  }\n\n  return {\n    async loadApplicableScripts({ registryUrl, href }) {\n      const manifest = await loadManifest(registryUrl);\n      if (!manifest) return [];\n\n      const loaded = await Promise.all(selectScripts(manifest, href).map(async script => {\n        const source = await loadSource(script);\n        return source ? {\n          id: script.id,\n          version: script.version,\n          kind: script.kind ?? 'module',\n          source,\n          connect: script.connect\n        } : null;\n      }));\n\n      return loaded.filter(Boolean);\n    }\n  };\n}\n\nmodule.exports = { createRuntime };\n","userscripts/loader.entry.js":"const { createRuntime } = require('../src/script-loader/runtime');\n\nconst REGISTRY_URL = 'https://raw.githubusercontent.com/GLAD1981/WorkFlowy/main/userscripts/registry.json';\n\nfunction request({ url, method = 'GET', headers }) {\n  return new Promise((resolve, reject) => {\n    GM.xmlHttpRequest({\n      url,\n      method,\n      headers,\n      onload: response => {\n        if (response.status >= 200 && response.status < 300) resolve(response.responseText);\n        else reject(new Error('Request failed'));\n      },\n      onerror: () => reject(new Error('Request failed'))\n    });\n  });\n}\n\nfunction createModuleApi(script) {\n  const prefix = `${script.id}:`;\n  return {\n    log: message => console.info(`[${script.id}] ${message}`),\n    get: key => GM.getValue(`${prefix}${key}`),\n    set: (key, value) => GM.setValue(`${prefix}${key}`, value),\n    request: async ({ url, method = 'GET', headers }) => {\n      if (!script.connect.includes(new URL(url).host)) throw new Error('Host is not allowed');\n      return request({ url, method, headers });\n    }\n  };\n}\n\nfunction runLegacyUserscript(source) {\n  const apiNames = [\n    'GM_getValue',\n    'GM_setValue',\n    'GM_deleteValue',\n    'GM_addValueChangeListener',\n    'GM_setClipboard'\n  ];\n  const apiValues = [\n    (...args) => GM.getValue(...args),\n    (...args) => GM.setValue(...args),\n    (...args) => GM.deleteValue(...args),\n    (...args) => GM.addValueChangeListener(...args),\n    (...args) => GM.setClipboard(...args)\n  ];\n  new Function(...apiNames, source)(...apiValues);\n}\n\nasync function start() {\n  const runtime = createRuntime({\n    getValue: GM.getValue,\n    setValue: GM.setValue,\n    request,\n    logger: console\n  });\n  const scripts = await runtime.loadApplicableScripts({ registryUrl: REGISTRY_URL, href: location.href });\n  for (const script of scripts) {\n    if (script.kind === 'userscript') {\n      runLegacyUserscript(script.source);\n      continue;\n    }\n    const run = new Function(`return (${script.source})`)();\n    await run(createModuleApi(script));\n  }\n}\n\nstart().catch(error => console.error('Tampermonkey loader failed', error));\n"};
  const cache = {};
  function resolve(from, request) {
    const base = from.split('/').slice(0, -1);
    const parts = request.split('/');
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') base.pop(); else base.push(part);
    }
    const result = base.join('/');
    return result.endsWith('.js') ? result : result + '.js';
  }
  function load(id) {
    if (cache[id]) return cache[id].exports;
    const module = { exports: {} };
    cache[id] = module;
    new Function('require', 'module', 'exports', modules[id])((request) => load(resolve(id, request)), module, module.exports);
    return module.exports;
  }
  load('userscripts/loader.entry.js');
}());
