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

  function setState(on) {
    toggle.textContent = on ? 'Music on' : 'Music off';
    toggle.classList.toggle('is-on', on);
    toggle.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
    try { localStorage.setItem('dangobbin-music', on ? '1' : '0'); } catch (e) {}
  }

  toggle.addEventListener('click', function () {
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
  }
})();
