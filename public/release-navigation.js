(() => {
  const selectorLabel = 'Select MillOS version';
  const matrixUrl = '/release-matrix.json';
  const activeVersion = window.location.pathname.match(/^\/(v\d+\.\d+)(?:\/|$)/)?.[1];

  const buildNavigation = (legacySelector, matrix) => {
    const existingHost = legacySelector.parentElement?.querySelector('[data-millos-release-nav]');
    if (existingHost) return;

    const host = document.createElement('span');
    host.dataset.millosReleaseNav = 'true';
    const shadow = host.attachShadow({ mode: 'open' });
    const wrapper = document.createElement('span');
    wrapper.className = 'release-navigation';

    const selector = document.createElement('select');
    selector.setAttribute('aria-label', selectorLabel);
    for (const release of matrix.releases) {
      const option = document.createElement('option');
      option.value = release.version;
      option.textContent = release.label;
      selector.append(option);
    }
    selector.value = matrix.releases.some((release) => release.version === activeVersion)
      ? activeVersion
      : matrix.currentVersion;

    const go = document.createElement('button');
    go.type = 'button';
    go.textContent = 'Go';
    go.setAttribute('aria-label', `Switch to MillOS version ${selector.value.slice(1)}`);
    go.disabled = selector.value === activeVersion;
    selector.addEventListener('change', () => {
      go.disabled = selector.value === activeVersion;
      go.setAttribute('aria-label', `Switch to MillOS version ${selector.value.slice(1)}`);
    });
    go.addEventListener('click', () => {
      if (go.disabled) return;
      window.location.assign(`/${selector.value}/`);
    });

    const style = document.createElement('style');
    style.textContent = `
      :host { display: inline-flex; margin-left: 0.25rem; vertical-align: middle; }
      .release-navigation { display: inline-flex; align-items: center; gap: 0.2rem; }
      select, button {
        min-height: 1.5rem;
        border: 1px solid rgba(148, 163, 184, 0.45);
        border-radius: 0.3rem;
        background: #0f172a;
        color: #e2e8f0;
        font: 600 0.7rem/1 system-ui, sans-serif;
      }
      select { padding: 0.2rem 1.25rem 0.2rem 0.35rem; }
      button { padding: 0.2rem 0.4rem; cursor: pointer; }
      button:focus-visible, select:focus-visible { outline: 2px solid #22d3ee; outline-offset: 2px; }
      button:disabled { cursor: default; opacity: 0.45; }
    `;

    wrapper.append(selector, go);
    shadow.append(style, wrapper);
    legacySelector.hidden = true;
    legacySelector.setAttribute('aria-hidden', 'true');
    legacySelector.tabIndex = -1;
    legacySelector.insertAdjacentElement('afterend', host);
  };

  const install = async () => {
    const response = await fetch(matrixUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Release matrix request failed: ${response.status}`);
    const matrix = await response.json();
    const enhance = () => {
      document
        .querySelectorAll(`select[aria-label="${selectorLabel}"]`)
        .forEach((selector) => buildNavigation(selector, matrix));
    };
    enhance();
    new MutationObserver(enhance).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  };

  install().catch(() => {
    // Historical navigation remains available if the deployment bridge cannot load.
  });
})();
