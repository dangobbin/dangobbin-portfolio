// Home carousel: picks a photo at random from photos/manifest.json, holds it
// for 6s, then fades to black over 1s, swaps while invisible, and fades back
// up over 1s (8s per cycle). Never repeats the photo just shown. Add more
// photos by appending entries to manifest.json — no code changes needed.
//
// Everything is driven from one JS timer chain (no CSS "animation: infinite"
// running on its own clock) so the fade and the content swap can never drift
// apart. A "transitioning" guard also makes sure the auto-advance and the
// prev/next buttons can never run two transitions at once — if the auto
// timer had already fired (its callback started) right as a button was
// clicked, both would show()/setOpacity() independently and the old photo
// could flash back mid-fade. "Previous" walks back through a history of
// what was actually shown (the order is random, so there's no fixed
// sequence to step back through otherwise).

(async function () {
  const img = document.getElementById('carousel-img');
  const caption = document.getElementById('carousel-caption');
  const serial = document.getElementById('carousel-serial');
  const toggleBtn = document.getElementById('carousel-toggle');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  if (!img || !caption) return; // carousel markup not on this page (e.g. "coming soon")

  const fadeEls = [img, caption, serial].filter(Boolean);

  const res = await fetch('photos/manifest.json');
  const slides = await res.json();
  if (!slides.length) return;

  let current = Math.floor(Math.random() * slides.length);
  const history = []; // indices shown before the current one, oldest first
  let paused = false;
  let timer = null;
  let transitioning = false;

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

  function pickRandom(prevIndex) {
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

  // preloads targetIndex, fades the current photo to black, then swaps it in
  // and slides it in from the left (the exit is a fade, the entrance is a
  // slide); resolves once the entrance has finished. No-ops (resolves
  // immediately) if a transition is already running.
  function transitionTo(targetIndex) {
    if (transitioning) return Promise.resolve();
    transitioning = true;
    return preload(slides[targetIndex].src).then(function () {
      return new Promise(function (resolve) {
        setOpacity(0); // exit: fade everything to black
        setTimeout(function () {
          current = targetIndex;
          show(current); // already preloaded -> paints immediately, no gap

          // stage the incoming photo off-screen to the left, still invisible,
          // without animating that jump
          img.style.transition = 'none';
          img.style.transform = 'translateX(-100%)';
          void img.offsetWidth; // commit that position before re-enabling the transition
          img.style.transition = '';

          setOpacity(1); // caption/serial/photo fade back in...
          img.style.transform = 'translateX(0)'; // ...while the photo also slides in from the left

          setTimeout(function () {
            transitioning = false;
            resolve();
          }, 1000);
        }, 1000);
      });
    });
  }

  function runAuto() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (transitioning) { runAuto(); return; } // something else is mid-transition, try again later
      const prior = current;
      const target = pickRandom(current);
      transitionTo(target).then(function () {
        history.push(prior);
        if (!paused) runAuto();
      });
    }, 6000);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      paused = !paused;
      toggleBtn.textContent = paused ? 'Slideshow off' : 'Slideshow on';
      toggleBtn.classList.toggle('is-on', !paused);
      toggleBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      if (paused) {
        clearTimeout(timer);
      } else {
        runAuto();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (transitioning) return;
      clearTimeout(timer);
      const prior = current;
      const target = pickRandom(current);
      transitionTo(target).then(function () {
        history.push(prior);
        if (!paused) runAuto();
      });
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (transitioning || !history.length) return;
      clearTimeout(timer);
      const target = history.pop();
      transitionTo(target).then(function () {
        if (!paused) runAuto();
      });
    });
  }

  show(current);
  setOpacity(1);
  toggleBtn && toggleBtn.classList.add('is-on');
  runAuto();
})();
