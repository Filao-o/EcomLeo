/* Sections « ct- » : carrousels (barre de progression / points), onglets, bouton « remonter à l'achat » */
(function () {
  'use strict';
  function initTrack(root) {
    var track = root.querySelector('[data-ct-track]');
    if (!track || track._ct) return;
    track._ct = true;
    var bar = root.querySelector('[data-ct-progress] span');
    var dots = root.querySelectorAll('[data-ct-dots] button');
    var tabs = root.querySelectorAll('[data-ct-tab]');
    var items = track.children;
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var ratio = max > 0 ? track.scrollLeft / max : 0;
      if (bar) {
        var w = Math.max(15, Math.min(100, (track.clientWidth / track.scrollWidth) * 100));
        bar.style.width = w + '%';
        bar.style.left = ratio * (100 - w) + '%';
      }
      var idx = 0, best = Infinity;
      for (var i = 0; i < items.length; i++) {
        var d = Math.abs(items[i].offsetLeft - track.offsetLeft - track.scrollLeft - parseFloat(getComputedStyle(track).paddingLeft || 0));
        if (d < best) { best = d; idx = i; }
      }
      dots.forEach(function (b, i) { b.classList.toggle('is-active', i === idx); });
      tabs.forEach(function (b, i) { b.classList.toggle('is-active', i === idx); b.setAttribute('aria-selected', i === idx); });
    }
    function go(i) {
      if (!items[i]) return;
      track.scrollTo({ left: items[i].offsetLeft - track.offsetLeft - parseFloat(getComputedStyle(track).paddingLeft || 0), behavior: 'smooth' });
    }
    dots.forEach(function (b, i) { b.addEventListener('click', function () { go(i); }); });
    tabs.forEach(function (b, i) { b.addEventListener('click', function () { go(i); }); });
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
  function initAll(scope) {
    (scope || document).querySelectorAll('[data-ct-carousel]').forEach(initTrack);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-ct-scroll-buy]');
    if (!btn) return;
    var picker = document.querySelector('pdp-variant-cards[data-mode="main"]');
    var target = picker || document.querySelector('.shop-product-info');
    if (!target) return;
    e.preventDefault();
    window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 120, behavior: 'smooth' });
    if (picker && picker.needsSelection && picker.requestAttention) setTimeout(function () { picker.requestAttention(); }, 500);
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
