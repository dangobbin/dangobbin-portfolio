// Shared header behaviour for both pages: on touch devices the header
// collapses to just a menu icon (see style.css), and this toggles the
// dropdown it opens. Does nothing on desktop, where the hamburger is
// hidden and the nav is always visible.

(function () {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? '✕' : '☰';
  }

  toggle.addEventListener('click', function () {
    setOpen(!nav.classList.contains('is-open'));
  });

  // closing on link tap keeps the menu from staying open after navigating
  // (or after an in-page anchor scroll on the same page)
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });
})();
