// Home carousel: picks a photo at random from photos/manifest.json, holds it
// for 6s, then fades to black over .6s, swaps while invisible, and fades
// back up over .6s (7.2s per cycle). Never repeats the photo just shown.
// Add more photos by appending entries to manifest.json — no code changes
// needed.
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

  const stage = document.querySelector('.stage');
  const figure = document.querySelector('.carousel-figure');
  const frame = document.querySelector('.carousel-frame');
  const capRow = document.querySelector('.carousel-caption-row');
  const controls = document.querySelector('.carousel-controls');
  const header = document.querySelector('.site-header');

  // Measures the real, rendered chrome (header + stage padding + gaps +
  // caption/controls rows) and sets how much vertical room is actually left
  // for the photo as a CSS variable — instead of guessing a fixed px budget,
  // which on a real device (different font metrics, Safari's own chrome,
  // etc.) kept being wrong in one direction or another.
  function updateImgMaxHeight() {
    if (!stage || !figure || !frame || !capRow || !controls || !header) return;
    // on touch devices the header is fixed/out of flow (just a menu icon;
    // see style.css) and .stage's own padding-top already clears it, so it
    // doesn't also cost layout height the way it does on desktop
    const headerPos = getComputedStyle(header).position;
    const headerHeight = (headerPos === 'fixed' || headerPos === 'absolute') ? 0 : header.offsetHeight;
    const stageCs = getComputedStyle(stage);
    const stagePadding = parseFloat(stageCs.paddingTop) + parseFloat(stageCs.paddingBottom);
    const figureGap = parseFloat(getComputedStyle(figure).rowGap) || 0;
    const frameGap = parseFloat(getComputedStyle(frame).rowGap) || 0;
    const chrome = headerHeight + stagePadding + figureGap + frameGap +
      capRow.offsetHeight + controls.offsetHeight;
    const available = Math.max(window.innerHeight - chrome, 120);
    document.documentElement.style.setProperty('--img-max-height', available + 'px');
  }

  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateImgMaxHeight, 100);
  });

  function show(index) {
    const slide = slides[index];
    img.src = slide.src;
    img.alt = slide.alt;
    showCaption(index);
  }

  // Caption/serial only (no image swap). Split out so the intro sequence can
  // set the real caption text early, during the name-hold, before the frame's
  // height has to stay still for the crossfade -- otherwise the caption row
  // going from empty to its real height shifts --img-max-height (and the
  // frame's height with it) at the exact instant the name starts fading,
  // which reads as a bounce/flash of the name on WebKit.
  function showCaption(index) {
    const slide = slides[index];
    caption.textContent = slide.caption;
    if (serial) serial.textContent = slide.serial || '';
    updateImgMaxHeight(); // caption length can change row height, so recheck each time
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
          }, 600);
        }, 600);
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

  // First load: show the first photo right away and let the name sit on top
  // of it as an overlay that fades out on its own, instead of a two-element
  // crossfade (name fading out while the photo faded in, at the same time).
  // The crossfade kept bouncing -- the name briefly reappearing over the
  // photo -- on real devices even after fixing a layout shift that could
  // trigger it, and it didn't reproduce reliably enough here to chase
  // further. A single element fading alone, with nothing else changing at
  // the same time, has no room to glitch into "reappearing".
  const intro = document.getElementById('intro');

  function playIntro() {
    toggleBtn && toggleBtn.classList.add('is-on');
    show(current);
    setOpacity(1);

    if (!intro) { runAuto(); return; }

    frame && frame.classList.add('intro-active');

    // .intro starts at opacity:0 in the CSS itself (not just here), so there
    // is nothing to flash in a fallback font while the webfont loads. Only
    // reveal it, instantly, once document.fonts confirms the real font is
    // ready — otherwise "Daniele Gobbin photographer" can render one line
    // too wide in the fallback font, wrap to two lines, and visibly re-wrap
    // to one line a moment later once the webfont swaps in.
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

    fontsReady.then(function () {
      intro.style.transition = 'none';
      intro.style.opacity = '1';
      void intro.offsetWidth; // commit the instant reveal before re-enabling the transition
      intro.style.transition = '';

      return new Promise(function (resolve) { setTimeout(resolve, 1800); }); // hold the name a moment
    }).then(function () {
      intro.style.opacity = '0'; // fade the name away, off the photo
      setTimeout(function () {
        intro.style.display = 'none';
        frame && frame.classList.remove('intro-active');
        runAuto();
      }, 1000);
    });
  }

  playIntro();
})();
