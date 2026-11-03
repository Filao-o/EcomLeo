/**
 * * end of cart upsell block part
 */
document.addEventListener("DOMContentLoaded", function () {
  const amountFreeProduct = document.querySelector("[data-treshold-product]")
    ? document.querySelector("[data-treshold-product]").getAttribute("data-treshold-product")
    : null;

  var cartTotalEl = document.querySelector(".gb-totals-total-value");
  var cart_total = cartTotalEl ? (cartTotalEl.textContent || "").trim() : "";
  if (amountFreeProduct > 0 && show_progress_bar) {
    const hasPremiumKit = document.querySelector(".premium-attachment-kit") !== null;
    if (hasPremiumKit) {
      console.log("Premium kit detected - skipping auto free gift trigger");
      return;
    }
    setTimeout(function () {
      var el = document.querySelector(".gb-totals-total-value");
      var cart_total = el ? (el.textContent || "").trim() : "";
      if (cart_total >= amountFreeProduct) {
        if (document.querySelector(".cart-item.gb-find-remove-product")) {
          console.log("Free product already in cart");
        } else {
          console.log("Adding free product");
          var trigger = document.querySelector(".gb-free-product-trigger");
          if (trigger) trigger.click();
        }
      } else {
        console.log("Removing free product - under threshold");
        var removeBtn = document.querySelector(".gb-remove-product");
        if (removeBtn) removeBtn.click();
      }
    }, 3000);

    document.body.addEventListener("click", function (e) {
      if (!e.target.closest(".gb-sumbit-free")) return;
      setTimeout(function () {
        var el = document.querySelector(".gb-totals-total-value");
        var cart_total = el ? (el.textContent || "").trim() : "";
        if (cart_total >= amountFreeProduct) {
          if (!document.querySelector(".cart-item.gb-find-remove-product")) {
            var trigger = document.querySelector(".gb-free-product-trigger");
            if (trigger) trigger.click();
          }
        } else {
          var removeBtn = document.querySelector(".gb-remove-product");
          if (removeBtn) removeBtn.click();
        }
      }, 3000);
    });
  }

  document.body.addEventListener("click", async function (e) {
    var label = e.target.closest && e.target.closest(".gb-shipping-protection-button label.switch");
    if (!label) return;
    if (e.target.tagName === "INPUT") return;
    const curElem = document.querySelector(".gb-shipping-protection-button label.switch");
    const curInputElem = document.querySelector(".gb-shipping-protection-button label.switch input");
    const spinAnim = document.querySelector(".gb-shipping-protection-button .spin-animation");
    const checkElem = document.querySelector(".gb-shipping-protection-button .complete-check");
    const wasChecked = curElem && curElem.classList.contains("checked");

    if (!wasChecked) {
      if (!curElem || !curInputElem || !spinAnim || !checkElem) return;
      if (spinAnim.style.display === "block" || curInputElem.checked) return;
      const form = document.querySelector("form.shipping-protection-form");

      const formData = new FormData(form);
      if (!formData.get("id")) {
        console.error(
          "There is no shipping protection product selected. Please select the shipping product in the global theme settings",
        );
        return;
      }

      spinAnim.style.display = "block";

      try {
        const response = await fetch(routes.cart_add_url, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });

        if (response.ok) {
          spinAnim.style.display = "none";

          checkElem.style.display = "block";
        }
      } catch (err) {
        console.error("error at shipping protection form submission", err);
      }
      fetch(routes.cart_url + "?view=drawer")
        .then((response) => response.text())
        .then((html) => {
          const cartDrawer = document.querySelector("#CartDrawer");
          const parsedCartHtml = parser.parseFromString(html, "text/html");
          const newCartDrawer = parsedCartHtml.querySelector("#CartDrawer");
          if (cartDrawer && newCartDrawer) {
            updateCartDrawer(cartDrawer, newCartDrawer, true, () => {
              curElem.classList.remove("unchecked");
              curElem.classList.add("checked");
              curInputElem.checked = true;
            });
          }
        })
        .catch((_err) => {
          curElem.classList.remove("unchecked");
          curElem.classList.add("checked");
          curInputElem.checked = true;
        });
    } else {
      checkElem.style.display = "none";
      const cartDrawer = document.querySelector("#CartDrawer");
      const removeButton = cartDrawer.querySelector(`cart-remove-button[data-id="${shippingProductId}"]`);
      const shippingItemIndex = removeButton?.dataset.index;

      const removeCallback = () => {
        curElem.classList.remove("checked");
        curElem.classList.add("unchecked");
        curInputElem.checked = false;
      };

      const cartItems = cartDrawer.querySelector("cart-items") || cartDrawer.querySelector("cart-drawer-items");

      if (removeButton && shippingItemIndex && cartItems?.updateQuantity) {
        const event = new CustomEvent("remove-shipping-protection", {
          detail: null,
        });
        cartItems.updateQuantity(shippingItemIndex, 0, event, "", "", removeCallback);
      } else {
        fetch(routes.cart_change_url, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ id: shippingProductId, quantity: 0 }),
        })
          .then(() => fetch(routes.cart_url + "?view=drawer"))
          .then((response) => response.text())
          .then((html) => {
            const cartDrawer = document.querySelector("#CartDrawer");
            const parsedCartHtml = parser.parseFromString(html, "text/html");
            const newCartDrawer = parsedCartHtml.querySelector("#CartDrawer");
            if (cartDrawer && newCartDrawer) {
              updateCartDrawer(cartDrawer, newCartDrawer, true, removeCallback);
            } else {
              removeCallback();
            }
          })
          .catch(() => {
            removeCallback();
          });
      }
    }
  });

  document.body.addEventListener("change", function (e) {
    var select = e.target.closest && e.target.closest(".gb-change-variant_id");
    if (!select) return;
    var opt = select.options[select.selectedIndex];
    var id_change = opt ? opt.getAttribute("data-variant-id") : null;
    if (!id_change) {
      console.error("No data-variant-id found on selected option");
      return;
    }
    var block = select.closest(".gb-get-main-freq-pro");
    var input = block ? block.querySelector(".product-variant-id") : null;
    if (input) input.value = id_change;
  });
});

