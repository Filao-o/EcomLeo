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

  async function swap(ce, size, lid) {
    var v = findVariant(ce, size, lid);
    if (!v) return;
    if (!v.a) {
      alert('This option is currently sold out.');
      return refresh(ce);
    }
    var props = readJSON(ce, '[data-ct-ce-props]', {});
    if (Array.isArray(props)) props = {};
    ce.classList.add('is-loading');
    try {
      var add = await post('cart/add.js', { items: [{ id: v.id, quantity: parseInt(ce.dataset.qty, 10) || 1, properties: props }] });
      if (!add.ok) {
        var err = await add.json().catch(function () { return {}; });
        alert(err.description || 'This option is unavailable.');
        ce.classList.remove('is-loading');
        return;
      }
      await post('cart/change.js', { id: ce.dataset.key, quantity: 0 });
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
    } else if (t.classList.contains('ct-ce__lid-input') && t.checked) {
      var ce2 = t.closest('.ct-ce');
      swap(ce2, ce2.querySelector('.ct-ce__size').value, t.dataset.lidValue);
    } else if (t.classList.contains('ct-cu__select')) {
      var item = t.closest('.ct-cu__item');
      var opt = t.options[t.selectedIndex];
      item.querySelector('.ct-cu__add').dataset.variantId = t.value;
      var now = item.querySelector('.ct-cu__now');
      if (now && opt.dataset.price) now.textContent = opt.dataset.price;
    }
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
