/* CookingTitan : modification de la poêle + upsells dans le tiroir panier */
(function () {
  if (window.ctCartInit) return;
  window.ctCartInit = true;

  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';
  var headers = { 'Content-Type': 'application/json', Accept: 'application/json' };

  function post(path, body) {
    return fetch(root + path, { method: 'POST', headers: headers, body: JSON.stringify(body) });
  }

  function refresh(el) {
    var drawer = el.closest('cart-drawer') || document.querySelector('cart-drawer');
    if (drawer && el.closest('cart-drawer') && typeof drawer.refreshCartDrawer === 'function') {
      return drawer.refreshCartDrawer();
    }
    window.location.reload();
  }

  function readJSON(el, sel, fallback) {
    try {
      var n = el.querySelector(sel);
      var v = n ? JSON.parse(n.textContent) : fallback;
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function findVariant(ce, size, lid) {
    var variants = readJSON(ce, '[data-ct-ce-variants]', []);
    var sp = ce.dataset.sizePos === '1' ? 'o1' : 'o2';
    var lp = ce.dataset.lidPos === '1' ? 'o1' : 'o2';
    for (var i = 0; i < variants.length; i++) {
      if (variants[i][sp] === size && variants[i][lp] === lid) return variants[i];
    }
    return null;
  }

  // move : nombre d'unités à basculer (couvercle : 1 seule poêle ; taille : toute la ligne)
  async function swap(ce, size, lid, move) {
    var v = findVariant(ce, size, lid);
    if (!v) return;
    if (!v.a) {
      alert('This option is currently sold out.');
      return refresh(ce);
    }
    var props = readJSON(ce, '[data-ct-ce-props]', {});
    if (Array.isArray(props)) props = {};
    ce.classList.add('is-loading');
    var qty = parseInt(ce.dataset.qty, 10) || 1;
    var n = Math.min(move || qty, qty);
    // Cas courant (pas de propriétés, variante cible absente du panier) : une seule requête
    if (!Object.keys(props).length && !v.q) {
      try {
        var updates = {};
        updates[ce.dataset.key] = qty - n;
        updates[v.id] = n;
        var up = await post('cart/update.js', { updates: updates });
        if (!up.ok) {
          var e1 = await up.json().catch(function () { return {}; });
          alert(e1.description || 'This option is unavailable.');
        }
      } catch (e) {
        console.error(e);
      }
      return refresh(ce);
    }
    // Variante cible déjà au panier : propriété cachée unique pour garder une ligne séparée (pas de fusion)
    var p2 = {};
    for (var k in props) p2[k] = props[k];
    if (v.q) p2._ct_split = String(Date.now());
    try {
      var add = await post('cart/add.js', { items: [{ id: v.id, quantity: n, properties: p2 }] });
      if (!add.ok) {
        var err = await add.json().catch(function () { return {}; });
        alert(err.description || 'This option is unavailable.');
        ce.classList.remove('is-loading');
        return;
      }
      await post('cart/change.js', { id: ce.dataset.key, quantity: qty - n });
    } catch (e) {
      console.error(e);
    }
    refresh(ce);
  }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.classList.contains('ct-ce__size')) {
      var ce = t.closest('.ct-ce');
      swap(ce, t.value, ce.dataset.curLid);
    } else if (t.classList.contains('ct-ce__lid-input')) {
      var ce2 = t.closest('.ct-ce');
      swap(ce2, ce2.querySelector('.ct-ce__size').value, t.checked ? t.dataset.onValue : t.dataset.offValue, 1);
    } else if (t.classList.contains('ct-cu__select')) {
      var item = t.closest('.ct-cu__item');
      var opt = t.options[t.selectedIndex];
      item.querySelector('.ct-cu__add').dataset.variantId = t.value;
      var now = item.querySelector('.ct-cu__now');
      if (now && opt.dataset.price) now.textContent = opt.dataset.price;
    }
  });

  document.addEventListener('click', function (e) {
    var ed = e.target.closest('.ct-ce__edit');
    if (!ed) return;
    e.preventDefault();
    var panel = ed.closest('.ct-ce').querySelector('.ct-ce__panel');
    if (!panel) return;
    panel.hidden = !panel.hidden;
    ed.setAttribute('aria-expanded', String(!panel.hidden));
  });

  document.addEventListener('click', async function (e) {
    var btn = e.target.closest('.ct-cu__add');
    if (!btn) return;
    e.preventDefault();
    if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading');
    var drawer = btn.closest('cart-drawer');
    if (drawer && typeof drawer.addItemToCart === 'function') {
      await drawer.addItemToCart(btn.dataset.variantId);
      btn.classList.remove('is-loading');
      return;
    }
    await post('cart/add.js', { items: [{ id: parseInt(btn.dataset.variantId, 10), quantity: 1 }] });
    window.location.reload();
  });
})();
