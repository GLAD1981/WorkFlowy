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

  const status = document.createElement('span');
  status.setAttribute('aria-live', 'polite');
  menu.appendChild(button);
  menu.appendChild(status);
  document.body.appendChild(menu);

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
