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

  // Loop manually (instead of the native loop attribute) so the restart can
  // fade out/in rather than cutting straight from the track's natural end
  // into its start, which was an audible jump.
  const FADE_MS = 2000;
  let looping = false;

  function rampVolume(from, to, ms, done) {
    const steps = 20;
    const stepMs = ms / steps;
    let i = 0;
    audio.volume = from;
    const timer = setInterval(function () {
      i++;
      audio.volume = from + (to - from) * (i / steps);
      if (i >= steps) {
        clearInterval(timer);
        audio.volume = to;
        if (done) done();
      }
    }, stepMs);
  }

  audio.addEventListener('timeupdate', function () {
    if (looping || audio.paused || isNaN(audio.duration)) return;
    const remaining = audio.duration - audio.currentTime;
    if (remaining <= FADE_MS / 1000) {
      looping = true;
      rampVolume(audio.volume, 0, Math.max(remaining * 1000, 0), function () {
        audio.currentTime = 0;
        // the track can reach its natural end (and auto-pause) a moment
        // before this fade-out finishes, racing the JS timer against real
        // playback time -- play() again explicitly so it always resumes,
        // even if that happened. Harmless no-op if it's still playing.
        audio.play().catch(function () {});
        rampVolume(0, 1, FADE_MS, function () { looping = false; });
      });
    }
  });

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
