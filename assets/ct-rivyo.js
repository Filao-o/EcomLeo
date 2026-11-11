/* CookingTitan : mosaïque des avis Rivyo.
   Chaque carte reçoit un « grid-row-end: span N » selon sa hauteur réelle ; recalcul à chaque
   chargement d'avis (« Show more »), d'image, ou changement de largeur. Aucun déplacement de nœud. */
(function () {
  var ROW = 4, GAP = 16, raf = 0;

  function layout() {
    raf = 0;
    document.querySelectorAll('#wc_all_review_page ul.wc_review_widget').forEach(function (ul) {
      var gap = window.innerWidth < 900 ? 12 : GAP;
      ul.classList.add('ct-masonry');
      ul.querySelectorAll(':scope > li.wc_review_widget_item').forEach(function (li) {
        var card = li.firstElementChild;
        if (!card) return;
        var h = card.getBoundingClientRect().height;
        var span = Math.max(1, Math.ceil((h + gap) / ROW));
        var v = 'span ' + span;
        if (li.style.gridRowEnd !== v) li.style.gridRowEnd = v;
      });
    });
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(layout); }

  function init() {
    var root = document.getElementById('wc_all_review_page');
    if (!root) return;
    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    root.addEventListener('load', schedule, true);   // images des avis
    root.addEventListener('error', schedule, true);
    window.addEventListener('resize', schedule);
    if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(root);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
    schedule();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
