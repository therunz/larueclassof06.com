/* Shared behavior: if a photo file isn't in the repo yet (or its name has a typo),
   show a labeled placeholder instead of a broken-image icon. */
function fallback(el) {
  if (!el || el.tagName !== 'IMG' || el.hasAttribute('data-nofallback') || !el.parentNode) return;
  if (el.hasAttribute('data-hide')) { el.style.display = 'none'; return; }

  var name = (el.getAttribute('src') || '').split('/').pop();
  var ph = document.createElement('div');
  ph.className = 'ph';
  ph.setAttribute('role', 'img');
  ph.setAttribute('aria-label', el.alt ? el.alt + ' (photo not uploaded yet)' : 'Photo not uploaded yet');
  var span = document.createElement('span');
  span.textContent = el.getAttribute('data-ph') || name;
  ph.appendChild(span);
  el.replaceWith(ph);
}

// Future failures (images still loading, or added by script)
document.addEventListener('error', function (e) { fallback(e.target); }, true);

// Failures that already happened before this script ran
function sweep() {
  var imgs = document.images;
  for (var i = imgs.length - 1; i >= 0; i--) {
    if (imgs[i].complete && imgs[i].naturalWidth === 0 && imgs[i].getAttribute('src')) fallback(imgs[i]);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sweep);
else sweep();
window.addEventListener('load', sweep);
