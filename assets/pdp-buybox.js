/*
 * PDP buy box : sélecteur de variantes en cartes + 2e article (upsell)
 * - <pdp-variant-cards data-mode="main">   pilote input[name="id"] du formulaire produit
 * - <pdp-variant-cards data-mode="upsell"> garde sa propre sélection (2e article)
 * - <pdp-second-item>                      ajoute le 2e article au panier avec le produit principal
 */
(function () {
  'use strict';

  function formatMoney(cents, format, hideZeroDecimals) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    cents = parseInt(cents, 10) || 0;
    format = format || '${{amount}}';
    var placeholder = /\{\{\s*(\w+)\s*\}\}/;
    function withDelimiters(number, precision, thousands, decimal) {
      thousands = thousands === undefined ? ',' : thousands;
      decimal = decimal === undefined ? '.' : decimal;
      var fixed = (number / 100).toFixed(precision);
      var parts = fixed.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var centsPart = parts[1] ? decimal + parts[1] : '';
      if (hideZeroDecimals && /^[.,]0+$/.test(centsPart)) centsPart = '';
      return dollars + centsPart;
    }
    var match = format.match(placeholder);
    var value = '';
    switch (match ? match[1] : 'amount') {
      case 'amount_no_decimals': value = withDelimiters(cents, 0); break;
      case 'amount_with_comma_separator': value = withDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = withDelimiters(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = withDelimiters(cents, 2, "'", '.'); break;
      case 'amount_with_space_separator': value = withDelimiters(cents, 2, ' ', ','); break;
      default: value = withDelimiters(cents, 2);
    }
    return format.replace(placeholder, value);
  }

  function decodeEntities(str) {
    var t = document.createElement('textarea');
    t.innerHTML = str || '';
    return t.value;
  }

  class PdpVariantCards extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      try {
        this.variants = JSON.parse(this.querySelector('[data-pdp-variants]').textContent);
      } catch (e) {
        this.variants = [];
      }
      this.mode = this.dataset.mode;
      this.pIdx = parseInt(this.dataset.primaryIndex, 10) - 1;
      this.sIdx = parseInt(this.dataset.secondaryIndex, 10) - 1;
      this.moneyFormat = decodeEntities(this.dataset.moneyFormat);
      this.hideDecimals = this.dataset.hideDecimals === 'true';

      var activeP = this.querySelector('[data-axis="primary"].is-active');
      var activeS = this.querySelector('[data-axis="secondary"].is-active');
      this.primary = activeP ? activeP.dataset.value : null;
      this.secondary = activeS ? activeS.dataset.value : null;
      if (this.sIdx >= 0 && !this.secondary) {
        var firstS = this.querySelector('[data-axis="secondary"]');
        if (firstS) this.secondary = firstS.dataset.value;
      }

      this.addEventListener('click', this.onClick.bind(this));
      this.refreshLabels();

      if (this.mode === 'main') {
        this.form = document.getElementById(this.dataset.formId);
        PdpForms.register(this.form, this);
        this.syncButton();
      }
    }

    money(cents) {
      return formatMoney(cents, this.moneyFormat, this.hideDecimals);
    }

    findVariant(primary, secondary) {
      var p = this.pIdx, s = this.sIdx;
      return this.variants.find(function (v) {
        return v.options[p] === primary && (s < 0 || v.options[s] === secondary);
      }) || null;
    }

    get selectedVariant() {
      if (!this.primary) return null;
      return this.findVariant(this.primary, this.secondary);
    }

    get needsSelection() {
      return !this.primary;
    }

    onClick(event) {
      var btn = event.target.closest('[data-axis]');
      if (!btn || !this.contains(btn)) return;
      event.preventDefault();
      if (btn.dataset.axis === 'primary') this.primary = btn.dataset.value;
      else this.secondary = btn.dataset.value;
      this.querySelectorAll('[data-axis="' + btn.dataset.axis + '"]').forEach(function (el) {
        var on = el === btn;
        el.classList.toggle('is-active', on);
        el.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      this.classList.remove('pdp-vc--attention');
      this.refreshLabels();
      this.onVariantChange();
    }

    refreshLabels() {
      var self = this;
      // Prix des cartes (selon l'option secondaire choisie)
      this.querySelectorAll('[data-axis="primary"]').forEach(function (card) {
        var v = self.findVariant(card.dataset.value, self.secondary) ||
          self.variants.find(function (x) { return x.options[self.pIdx] === card.dataset.value; });
        var priceEl = card.querySelector('[data-price]');
        if (v && priceEl) priceEl.textContent = self.money(v.price);
        card.classList.toggle('is-unavailable', !v || !v.available);
      });
      // Supplément de prix de l'option secondaire (ex : +$13)
      if (this.sIdx >= 0) {
        var basePrimary = this.primary || (this.querySelector('[data-axis="primary"]') || {}).dataset?.value;
        var options = Array.prototype.slice.call(this.querySelectorAll('[data-axis="secondary"]'));
        var base = options.length ? this.findVariant(basePrimary, options[0].dataset.value) : null;
        options.forEach(function (opt) {
          var deltaEl = opt.querySelector('[data-delta]');
          var v = self.findVariant(basePrimary, opt.dataset.value);
          opt.classList.toggle('is-unavailable', !v || !v.available);
          if (!deltaEl) return;
          var delta = v && base ? v.price - base.price : 0;
          deltaEl.textContent = delta > 0 ? (self.dataset.deltaPrefix || '+') + self.money(delta) : '';
        });
      }
    }

    onVariantChange() {
      var variant = this.selectedVariant;
      if (variant) this.dataset.selectedId = variant.id;
      else delete this.dataset.selectedId;
      this.dispatchEvent(new CustomEvent('pdp:variant', { bubbles: true, detail: { variant: variant } }));
      if (this.mode !== 'main' || !variant) {
        if (this.mode === 'main') this.syncButton();
        return;
      }

      // 1. Formulaire produit
      if (this.form) {
        var input = this.form.querySelector('input[name="id"]');
        if (input) {
          input.value = variant.id;
          input.setAttribute('value', variant.id);
          input.disabled = false;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      // 2. URL
      if (this.dataset.updateUrl === 'true') {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
      // 3. Bloc prix + stock de la section
      var root = this.closest('.shopify-section') || document;
      this.updatePrice(root, variant);
      this.updateStock(root, variant);
      this.syncButton();
      // 4. Événement pour les autres composants (galerie, titre dynamique…)
      document.dispatchEvent(new CustomEvent('variant:change', { detail: { variant: variant, source: 'pdp-variant-cards' } }));
      if (variant.featured_media) {
        document.dispatchEvent(new CustomEvent('variant:imageChanged', {
          detail: { variantId: variant.id, mediaId: variant.featured_media.id }
        }));
      }
    }

    updatePrice(root, variant) {
      var priceEl = root.querySelector('.shop-product-price-block');
      var compareEl = root.querySelector('.shop-compare-price');
      var saveEl = root.querySelector('.shop-save-price');
      var onSale = variant.compare_at_price > variant.price;
      if (priceEl) {
        priceEl.textContent = this.money(variant.price);
        priceEl.classList.toggle('on-sale', onSale);
      }
      if (compareEl) {
        compareEl.textContent = onSale ? this.money(variant.compare_at_price) : '';
        compareEl.style.display = onSale ? '' : 'none';
      }
      if (saveEl) {
        saveEl.style.display = onSale ? '' : 'none';
        if (onSale) {
          var pct = Math.round(((variant.compare_at_price - variant.price) * 100) / variant.compare_at_price);
          var walker = document.createTreeWalker(saveEl, NodeFilter.SHOW_TEXT);
          var node;
          while ((node = walker.nextNode())) {
            if (/\d+\s*%/.test(node.nodeValue)) node.nodeValue = node.nodeValue.replace(/\d+(\s*%)/, pct + '$1');
          }
        }
      }
    }

    updateStock(root, variant) {
      root.querySelectorAll('[data-pdp-stock]').forEach(function (el) {
        el.classList.toggle('is-out', !variant.available);
        var label = el.querySelector('.pdp-stock__label');
        if (label) label.textContent = variant.available ? el.dataset.inText : el.dataset.outText;
      });
    }

    syncButton() {
      if (!this.form) return;
      var wrapper = this.form.closest('product-form') || this.form;
      var button = this.form.querySelector('[type="submit"]');
      var variant = this.selectedVariant;
      var needs = this.needsSelection;
      var soldOut = !!variant && !variant.available;
      wrapper.classList.toggle('pdp-needs-selection', needs);
      wrapper.classList.toggle('pdp-sold-out', soldOut);
      if (button) {
        button.setAttribute('data-pdp-select-text', this.dataset.selectText || '');
        button.setAttribute('data-pdp-sold-out-text', this.dataset.soldOutText || '');
        if (soldOut) {
          button.setAttribute('disabled', 'disabled');
        } else {
          button.removeAttribute('disabled');
          button.classList.remove('sold-out');
        }
        // Prix dans le bouton (si l'option « afficher le prix » est active)
        if (variant && button.dataset.showPrice === 'true') {
          var textEl = button.querySelector('.button-text');
          var base = button.dataset.persistentText || button.dataset.originalText;
          if (textEl && base) textEl.textContent = base.trim() + ' - ' + this.money(variant.price);
        }
      }
    }

    requestAttention() {
      var self = this;
      this.classList.remove('pdp-vc--attention');
      void this.offsetWidth;
      this.classList.add('pdp-vc--attention');
      var rect = this.getBoundingClientRect();
      if (rect.top < 80 || rect.bottom > window.innerHeight) {
        window.scrollTo({ top: window.scrollY + rect.top - 120, behavior: 'smooth' });
      }
      setTimeout(function () { self.classList.remove('pdp-vc--attention'); }, 900);
    }
  }

  class PdpSecondItem extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      this.checkbox = this.querySelector('.pdp-si__check');
      this.panel = this.querySelector('.pdp-si__panel');
      this.picker = this.querySelector('pdp-variant-cards');
      this.checkbox.addEventListener('change', this.toggle.bind(this));
      this.toggle();
      PdpForms.registerExtra(document.getElementById(this.dataset.formId), this);
    }
    toggle() {
      var on = this.checkbox.checked;
      this.classList.toggle('is-checked', on);
      if (this.panel) this.panel.hidden = !on;
    }
    get extraItem() {
      if (!this.checkbox.checked || !this.picker) return null;
      var v = this.picker.selectedVariant;
      if (!v || !v.available) return null;
      var item = { id: v.id, quantity: 1, properties: {} };
      if (this.dataset.propertyLabel) item.properties[this.dataset.propertyLabel] = this.dataset.propertyValue || 'Yes';
      return item;
    }
  }

  // Gestion du submit : bloque si aucune taille choisie, ajoute le 2e article
  var PdpForms = {
    map: new WeakMap(),
    entry: function (form) {
      if (!form) return null;
      var e = this.map.get(form);
      if (!e) {
        e = { picker: null, extras: [] };
        this.map.set(form, e);
        form.addEventListener('submit', this.onSubmit.bind(this, form, e), true);
      }
      return e;
    },
    register: function (form, picker) {
      var e = this.entry(form);
      if (e) e.picker = picker;
    },
    registerExtra: function (form, extra) {
      var e = this.entry(form);
      if (e) e.extras.push(extra);
    },
    onSubmit: function (form, e, event) {
      if (e.picker && e.picker.needsSelection) {
        event.preventDefault();
        event.stopImmediatePropagation();
        e.picker.requestAttention();
        return;
      }
      form.querySelectorAll('.pdp-injected').forEach(function (el) { el.remove(); });
      var extras = e.extras.map(function (x) { return x.extraItem; }).filter(Boolean);
      if (!extras.length) return;

      var add = function (name, value) {
        var input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        input.className = 'pdp-injected';
        form.appendChild(input);
      };
      var otherItems = form.querySelectorAll('input[name^="items["][name$="][id]"]:not(.pdp-injected)');
      var index = 50;
      if (!otherItems.length) {
        // Produit principal passé en items[0] pour éviter un double ajout
        var idInput = form.querySelector('input[name="id"]');
        if (!idInput || !idInput.value) return;
        var qtyInput = form.querySelector('input[name="quantity"]') || document.querySelector('input[name="quantity"][form="' + form.id + '"]');
        add('items[0][id]', idInput.value);
        add('items[0][quantity]', (qtyInput && qtyInput.value) || 1);
        form.querySelectorAll('[name^="properties["]').forEach(function (p) {
          if ((p.type === 'checkbox' || p.type === 'radio') && !p.checked) return;
          add('items[0][properties]' + p.name.slice('properties'.length), p.value);
        });
        var plan = form.querySelector('input[name="selling_plan"]');
        if (plan && plan.value) add('items[0][selling_plan]', plan.value);
        idInput.name = 'pdp_main_id';
        setTimeout(function () { idInput.name = 'id'; }, 0);
      }
      extras.forEach(function (item) {
        add('items[' + index + '][id]', item.id);
        add('items[' + index + '][quantity]', item.quantity);
        Object.keys(item.properties).forEach(function (k) {
          add('items[' + index + '][properties][' + k + ']', item.properties[k]);
        });
        index++;
      });
      setTimeout(function () {
        form.querySelectorAll('.pdp-injected').forEach(function (el) { el.remove(); });
      }, 0);
    }
  };

  if (!customElements.get('pdp-variant-cards')) customElements.define('pdp-variant-cards', PdpVariantCards);
  if (!customElements.get('pdp-second-item')) customElements.define('pdp-second-item', PdpSecondItem);
})();
