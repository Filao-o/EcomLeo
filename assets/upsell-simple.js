/**
 * Product Upsell Handlers
 * Global functions for handling product upsell add to cart and variant selection
 */

// Handle variant selection change
window.handleProductUpsellVariantChange = function (selectElement, formId) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error("Form not found:", formId);
    return;
  }

  const productJsonEl = document.getElementById("ProductJson-" + formId);
  if (!productJsonEl) {
    console.error("Product JSON not found for form:", formId);
    return;
  }

  try {
    const product = JSON.parse(productJsonEl.textContent);
    const selects = form.querySelectorAll('select[name^="options["]');
    const selectedOptions = Array.from(selects).map((s) => s.value);

    // Find matching variant
    const variant = product.variants.find((v) => selectedOptions.every((opt, i) => v.options[i] === opt));

    if (variant) {
      const hiddenInput = form.querySelector('input[name="id"]');
      if (hiddenInput) {
        hiddenInput.value = variant.id;
      }

      // Update price if displayed
      const priceElement = form.querySelector(".upsell-price");
      if (priceElement && variant.price) {
        const currency = document.querySelector('meta[name="currency"]')?.content || "USD";
        const formattedPrice = formatMoney(variant.price, currency);
        priceElement.textContent = formattedPrice;
      }
    }
  } catch (error) {
    console.error("Error handling variant change:", error);
  }
};

// Handle add to cart
window.handleProductUpsellAdd = async function (buttonElement, formId) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error("Form not found:", formId);
    return;
  }

  const variantId = form.querySelector('input[name="id"]')?.value;
  if (!variantId) {
    console.error("No variant ID found");
    return;
  }

  // Disable button and show loading state
  const originalHTML = buttonElement.innerHTML;
  buttonElement.disabled = true;
  buttonElement.classList.add("is-loading");
  buttonElement.innerHTML = '<span class="button-spinner"></span>';

  try {
    // Add to cart
    const response = await fetch(window.routes.cart_add_url + ".js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        items: [{ id: variantId, quantity: 1 }],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to add to cart");
    }

    // Try to parse as JSON, handle errors gracefully
    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse cart response:", parseError);
      throw new Error("Invalid cart response");
    }

    // Show success state
    buttonElement.classList.remove("is-loading");
    buttonElement.classList.add("upsell-add-success");
    buttonElement.innerHTML = "✓ Added!";

    // Reset button after 2 seconds
    setTimeout(() => {
      buttonElement.classList.remove("upsell-add-success");
      buttonElement.innerHTML = originalHTML;
      buttonElement.disabled = false;
    }, 2000);

    // Update cart count bubble
    fetch("/cart.js")
      .then((r) => r.json())
      .then((cart) => {
        document.querySelectorAll(".cart-count-bubble, [data-cart-count]").forEach((el) => {
          el.textContent = cart.item_count;
        });
      })
      .catch(() => {});

    // Refresh cart drawer
    const cartDrawer = document.querySelector("cart-drawer");
    if (cartDrawer) {
      fetch(`${window.routes.cart_url}?section_id=cart-drawer`)
        .then((r) => r.text())
        .then((html) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const newCartDrawer = doc.querySelector("cart-drawer");
          if (newCartDrawer) {
            cartDrawer.innerHTML = newCartDrawer.innerHTML;
            // restart upsell scripts
            upsellCarousel();
          }
        })
        .catch(() => {});
    }
  } catch (error) {
    console.error("Error adding to cart:", error);

    // Show error state
    buttonElement.classList.remove("is-loading");
    buttonElement.classList.add("upsell-add-error");
    buttonElement.innerHTML = "✗ Error";

    // Reset button after 2 seconds
    setTimeout(() => {
      buttonElement.classList.remove("upsell-add-error");
      buttonElement.innerHTML = originalHTML;
      buttonElement.disabled = false;
    }, 2000);
  }
};

