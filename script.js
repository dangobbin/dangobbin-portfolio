// Home carousel: picks a photo at random from photos/manifest.json every 8s
// (6s stable + 2s fade-to-black, handled purely by the CSS keyframes in
// style.css), never repeating the one just shown. Add more photos by
// appending entries to manifest.json — no code changes needed.

(async function () {
  const img = document.getElementById('carousel-img');
  const caption = document.getElementById('carousel-caption');
  const serial = document.getElementById('carousel-serial');
  if (!img || !caption) return; // carousel markup not on this page (e.g. "coming soon")

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

  function pickNext(prevIndex) {
    if (slides.length <= 1) return 0;
    let next;
    do {
      next = Math.floor(Math.random() * slides.length);
    } while (next === prevIndex);
    return next;
  }

  show(current);

  // first swap at the 7s mark (the dark point of the first 8s loop),
  // then every 8s after that, staying aligned with the CSS animation
  setTimeout(function () {
    current = pickNext(current);
    show(current);
    setInterval(function () {
      current = pickNext(current);
      show(current);
    }, 8000);
  }, 7000);
})();
