// Shared background-music control, included on every page. Starts off:
// browsers block unmuted autoplay before a user gesture anyway, and a
// portfolio site shouldn't blast audio uninvited. Once the visitor turns it
// on, that choice is remembered (localStorage) and carried into whichever
// page they go to next -- each page has its own <audio>, so navigating
// restarts the track, but the on/off state follows them across the site.

(function () {
  const audio = document.getElementById('bg-music');
  const toggle = document.getElementById('music-toggle');
  if (!audio || !toggle) return;

  // The track itself already fades in/out at its own edges, so the native
  // loop attribute (set in the HTML) is enough on its own -- a JS-managed
  // crossfade on top was redundant, and relied on reading audio.duration
  // early/reliably, which isn't a given on every browser.

  function setState(on) {
    toggle.textContent = on ? 'Music on' : 'Music off';
    toggle.classList.toggle('is-on', on);
    toggle.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
    try { localStorage.setItem('dangobbin-music', on ? '1' : '0'); } catch (e) {}
  }

  toggle.addEventListener('click', function () {
    toggle.classList.remove('hint'); // interacting dismisses the nudge for good
    if (audio.paused) {
      audio.play().then(function () { setState(true); }).catch(function () { setState(false); });
    } else {
      audio.pause();
      setState(false);
    }
  });

  let wantsOn = false;
  try { wantsOn = localStorage.getItem('dangobbin-music') === '1'; } catch (e) {}
  if (wantsOn) {
    audio.play().then(function () { setState(true); }).catch(function () { setState(false); });
  } else {
    // One-time, self-dismissing nudge toward the toggle: a few gentle
    // pulses on the button itself, no new elements, no layout shift. Shown
    // once ever (tracked in localStorage), never repeats across pages or
    // later visits, so it can't become annoying.
    let hintShown = false;
    try { hintShown = localStorage.getItem('dangobbin-music-hint-shown') === '1'; } catch (e) {}
    if (!hintShown) {
      try { localStorage.setItem('dangobbin-music-hint-shown', '1'); } catch (e) {}
      setTimeout(function () { toggle.classList.add('hint'); }, 1500);
    }
  }
})();