document.addEventListener("change", function (e) {
  if (e.target.matches(".cart-drawer .gbfrequently-bought-with-main-whole .select__select")) {
    const parentBlock = e.target.closest(".gb-get-main-freq-pro");
    if (!parentBlock) {
      console.log("Error: Could not find parent block");
      return;
    }

    const allValues = Array.from(parentBlock.querySelectorAll(".select__select"))
      .map((sel) => sel.value)
      .join(" / ");

    const variantSelect = parentBlock.querySelector('[name="variants"]');
    if (!variantSelect) {
      console.log("Error: Could not find variant selector");
      return;
    }

    const matchedOption = Array.from(variantSelect.options).find((option) => option.text.includes(allValues));

    const idInput = parentBlock.querySelector('[name="id"]');
    if (!idInput) {
      console.log("Error: Could not find id input field");
      return;
    }

    if (matchedOption) {
      console.log("Matched variant option value:", matchedOption.value);
      idInput.value = matchedOption.value;
      console.log("Set ID input value to:", idInput.value);
    } else {
      console.log("No matching variant found for:", allValues);
    }
  }
});

// Add validation for form submissions to ensure ID parameter is present
document.addEventListener("submit", function (e) {
  if (e.target.action && e.target.action.includes("/cart/add")) {
    const idInput = e.target.querySelector('[name="id"]');
    if (!idInput || !idInput.value) {
      console.log("Preventing submission - missing id parameter");
      e.preventDefault();
      return false;
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  function handleCartQuantityChange(e) {
    var cartItem = e.target.closest(".cart-item");
    if (!cartItem) return;
    var trigger =
      e.target.closest(".quantity__button") ||
      e.target.closest(".quantity__input") ||
      (e.target.matches && e.target.matches(".quantity__input") ? e.target : null);
    if (!trigger) return;
    var quantityInputWrap = trigger.closest(".quantity-input");
    var qtyInput = quantityInputWrap ? quantityInputWrap.querySelector(".quantity__input") : null;
    var variantId = qtyInput ? qtyInput.getAttribute("data-quantity-variant-id") : null;
    var form = trigger.closest("form");
    if (!form) return;
    var idInput = form.querySelector('input[name="id"]');
    if (!idInput && variantId) {
      console.log("Adding missing ID input to cart form");
      var newIdInput = document.createElement("input");
      newIdInput.type = "hidden";
      newIdInput.name = "id";
      newIdInput.value = variantId;
      form.appendChild(newIdInput);
    } else if (idInput && variantId) {
      idInput.value = variantId;
    }
  }
  document.addEventListener("click", handleCartQuantityChange);
  document.addEventListener("change", handleCartQuantityChange);
  document.addEventListener("input", handleCartQuantityChange);

  var checkoutBtn = document.getElementById("CartDrawer-Checkout");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function (e) {
      var form = document.getElementById("CartDrawer-Form");
      if (!form) return;
      var cartItems = form.querySelectorAll(".cart-item");
      if (cartItems.length === 0) {
        console.log("No items in cart, preventing checkout");
        e.preventDefault();
        return false;
      }
      console.log("Cart checkout with", cartItems.length, "items");
    });
  }

  document.addEventListener("keydown", function (e) {
    var input =
      (e.target.matches && e.target.matches(".quantity__input")
        ? e.target
        : e.target.closest && e.target.closest(".quantity__input")) || null;
    if (!input) return;
    if (e.key === "Enter" || e.keyCode === 13) {
      e.preventDefault();
      input.blur();
    }
  });
});