// Handle toggle switch add/remove from cart
window.handleProductUpsellToggle = async function (toggleElement, formId, uniqueId) {
  // Prevent double-calling
  if (toggleElement.dataset.processing === "true") {
    return;
  }
  toggleElement.dataset.processing = "true";

  const form = document.getElementById(formId);
  if (!form) {
    console.error("Form not found:", formId);
    toggleElement.checked = !toggleElement.checked; // Revert
    toggleElement.dataset.processing = "false";
    return;
  }

  const variantId = form.querySelector('input[name="id"]')?.value;
  if (!variantId) {
    console.error("No variant ID found");
    toggleElement.checked = !toggleElement.checked; // Revert
    toggleElement.dataset.processing = "false";
    return;
  }

  // Use uniqueId to find the toggle switch more reliably
  const toggleSwitch = document.querySelector(".upsell-toggle-switch-" + uniqueId) || toggleElement.parentElement;
  const isAdding = toggleElement.checked;

  const cartAddUrl = window.routes?.cart_add_url || "/cart/add";
  const cartChangeUrl = window.routes?.cart_change_url || "/cart/change";

  // Show loading state
  if (toggleSwitch) {
    toggleSwitch.classList.add("is-loading");
  }

  try {
    if (isAdding) {
      // Add to cart
      const response = await fetch(cartAddUrl + ".js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          items: [{ id: variantId, quantity: 1 }],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add to cart");
      }
    } else {
      // Remove from cart - first get cart to find the line item
      const cartResponse = await fetch("/cart.js");
      const cart = await cartResponse.json();

      // Find the item in cart
      const cartItem = cart.items.find((item) => item.variant_id == variantId);

      if (cartItem) {
        // Calculate new quantity (decrease by 1)
        const newQuantity = cartItem.quantity - 1;

        // Update cart
        const response = await fetch(cartChangeUrl + ".js", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            id: variantId.toString(),
            quantity: newQuantity,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to remove from cart");
        }
      }
    }

    // Success - remove loading state
    if (toggleSwitch) {
      toggleSwitch.classList.remove("is-loading");
    }
    toggleElement.dataset.processing = "false";

    // Update cart count bubble
    fetch("/cart.js")
      .then((r) => r.json())
      .then((cart) => {
        document.querySelectorAll(".cart-count-bubble, [data-cart-count]").forEach((el) => {
          el.textContent = cart.item_count;
        });
      })
      .catch(() => {});

    // Refresh cart drawer
    const cartDrawer = document.querySelector("cart-drawer");
    if (cartDrawer) {
      fetch(`${window.routes.cart_url}?section_id=cart-drawer`)
        .then((r) => r.text())
        .then((html) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");
          const newCartDrawer = doc.querySelector("cart-drawer");
          if (newCartDrawer) {
            cartDrawer.innerHTML = newCartDrawer.innerHTML;
          }
        })
        .catch(() => {});
    }
  } catch (error) {
    console.error("Error updating cart:", error);

    // Revert toggle state on error
    toggleElement.checked = !toggleElement.checked;
    if (toggleSwitch) {
      toggleSwitch.classList.remove("is-loading");
    }
    toggleElement.dataset.processing = "false";
  }
};

// Event delegation for toggle switches - more reliable than inline handlers
document.addEventListener("DOMContentLoaded", function () {
  document.addEventListener("change", function (e) {
    if (e.target.classList.contains("upsell-toggle-input")) {
      const formId = e.target.dataset.formId;
      const uniqueId = e.target.dataset.uniqueId;
      if (formId && uniqueId) {
        handleProductUpsellToggle(e.target, formId, uniqueId);
      }
    }
  });
});
// Helper function to format money
function formatMoney(cents, currency = "USD") {
  const amount = cents / 100;

  // Try to use Shopify's money format if available
  if (typeof Shopify !== "undefined" && Shopify.formatMoney) {
    return Shopify.formatMoney(cents, Shopify.money_format || "{{amount}}");
  }

  // Fallback formatting
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}
