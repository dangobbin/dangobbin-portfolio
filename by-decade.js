// Groups photos/manifest.json by decade and renders one grid section per
// decade, newest first. Add more photos by appending to manifest.json
// (each entry needs a "year") — this page updates on its own.
//
// Clicking a tile opens an in-page lightbox (not the raw image file) so
// there's always an obvious way back to the grid, and dragging/right-click
// saving is disabled on the enlarged image.

(async function () {
  const main = document.getElementById('decades');
  if (!main) return;

  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaptionText = document.getElementById('lightbox-caption-text');
  const lightboxSerial = document.getElementById('lightbox-serial');
  const lightboxClose = document.getElementById('lightbox-close');

  function preventDrag(img) {
    img.draggable = false;
    img.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    img.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  function openLightbox(photo) {
    lightboxImg.src = photo.src;
    lightboxImg.alt = photo.alt || '';
    lightboxCaptionText.textContent = photo.caption || '';
    lightboxSerial.textContent = photo.serial || '';
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.classList.remove('lightbox-open');
    lightboxImg.src = '';
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox(); // click on the backdrop, not the photo
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
  });
  preventDrag(lightboxImg);

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
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'decade-tile';
      btn.setAttribute('aria-label', 'Open: ' + (p.caption || p.alt || 'photo'));
      btn.addEventListener('click', function () { openLightbox(p); });

      const img = document.createElement('img');
      img.src = p.src;
      img.alt = p.alt || '';
      img.loading = 'lazy';
      preventDrag(img);
      btn.appendChild(img);

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

      btn.appendChild(cap);

      grid.appendChild(btn);
    }
    section.appendChild(grid);
    main.appendChild(section);
  }

  if (!decades.length) {
    main.innerHTML = '<div class="decades-empty">No photos yet.</div>';
  }
})();
