(() => {
  if (document.querySelector('.ambient-effects')) return;

  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const ambient = document.createElement('div');
  ambient.className = 'ambient-effects';
  ambient.setAttribute('aria-hidden', 'true');

  // Keep the quiet points near the margins, away from the reading column.
  const positions = [[5, 18], [94, 12], [9, 43], [97, 37], [3, 69], [92, 66], [13, 88], [96, 91]];
  positions.forEach(([x, y], index) => {
    const sparkle = document.createElement('span');
    sparkle.className = 'ambient-sparkle';
    sparkle.style.setProperty('--sparkle-x', `${x}%`);
    sparkle.style.setProperty('--sparkle-y', `${y}%`);
    sparkle.style.setProperty('--sparkle-size', `${index % 3 === 0 ? 3 : 2}px`);
    sparkle.style.setProperty('--sparkle-duration', `${5 + index % 4}s`);
    sparkle.style.setProperty('--sparkle-delay', `${-index * 1.7}s`);
    ambient.append(sparkle);
  });

  const clicks = document.createElement('div');
  clicks.className = 'click-effects';
  clicks.setAttribute('aria-hidden', 'true');
  document.body.prepend(ambient);
  document.body.append(clicks);

  const groups = new Set();
  let pageActive = true;
  let pointerType = '';

  function clearGroup(group) {
    group.animations.forEach(animation => animation.cancel());
    group.nodes.forEach(node => node.remove());
    groups.delete(group);
  }

  function updateState() {
    const enabled = pageActive && document.visibilityState === 'visible' && !reducedMotion.matches;
    root.dataset.effects = enabled ? 'on' : 'off';
    if (!enabled) {
      groups.forEach(clearGroup);
      pointerType = '';
    }
  }

  document.addEventListener('pointerdown', event => {
    pointerType = event.pointerType;
  }, { passive: true });

  document.addEventListener('click', event => {
    if (root.dataset.effects !== 'on' || typeof Element.prototype.animate !== 'function') return;
    if ((event.pointerType || pointerType) !== 'mouse' || event.button !== 0 || event.detail === 0) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;

    // Bound both concurrent animations and DOM size during rapid clicking.
    while (groups.size >= 4) clearGroup(groups.values().next().value);
    const group = { nodes: [], animations: [] };
    groups.add(group);
    for (let index = 0; index < 6; index += 1) {
      const particle = document.createElement('span');
      particle.className = 'click-particle';
      particle.style.left = `${event.clientX}px`;
      particle.style.top = `${event.clientY}px`;
      clicks.append(particle);
      group.nodes.push(particle);

      const angle = index * Math.PI / 3 + (Math.random() - 0.5) * 0.5;
      const distance = 18 + Math.random() * 24;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      group.animations.push(particle.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.6 },
        { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.2)`, opacity: 0 },
      ], { duration: 450 + Math.random() * 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }));
    }
    Promise.all(group.animations.map(animation => animation.finished.catch(() => {})))
      .then(() => clearGroup(group));
  }, { passive: true });

  reducedMotion.addEventListener('change', updateState);
  document.addEventListener('visibilitychange', updateState);
  window.addEventListener('pagehide', () => { pageActive = false; updateState(); });
  window.addEventListener('pageshow', () => { pageActive = true; updateState(); });
  updateState();
})();
