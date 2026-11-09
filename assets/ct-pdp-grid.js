/* CookingTitan : colonne d'infos collante sur la galerie en grille.
   Si la colonne est plus haute que l'écran, elle se fixe par le bas (on voit tout son contenu). */
(function () {
  var info = document.querySelector('.shop-product-layout .shop-product-info');
  if (!info || !document.querySelector('.ct-has-grid')) return;
  function update() {
    var gap = 20;
    var top = Math.min(gap, window.innerHeight - info.offsetHeight - gap);
    info.style.setProperty('--ct-info-top', top + 'px');
  }
  update();
  window.addEventListener('resize', update);
  if ('ResizeObserver' in window) new ResizeObserver(update).observe(info);
})();
