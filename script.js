// Home carousel: picks a photo at random from photos/manifest.json, holds it
// for 6s, then fades to black over 1s, swaps while invisible, and fades back
// up over 1s (8s per cycle). Never repeats the photo just shown. Add more
// photos by appending entries to manifest.json — no code changes needed.
//
// Everything is driven from one JS timer chain (no CSS "animation: infinite"
// running on its own clock) so the fade and the content swap can never drift
// apart — a drift is what caused the old photo to flash back briefly before
// the swap.

(async function () {
  const img = document.getElementById('carousel-img');
  const caption = document.getElementById('carousel-caption');
  const serial = document.getElementById('carousel-serial');
  if (!img || !caption) return; // carousel markup not on this page (e.g. "coming soon")

  const fadeEls = [img, caption, serial].filter(Boolean);

  const res = await fetch('photos/manifest.json');
  const slides = await res.json();
  if (!slides.length) return;

  let current = Math.floor(Math.random() * slides.length);

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

  function cycle() {
    setOpacity(0); // 1s fade to black
    setTimeout(function () {
      current = pickNext(current);
      show(current); // swap while fully invisible
      void img.offsetWidth; // force a reflow so opacity:0 is committed before fading back up
      setOpacity(1); // 1s fade back up
      setTimeout(cycle, 7000); // 1s to finish fading up + 6s stable, then do it again
    }, 1000);
  }

  show(current);
  setOpacity(1);
  setTimeout(cycle, 6000); // first stable viewing period
})();
