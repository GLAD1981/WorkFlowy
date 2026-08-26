async api => {
  if (document.querySelector('[data-workflowy-recycle-menu]')) return;

  const menu = document.createElement('div');
  menu.setAttribute('data-workflowy-recycle-menu', '');
  Object.assign(menu.style, {
    position: 'fixed', top: '12px', right: '12px', zIndex: '2147483647',
    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px',
    fontFamily: "'Segoe UI', sans-serif", color: '#000', background: '#fff',
    border: '1px solid #bfbfbf', borderRadius: '0'
  });

  const button = document.createElement('button');
  button.textContent = 'Recycle';
  Object.assign(button.style, {
    padding: '4px 10px', font: 'inherit', color: 'inherit', background: '#fff',
    border: '1px solid #bfbfbf', borderRadius: '0', cursor: 'pointer'
  });

  const configureButton = document.createElement('button');
  configureButton.textContent = 'Configurer';
  Object.assign(configureButton.style, {
    padding: '4px 10px', font: 'inherit', color: 'inherit', background: '#fff',
    border: '1px solid #bfbfbf', borderRadius: '0', cursor: 'pointer'
  });

  const status = document.createElement('span');
  status.setAttribute('aria-live', 'polite');
  const configPanel = document.createElement('div');
  configPanel.setAttribute('data-workflowy-recycle-config', '');
  Object.assign(configPanel.style, {
    position: 'absolute', top: '100%', right: '0', display: 'none', gap: '6px',
    marginTop: '4px', padding: '6px', background: '#fff', border: '1px solid #bfbfbf'
  });

  const endpointInput = document.createElement('input');
  endpointInput.setAttribute('name', 'endpoint');
  endpointInput.setAttribute('placeholder', 'URL du service');
  Object.assign(endpointInput.style, { font: 'inherit', border: '1px solid #bfbfbf', borderRadius: '0' });

  const tokenInput = document.createElement('input');
  tokenInput.setAttribute('name', 'token');
  tokenInput.setAttribute('type', 'password');
  tokenInput.setAttribute('placeholder', 'Jeton manuel');
  Object.assign(tokenInput.style, { font: 'inherit', border: '1px solid #bfbfbf', borderRadius: '0' });

  const saveButton = document.createElement('button');
  saveButton.textContent = 'Enregistrer';
  Object.assign(saveButton.style, {
    padding: '4px 10px', font: 'inherit', color: 'inherit', background: '#fff',
    border: '1px solid #bfbfbf', borderRadius: '0', cursor: 'pointer'
  });

  configPanel.appendChild(endpointInput);
  configPanel.appendChild(tokenInput);
  configPanel.appendChild(saveButton);
  menu.appendChild(button);
  menu.appendChild(configureButton);
  menu.appendChild(status);
  menu.appendChild(configPanel);
  document.body.appendChild(menu);

  configureButton.addEventListener('click', async () => {
    const config = await api.get('workflowy-recycle:config');
    endpointInput.value = config?.endpoint ?? '';
    tokenInput.value = '';
    configPanel.style.display = 'flex';
  });

  saveButton.addEventListener('click', async () => {
    const existing = await api.get('workflowy-recycle:config');
    const config = { endpoint: endpointInput.value.trim(), token: tokenInput.value || existing?.token };
    if (!config.endpoint || !config.token) {
      status.textContent = 'Configuration requise';
      return;
    }
    await api.set('workflowy-recycle:config', config);
    tokenInput.value = '';
    configPanel.style.display = 'none';
    status.textContent = 'Configuration enregistrée';
  });

  button.addEventListener('click', async () => {
    const config = await api.get('workflowy-recycle:config');
    if (!config?.endpoint || !config?.token) {
      status.textContent = 'Configuration requise';
      return;
    }

    button.disabled = true;
    button.style.background = '#F0F0F0';
    button.style.borderBottom = '2px solid #1677FF';
    status.textContent = 'Recyclage…';

    try {
      const result = JSON.parse(await api.request({
        url: config.endpoint,
        method: 'POST',
        headers: { Authorization: `Bearer ${config.token}` }
      }));
      status.textContent = `${result.count} nœud${result.count === 1 ? '' : 's'} recyclé${result.count === 1 ? '' : 's'}`;
    } catch {
      status.textContent = 'Erreur de recyclage';
    } finally {
      button.disabled = false;
      button.style.background = '#fff';
      button.style.borderBottom = '1px solid #bfbfbf';
    }
  });
}
