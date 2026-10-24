// Home carousel: picks a photo at random from photos/manifest.json, holds it
// for 6s, then fades to black over 1s, swaps while invisible, and fades back
// up over 1s (8s per cycle). Never repeats the photo just shown. Add more
// photos by appending entries to manifest.json — no code changes needed.
//
// Everything is driven from one JS timer chain (no CSS "animation: infinite"
// running on its own clock) so the fade and the content swap can never drift
// apart. The pause/next controls hook into that same chain.

(async function () {
  const img = document.getElementById('carousel-img');
  const caption = document.getElementById('carousel-caption');
  const serial = document.getElementById('carousel-serial');
  const toggleBtn = document.getElementById('carousel-toggle');
  const nextBtn = document.getElementById('carousel-next');
  if (!img || !caption) return; // carousel markup not on this page (e.g. "coming soon")

  const fadeEls = [img, caption, serial].filter(Boolean);

  const res = await fetch('photos/manifest.json');
  const slides = await res.json();
  if (!slides.length) return;

  let current = Math.floor(Math.random() * slides.length);
  let paused = false;
  let timer = null;

  function show(index) {
    const slide = slides[index];
    img.src = slide.src;
    img.alt = slide.alt;
    caption.textContent = slide.caption;
    if (serial) serial.textContent = slide.serial || '';
  }

  function setOpacity(v) {
    fadeEls.forEach(function (el) { el.style.opacity = v; });
  }

  function pickNext(prevIndex) {
    if (slides.length <= 1) return 0;
    let next;
    do {
      next = Math.floor(Math.random() * slides.length);
    } while (next === prevIndex);
    return next;
  }

  // resolves once the browser has the image bytes decoded and cached, so
  // swapping img.src later paints instantly instead of showing a gap.
  function preload(src) {
    return new Promise(function (resolve) {
      const probe = new Image();
      probe.onload = resolve;
      probe.onerror = resolve; // don't hang forever on a broken file
      probe.src = src;
    });
  }

  // preloads the next photo, fades the current one out, swaps it, fades the
  // new one in; resolves once the fade-in has finished.
  function transitionToNext() {
    const nextIndex = pickNext(current);
    return preload(slides[nextIndex].src).then(function () {
      return new Promise(function (resolve) {
        setOpacity(0);
        setTimeout(function () {
          current = nextIndex;
          show(current); // already preloaded -> paints immediately, no gap
          setOpacity(1);
          setTimeout(resolve, 1000);
        }, 1000);
      });
    });
  }

  function scheduleAuto() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      transitionToNext().then(function () {
        if (!paused) scheduleAuto();
      });
    }, 6000);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      paused = !paused;
      toggleBtn.textContent = paused ? '▶' : '⏸';
      toggleBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      if (paused) {
        clearTimeout(timer);
      } else {
        scheduleAuto();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      clearTimeout(timer);
      transitionToNext().then(function () {
        if (!paused) scheduleAuto();
      });
    });
  }

  show(current);
  setOpacity(1);
  scheduleAuto();
})();
