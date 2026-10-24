// Groups photos/manifest.json by decade and renders one grid section per
// decade, newest first. Add more photos by appending to manifest.json
// (each entry needs a "year") — this page updates on its own.

(async function () {
  const main = document.getElementById('decades');
  if (!main) return;

  const res = await fetch('photos/manifest.json');
  const photos = await res.json();

  const byDecade = {};
  for (const p of photos) {
    if (typeof p.year !== 'number') continue;
    const decade = Math.floor(p.year / 10) * 10;
    (byDecade[decade] ||= []).push(p);
  }

  const decades = Object.keys(byDecade).map(Number).sort((a, b) => b - a);

  for (const decade of decades) {
    const items = byDecade[decade];

    const section = document.createElement('section');
    section.className = 'decade-section';

    const heading = document.createElement('div');
    heading.className = 'decade-heading';
    heading.innerHTML =
      '<h2>' + decade + 's</h2>' +
      '<span>' + items.length + (items.length === 1 ? ' photo' : ' photos') + '</span>';
    section.appendChild(heading);

    const grid = document.createElement('div');
    grid.className = 'decade-grid';
    for (const p of items) {
      const a = document.createElement('a');
      a.className = 'decade-tile';
      a.href = p.src;
      a.target = '_blank';
      a.rel = 'noopener';

      const img = document.createElement('img');
      img.src = p.src;
      img.alt = p.alt || '';
      img.loading = 'lazy';
      a.appendChild(img);

      const cap = document.createElement('div');
      cap.className = 'decade-tile-caption';

      const capText = document.createElement('span');
      capText.textContent = p.caption;
      cap.appendChild(capText);

      if (p.serial) {
        const serial = document.createElement('span');
        serial.className = 'decade-tile-serial';
        serial.textContent = p.serial;
        cap.appendChild(serial);
      }

      a.appendChild(cap);

      grid.appendChild(a);
    }
    section.appendChild(grid);
    main.appendChild(section);
  }

  if (!decades.length) {
    main.innerHTML = '<div class="decades-empty">No photos yet.</div>';
  }
})();