document.addEventListener("DOMContentLoaded", function () {
  document.body.addEventListener("click", function (e) {
    var btn =
      e.target.closest(".gbfrequently-bought-with-main-whole button") ||
      e.target.closest(".gbfrequently-bought-with-main-whole .gb-sumbit-free") ||
      e.target.closest(".gb-free-product-trigger") ||
      e.target.closest(".gb-product-shipping-protection-product-tirgger") ||
      e.target.closest(".gb-product-sticky-add-to-cart-form");
    if (!btn) return;
    var parentBlock = btn.closest(".gb-get-main-freq-pro") || btn.closest("form");
    if (!parentBlock) {
      console.error("Could not find parent block for frequently bought product");
      return;
    }
    var productId = null;
    var idInput = parentBlock.querySelector('input[name="id"]');
    if (idInput && idInput.value) {
      productId = idInput.value;
    } else if (parentBlock.querySelector(".gb-change-variant_id")) {
      var select = parentBlock.querySelector(".gb-change-variant_id");
      var opt = select && select.options[select.selectedIndex];
      if (opt) {
        productId = opt.getAttribute("data-variant-id");
      }
    } else if (parentBlock.querySelector(".product-variant-id")) {
      var variantInput = parentBlock.querySelector(".product-variant-id");
      productId = variantInput ? variantInput.value : null;
    } else if (btn.getAttribute("data-variant-id")) {
      productId = btn.getAttribute("data-variant-id");
    }
    console.log("Frequently bought product add to cart - ID:", productId);
    if (btn.classList.contains("gb-free-product-trigger") && !show_progress_bar) return;
    if (!productId) {
      console.error("Missing product ID for frequently bought product");
      e.preventDefault();
      return false;
    }
    if (!idInput) {
      console.log("Adding missing ID input to frequently bought product form");
      var newIdInput = document.createElement("input");
      newIdInput.type = "hidden";
      newIdInput.name = "id";
      newIdInput.value = productId;
      parentBlock.appendChild(newIdInput);
    } else {
      idInput.value = productId;
    }
    var quantityInput = parentBlock.querySelector('input[name="quantity"]');
    if (!quantityInput) {
      console.log("Adding default quantity input to frequently bought product form");
      var newQtyInput = document.createElement("input");
      newQtyInput.type = "hidden";
      newQtyInput.name = "quantity";
      newQtyInput.value = "1";
      parentBlock.appendChild(newQtyInput);
    } else if (!quantityInput.value || parseFloat(quantityInput.value, 10) < 1) {
      quantityInput.value = "1";
    }
  });
});

