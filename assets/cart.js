/**
 * ========================================
 * CART UTILITIES - cart.js
 * ========================================
 * This file contains all cart-related logic including:
 * - Free gifts management (premium-attachment-kit)
 * - Cart drawer updates and animations
 * - Progress bar functionality
 * ========================================
 */

var parser = parser ?? new DOMParser();

// ========================================
// CONFIGURATION & CONSTANTS
// ========================================

// Timing constants for animations and delays
const TIMING = {
  LINKED_GIFTS_REMOVAL_DELAY: 10,
  LINKED_GIFTS_ADJUSTMENT_DELAY: 10,
  SETTINGS_GIFTS_REMOVAL_DELAY: 50,
  PROGRESS_BAR_ANIMATION: 1000,
  ERROR_DISPLAY_DURATION: 4000,
  ARIA_HIDDEN_DELAY: 1000,
};

// ========================================
// DOM CACHE
// ========================================

// Cache for frequently accessed DOM selectors to improve performance
const DOMCache = {
  _cache: {},
  get(key, selector) {
    if (!this._cache[key]) {
      this._cache[key] = document.querySelector(selector);
    }
    return this._cache[key];
  },
  invalidate(key) {
    if (key) {
      delete this._cache[key];
    } else {
      this._cache = {};
    }
  },
};

// ========================================
// HELPER FUNCTIONS
// ========================================

// Utility functions for cart operations
const helpers = {
  safeCallback(callbackFn) {
    if (callbackFn && typeof callbackFn === "function") {
      callbackFn();
    }
  },
  log(message, data, level = "debug") {
    if (window.elxr && window.elxr.log) {
      window.elxr.log(message, data, level);
    }
  },
  error(message, error) {
    if (window.elxr && window.elxr.log) {
      window.elxr.log(message, { error }, "error");
    } else {
      console.error(message, error);
    }
  },
  // Check if items have linked gifts
  hasLinkedGifts(items, productId, propertyKey = "_linked_to_product") {
    return items.some(
      (item) =>
        item.properties &&
        item.properties._is_free_gift === "true" &&
        String(item.properties[propertyKey]) === String(productId),
    );
  },
  // Get linked gifts for a product
  getLinkedGifts(items, productId, propertyKey = "_linked_to_product") {
    return items.filter(
      (item) =>
        item.properties &&
        item.properties._is_free_gift === "true" &&
        String(item.properties[propertyKey]) === String(productId),
    );
  },
  // Check if product exists in cart
  productExistsInCart(items, productId) {
    return items.some((item) => String(item.product_id) === String(productId));
  },
  // Find product by id
  findProductById(items, productId) {
    return items.find((item) => String(item.product_id) === String(productId));
  },
};

// ========================================
// PUBLIC API
// ========================================

// Expose cart functions for external use
window.cartFunctions = {
  animateProgressBar,
  replaceCartComponent,
  updateBubbleCount,
  addFreeProduct,
  removeFreeProduct,
  updateCartDrawer,
  removeAllGiftsFromSettings,
};

// ========================================
// CART CONFIGURATION
// ========================================

const cartSectionsList = [
  "#CartDrawer-CartItems",
  ".gb-discounts-cart-values",
  ".discount-banner",
  ".free-product-progress-bar-successfull",
];
const cartSectionsToRenderList = [
  {
    id: "CartDrawer",
    section: "cart-drawer",
    selector: ".drawer__inner",
  },
  {
    id: "cart-icon-bubble",
    section: "cart-icon-bubble",
    selector: ".shopify-section",
  },
];

const upsellCarousel = () => {
  const container = document.querySelector('.upsell_block_container');
  const prevButton = document.getElementById('slide-arrow-prev');
  const nextButton = document.getElementById('slide-arrow-next');
  const dots = document.querySelectorAll('.slide_item');

  if (!container || !prevButton || !nextButton) return;

  const slides = container.children;
  if (slides.length === 0) return;

  let currentIndex = 0;

  function updateDots() {
    const containerWidth = container.clientWidth;
    const scrollLeft = container.scrollLeft;
    const newIndex = Math.round(scrollLeft / containerWidth);

    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < dots.length) {
      currentIndex = newIndex;
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });
    }
  }

  function goToSlide(targetIndex) {
    const totalSlides = dots.length > 0 ? dots.length : slides.length;
    currentIndex = ((targetIndex % totalSlides) + totalSlides) % totalSlides;

    const containerWidth = container.clientWidth;
    const scrollPosition = containerWidth * currentIndex;

    container.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  // Detect manual scroll and update dots
  let scrollTimeout;
  container.addEventListener('scroll', function() {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      updateDots();
    }, 150);
  }, { passive: true });

  // Touch/Swipe handling for mobile
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartTime = 0;
  const minSwipeDistance = 50;
  const maxSwipeTime = 300;

  container.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartTime = Date.now();
  }, { passive: true });

  container.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    const touchTime = Date.now() - touchStartTime;
    handleSwipe(touchTime);
  }, { passive: true });

  function handleSwipe(touchTime) {
    const swipeDistance = touchStartX - touchEndX;
    const absDistance = Math.abs(swipeDistance);

    if (absDistance > minSwipeDistance && touchTime < maxSwipeTime) {
      if (swipeDistance > 0) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(currentIndex - 1);
      }
    }
  }

  // Button clicks
  nextButton.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    goToSlide(currentIndex + 1);
  });

  prevButton.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    goToSlide(currentIndex - 1);
  });

  // Dot clicks
  dots.forEach((dot, index) => {
    dot.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      goToSlide(index);
    });
  });

  // Initialize
  goToSlide(0);
};

window.addEventListener('DOMContentLoaded', upsellCarousel);

const cartDiscountBlock = () => {
  const block = document.querySelector('#cart-discount-code-form-block');
  console.log('block: ', block);
  if (!block) return;

  const form = block.querySelector('.cart-discount-code-form');
  const input = block.querySelector('.cart-discount-code-input');
  const button = block.querySelector('.cart-discount-code-button');
  const message = block.querySelector('.cart-discount-code-message');
  const successMessage = block.dataset.successMessage;
  const errorMessage = block.dataset.errorMessage;
  const emptyCodeMessage = block.dataset.emptyCodeMessage;
  const codeExistsMessage = block.dataset.codeExistsMessage;

  if (!form) return;

  // ---- Prevent duplicate event listeners ---- //
  if (form.dataset.initialized === "true") {
    // Already initialized
    return;
  }
  form.dataset.initialized = "true";

  const showMessage = (text, type) => {
    message.textContent = text;
    message.className = `cart-discount-code-message ${type}`;
  };

  const setLoading = (loading) => {
    button.classList.toggle('loading', loading);
    button.disabled = loading;

    if (loading) {
      message.textContent = '';
      message.className = 'cart-discount-code-message';
    }
  };

  // --- Update Cart Drawer After Discount ---
  const updateCartAfterDiscount = async (expectedCode) => {
    try {
      const cartDrawerContainer = document.querySelector('cart-drawer');
      if (!cartDrawerContainer) {
        console.error('Cart drawer not found');
        return { success: false };
      }

      const discountCodesBefore = cartDrawerContainer.querySelectorAll('.drawer-discounts-row .discount-code');

      const cartResponse = await fetch('/cart.js');
      const cartData = await cartResponse.json();

      const response = await fetch(`${window.Shopify.routes.root}cart?section_id=cart-drawer`);
      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newCartDrawer = doc.querySelector('#CartDrawer');

      if (!newCartDrawer) {
        console.error('New cart drawer not found in response');
        return { success: false };
      }

      updateCartDrawer(cartDrawerContainer, newCartDrawer, true, () => {
        if (window.publish && window.PUB_SUB_EVENTS) {
          window.publish(window.PUB_SUB_EVENTS.cartUpdate, {
            source: 'cart-discount-code',
            cartData: cartData,
          });
        }
      });

      setTimeout(() => {
        const discountCodesApplied = document.querySelectorAll('.drawer-discounts-row .discount-code');

        const isCodeExistsBefore = Array.from(discountCodesBefore).filter(discount => discount.dataset.discountCode.toLowerCase() === expectedCode.toLowerCase())[0];

        const isCodeAdded = Array.from(discountCodesApplied).filter(discount => discount.dataset.discountCode.toLowerCase() === expectedCode.toLowerCase())[0];

        const detailData = {
          message: !isCodeExistsBefore && isCodeAdded ? successMessage : isCodeExistsBefore && isCodeAdded ? codeExistsMessage : errorMessage,
          type: !isCodeExistsBefore && isCodeAdded ? 'success' : 'error',
        }

        window.dispatchEvent(
          new CustomEvent("DiscountCodeApplied", {
            detail: detailData
          })
        );
      }, 1000);
      
      return { success: true, cartData: cartData };
    } catch (error) {
      console.error('Error updating cart after discount:', error);
      return { success: false };
    }
  };

  // ---- Submit Event ---- //
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = input.value.trim();
    if (!code) {
      showMessage(emptyCodeMessage, 'error');
      return;
    }

    setLoading(true);

    try {
      // Attempt to apply discount
      let discountApplied = false;

      try {
        const response = await fetch(`/discount/${encodeURIComponent(code)}`, {
          method: 'GET',
          redirect: 'manual',
          credentials: 'include'
        });

        if (response.type === 'opaqueredirect' || response.status === 0 || response.status === 302) {
          discountApplied = true;
          console.log('response: ', response);
        }

      } catch (fetchError) {
        // Expected when redirect is blocked by fetch
        console.log('Discount fetch completed (redirect intercepted)');
        discountApplied = true;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const result = await updateCartAfterDiscount(code);
      if (result.success) {
        showMessage(successMessage, 'success');
        input.value = '';
      } else {
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error applying discount code:', error);
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  });
};

window.addEventListener('DOMContentLoaded', cartDiscountBlock);

window.addEventListener('DiscountCodeApplied', (e) => {
  console.log("Re-running cartDiscountBlock() due to DiscountCodeApplied event");

  const messageEl = document.querySelector('#cart-discount-code-form-block .cart-discount-code-message');
  const { message, type } = e.detail;

  messageEl.innerText = message;
  if(type === 'success') {
    messageEl.classList.remove('error');
    messageEl.classList.add('success');
  } else {
    messageEl.classList.add('error');
    messageEl.classList.remove('success');
  }

  setTimeout(() => {
    messageEl.innerHTML = '';
  }, 4000);
  cartDiscountBlock();
});

window.subscribe(window.PUB_SUB_EVENTS.cartUpdate, (event) => {
  setTimeout(() => {
    cartDiscountBlock();
    upsellCarousel();
  }, 1000);
});

// Remove free gifts linked to a specific product (for premium-attachment-kit)
function removeLinkedFreeGifts(productId, cartItems, callbackFn, refreshAfter = false) {
  if (!productId || !cartItems) {
    helpers.safeCallback(callbackFn);
    return;
  }

  const cartDrawerContainer = document.querySelector("cart-drawer");
  if (!cartDrawerContainer) {
    helpers.error("Cart drawer not found.", new Error("Missing cart-drawer element"));
    helpers.safeCallback(callbackFn);
    return;
  }

  // Find all items with _linked_to_product property matching the removed product
  const linkedGiftItems = helpers.getLinkedGifts(cartItems, productId);

  if (linkedGiftItems.length === 0) {
    helpers.safeCallback(callbackFn);
    return;
  }

  helpers.log("removeLinkedFreeGifts", { productId, linkedGiftItems });

  const updates = {};
  linkedGiftItems.forEach((gift) => {
    updates[gift.key] = 0;
  });

  fetch(window.Shopify.routes.root + "cart/update.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      updates,
      sections: cartSectionsToRenderList.map((s) => s.section),
      sections_url: window.location.pathname,
    }),
  })
    .then((res) => res?.text())
    .then((state) => {
      if (!state) {
        helpers.safeCallback(callbackFn);
        return;
      }

      // If refreshAfter is true, update the cart drawer to show changes
      if (refreshAfter) {
        const parsedState = JSON.parse(state);
        const newCartDrawer = parser
          .parseFromString(parsedState.sections["cart-drawer"], "text/html")
          .querySelector("#CartDrawer");

        if (newCartDrawer) {
          const oldCart = document.querySelector("cart-drawer");
          updateCartDrawer(oldCart, newCartDrawer, false, callbackFn);
        } else {
          helpers.safeCallback(callbackFn);
        }
      } else {
        helpers.safeCallback(callbackFn);
      }
    })
    .catch((error) => {
      helpers.error("Error while deleting linked free gifts", error);
      helpers.safeCallback(callbackFn);
    });
}

// Adjust quantity of linked free gifts when product quantity changes
function adjustLinkedFreeGiftsQuantity(productId, cartItems, callbackFn, refreshAfter = false) {
  if (!productId || !cartItems) {
    helpers.safeCallback(callbackFn);
    return;
  }

  const cartDrawerContainer = document.querySelector("cart-drawer");
  if (!cartDrawerContainer) {
    helpers.error("Cart drawer not found.", new Error("Missing cart-drawer element"));
    helpers.safeCallback(callbackFn);
    return;
  }

  // Find the current quantity of the main product
  const mainProduct = helpers.findProductById(cartItems, productId);
  if (!mainProduct) {
    helpers.safeCallback(callbackFn);
    return;
  }

  const targetQuantity = mainProduct.quantity;

  // Find all linked gift items directly from cartItems (no need to refetch)
  const linkedGiftItems = helpers.getLinkedGifts(cartItems, productId);

  if (linkedGiftItems.length === 0) {
    helpers.safeCallback(callbackFn);
    return;
  }

  helpers.log("adjustLinkedFreeGiftsQuantity", { productId, targetQuantity, linkedGiftItems });

  // Adjust quantity of each gift to match the main product
  const updates = {};
  linkedGiftItems.forEach((gift) => {
    // Only update if quantity is different
    if (gift.quantity !== targetQuantity) {
      updates[gift.key] = targetQuantity;
    }
  });

  // If no updates needed, just return
  if (Object.keys(updates).length === 0) {
    helpers.safeCallback(callbackFn);
    return;
  }

  // Perform the update
  fetch(window.Shopify.routes.root + "cart/update.js", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      updates,
      sections: cartSectionsToRenderList.map((s) => s.section),
      sections_url: window.location.pathname,
    }),
  })
    .then((res) => res?.text())
    .then((state) => {
      if (!state) {
        helpers.safeCallback(callbackFn);
        return;
      }

      // If refreshAfter is true, update the cart drawer to show changes
      if (refreshAfter) {
        const parsedState = JSON.parse(state);
        const newCartDrawer = parser
          .parseFromString(parsedState.sections["cart-drawer"], "text/html")
          .querySelector("#CartDrawer");

        if (newCartDrawer) {
          const oldCart = document.querySelector("cart-drawer");
          updateCartDrawer(oldCart, newCartDrawer, false, callbackFn);
        } else {
          helpers.safeCallback(callbackFn);
        }
      } else {
        helpers.safeCallback(callbackFn);
      }
    })
    .catch((error) => {
      helpers.error("Error while adjusting linked free gifts quantity", error);
      helpers.safeCallback(callbackFn);
    });
}

// Remove all free gifts from global settings (for progress bar system)
function removeAllGiftsFromSettings(callbackFn) {
  let freeGiftProductIds = null;

  if (Alpine && Alpine.store) {
    const store = Alpine.store(AlpineStoreKeys.FREE_GIFT_STORE);
    if (store) {
      freeGiftProductIds = store.freeGiftProductIds || null;
      helpers.log("removeAllGiftsFromSettings", { freeGiftProductIds });
    }
  }

  if (!freeGiftProductIds || freeGiftProductIds.length === 0) {
    helpers.safeCallback(callbackFn);
    return;
  }

  const cartDrawerContainer = document.querySelector("cart-drawer");
  if (!cartDrawerContainer) {
    helpers.error("Cart drawer not found.", new Error("Missing cart-drawer element"));
    helpers.safeCallback(callbackFn);
    return;
  }

  fetch("/cart.js")
    .then((res) => res.json())
    .then((cart) => {
      // Only remove free gifts from progress bar (without _linked_to_product property)
      const giftItems = cart.items.filter(
        (item) =>
          item.price === 0 &&
          freeGiftProductIds.includes(`${item.product_id}`) &&
          (!item.properties || !item.properties._linked_to_product),
      );

      if (giftItems.length === 0) {
        helpers.safeCallback(callbackFn);
        return;
      }

      const updates = {};
      giftItems.forEach((gift) => {
        updates[gift.key] = 0;
      });

      return fetch(window.Shopify.routes.root + "cart/update.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates,
          sections: cartSectionsToRenderList.map((s) => s.section),
          sections_url: window.location.pathname,
        }),
      });
    })
    .then((res) => res?.text())
    .then((state) => {
      if (!state) return;
      const parsedState = JSON.parse(state);
      const newCartDrawer = parser
        .parseFromString(parsedState.sections["cart-drawer"], "text/html")
        .querySelector("#CartDrawer");

      if (newCartDrawer) {
        const oldCart = document.querySelector("cart-drawer");
        updateCartDrawer(oldCart, newCartDrawer, false, callbackFn);
        const newTotalValue = parseInt(newCartDrawer.querySelector(".gb-totals-total-value").innerText ?? "0");
        const variantInput = document.querySelector("form.free-product-form .product-variant-id");
        const freeProductId = variantInput ? variantInput.value : null;
        const amountFreeProduct = document.querySelector("[data-treshold-product]")
          ? document.querySelector("[data-treshold-product]").getAttribute("data-treshold-product")
          : null;
        if (newTotalValue < amountFreeProduct && !!freeProductId && show_progress_bar) {
          removeFreeProduct(oldCart);
        }
      } else {
        helpers.safeCallback(callbackFn);
      }
    })
    .catch((error) => {
      helpers.error("Error while deleting free gift product", error);
      helpers.safeCallback(callbackFn);
    });
}

function removeFreeProduct(cartDrawer, callbackFn) {
  if (cartDrawer.classList.contains("is-empty")) return;
  const removeBtn = cartDrawer.querySelector("button.gb-remove-product")?.closest("cart-remove-button");

  if (!removeBtn) {
    helpers.error("Can't find remove button of the free product", new Error("Missing remove button"));
    helpers.safeCallback(callbackFn);
    return;
  }

  const cartIndex = removeBtn.dataset.index;
  const body = JSON.stringify({
    line: cartIndex,
    quantity: 0,
    sections: cartSectionsToRenderList.map((_item) => _item.section),
    sections_url: window.location.pathname,
  });

  fetch(window.routes.cart_change_url + ".js", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body,
  })
    .then((response) => {
      return response.text();
    })
    .then((state) => {
      const parsedState = JSON.parse(state);
      const cartItemsCount = parsedState.item_count;
      updateBubbleCount(cartItemsCount);
      if (cartItemsCount === 0) {
        const parser = new DOMParser();
        cartDrawer.classList.toggle("is-empty", cartItemsCount === 0);
        const oldCartDrawer = cartDrawer.querySelector("#CartDrawer") ?? cartDrawer;
        const newCartDrawer = parser
          .parseFromString(parsedState.sections["cart-drawer"], "text/html")
          .querySelector("#CartDrawer");
        replaceCartComponent(oldCartDrawer, newCartDrawer);
        return;
      }

      if (parsedState.errors) {
        const cartStatus =
          document.getElementById("cart-live-region-text") || document.getElementById("CartDrawer-LiveRegionText");
        cartStatus.setAttribute("aria-hidden", false);

        setTimeout(() => {
          cartStatus.setAttribute("aria-hidden", true);
        }, TIMING.ARIA_HIDDEN_DELAY);
        return;
      }
      const cartDrawerWrapper = document.querySelector("cart-drawer");
      const cartFooter = document.getElementById("main-cart-footer");

      if (cartFooter) cartFooter.classList.toggle("is-empty", cartItemsCount === 0);
      if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle("is-empty", cartItemsCount === 0);

      cartSectionsToRenderList.forEach((section) => {
        const elementToReplace =
          document.getElementById(section.id) ||
          document.querySelector(section.selector) ||
          document.getElementById(section.id);

        if (section.section === "cart-drawer") {
          const cartDrawerContainer = elementToReplace;
          const newCartDrawer = parser.parseFromString(parsedState.sections[section.section], "text/html");

          updateCartDrawer(cartDrawerContainer, newCartDrawer, false);
        } else {
          elementToReplace.innerHTML = new DOMParser()
            .parseFromString(parsedState.sections[section.section], "text/html")
            .querySelector(section.selector).innerHTML;
        }
      });

      helpers.safeCallback(callbackFn);
    })
    .catch((_err) => {
      helpers.error("Error while removing free product", _err);
      helpers.safeCallback(callbackFn);
    });
}

function animateProgressBar(progressBar, targetValue, duration = 500) {
  if (!progressBar) return;
  const startValue = progressBar.value;
  const startTime = performance.now();

  // Icons stay fixed at their positions (calculated by Liquid)
  // Only animate the progress bar value
  function updateProgress(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min(elapsedTime / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 2);
    const currentValue = startValue + (targetValue - startValue) * easedProgress;
    progressBar.value = currentValue;

    if (progress < 1) {
      requestAnimationFrame(updateProgress);
    }
  }
  requestAnimationFrame(updateProgress);
}

function replaceCartComponent(oldComponent, newComponent) {
  if (oldComponent && !!newComponent) {
    oldComponent.parentNode.replaceChild(newComponent, oldComponent);
  }
}

function updateBubbleCount(newTotalCount) {
  /**
   ** update cart bubble number
   */
  const cartBubbleSpan = document.querySelector(".cart-count-bubble span");
  if (String(newTotalCount) === "0" && cartBubbleSpan) {
    const cartBubbleContainer = cartBubbleSpan.parentNode;
    cartBubbleContainer.innerHTML = "";
  } else if (cartBubbleSpan) {
    cartBubbleSpan.innerText = newTotalCount;
  } else {
    const bubbleIcon = document.createElement("div");
    bubbleIcon.classList.add("cart-count-bubble");
    bubbleIcon.style.backgroundColor = "var(--global-section-text-color)";
    bubbleIcon.style.color = "var(--global-section-background-color)";
    bubbleIcon.innerHTML = `<span aria-hidden="true">${newTotalCount}</span>`;
    const bubbleContainer = document.querySelector("#cart-icon-bubble");
    if (bubbleContainer) bubbleContainer.appendChild(bubbleIcon);
  }
}

async function addFreeProduct(cartDrawer, callbackFn) {
  const form = document.querySelector("form.free-product-form");
  const formData = new FormData(form);
  const freeProductId = document.querySelector("form.free-product-form .product-variant-id")?.value;
  if (!freeProductId) {
    helpers.safeCallback(callbackFn);
    return;
  }
  try {
    const response = await fetch(window.routes.cart_add_url + ".js", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: formData,
    });

    if (response.ok) {
      fetch(window.routes.cart_url + "?view=drawer")
        .then((response) => response.text())
        .then((html) => {
          const parsedCartHtml = parser.parseFromString(html, "text/html");
          const newCartDrawer = parsedCartHtml.querySelector("#CartDrawer");
          if (newCartDrawer) {
            updateCartDrawer(cartDrawer, newCartDrawer, false, callbackFn);
          } else {
            helpers.safeCallback(callbackFn);
          }
        });
    }
  } catch (_err) {
    helpers.error("Error while adding free product", _err);
    helpers.safeCallback(callbackFn);
  }
}

// Helper functions for updateCartDrawer
function getCartMetadata(cartDrawer) {
  const variantInput = document.querySelector("form.free-product-form .product-variant-id");
  const freeProductId = variantInput ? variantInput.value : null;
  const totalCount = cartDrawer.querySelector(".gb-cart-total-item")?.textContent || "0";
  const totalValue = parseInt(cartDrawer.querySelector(".gb-totals-total-value")?.innerText ?? "0");
  const freeProduct = cartDrawer.querySelector(".gb-find-remove-product.cart-item");
  const amountFreeProduct = DOMCache.get("thresholdProduct", "[data-treshold-product]")?.getAttribute(
    "data-treshold-product",
  );

  return {
    freeProductId,
    totalCount,
    totalValue,
    freeProduct,
    amountFreeProduct,
  };
}

function handleEmptyCart(cartDrawerContainer, cartDrawer, newCartDrawer, newTotalCount, callbackFn) {
  cartDrawerContainer.classList.add("is-empty");
  cartDrawer.innerHTML = newCartDrawer.innerHTML;
  updateBubbleCount(newTotalCount);
  helpers.safeCallback(callbackFn);
}

function handleCartBecameNonEmpty(cartDrawerContainer, cartDrawer, newCartDrawer, callbackFn) {
  const {
    totalValue: newTotalValue,
    freeProduct: newFreeProduct,
    freeProductId,
    amountFreeProduct,
  } = getCartMetadata(newCartDrawer);
  const { totalCount: newTotalCount } = getCartMetadata(newCartDrawer);

  if (newTotalValue >= amountFreeProduct && newFreeProduct === null && !!freeProductId && show_progress_bar) {
    addFreeProduct(cartDrawerContainer, callbackFn);
  } else {
    cartDrawerContainer.classList.remove("is-empty");
    cartDrawer.innerHTML = newCartDrawer.innerHTML;
    updateBubbleCount(newTotalCount);
    helpers.safeCallback(callbackFn);
  }
}

function handleCartUpdate(cartDrawerContainer, cartDrawer, newCartDrawer, checkFreeProduct, callbackFn) {
  const { totalValue: newTotalValue, freeProductId, amountFreeProduct } = getCartMetadata(newCartDrawer);
  const { freeProduct: currentFreeProduct } = getCartMetadata(cartDrawerContainer);
  const { totalCount: newTotalCount } = getCartMetadata(newCartDrawer);

  // Save progress bar value BEFORE innerHTML destroys it
  let startValue = 0;
  if (show_progress_bar) {
    const progressbar = cartDrawerContainer.querySelector(".free-product-progress-bar-main progress");
    startValue =
      progressbar?.value ??
      parseInt(document.querySelector(".cart-drawer__footer .gb-totals-total-value")?.innerText ?? "0");
  }

  if (
    newTotalValue >= amountFreeProduct &&
    currentFreeProduct === null &&
    checkFreeProduct &&
    !!freeProductId &&
    show_progress_bar
  ) {
    addFreeProduct(cartDrawerContainer, callbackFn);
  } else if (
    newTotalValue < amountFreeProduct &&
    currentFreeProduct !== null &&
    checkFreeProduct &&
    !!freeProductId &&
    show_progress_bar
  ) {
    removeFreeProduct(cartDrawerContainer, callbackFn);
  } else {
    // Use replaceChild to preserve custom elements lifecycle
    const newDrawerInner = newCartDrawer.querySelector(".drawer__inner");
    const oldDrawerInner = cartDrawer.querySelector(".drawer__inner");

    if (newDrawerInner && oldDrawerInner) {
      oldDrawerInner.parentNode.replaceChild(newDrawerInner, oldDrawerInner);
      // Invalidate cache after DOM update
      DOMCache.invalidate("thresholdProduct");
    }
    // Animate progress bar
    if (show_progress_bar) {
      const newProgressbar = cartDrawerContainer.querySelector(".free-product-progress-bar-main progress");
      if (newProgressbar) {
        // Reset progress bar to startValue before animating to prevent jump
        newProgressbar.value = startValue;
        animateProgressBar(newProgressbar, newTotalValue, TIMING.PROGRESS_BAR_ANIMATION);
        colorSVG(cartDrawerContainer, startValue, newTotalValue);
      }
    }

    updateBubbleCount(newTotalCount);
    helpers.safeCallback(callbackFn);
  }
}

function updateCartDrawer(oldCartDrawer, newCartDrawer, checkFreeProduct = true, callbackFn) {
  if (!oldCartDrawer || !newCartDrawer) return;

  const cartDrawerContainer = oldCartDrawer.closest("cart-drawer") ?? oldCartDrawer;
  const cartDrawer = cartDrawerContainer.querySelector("#CartDrawer") ?? cartDrawerContainer;

  const { totalCount: oldTotalCount } = getCartMetadata(cartDrawerContainer);
  const { totalCount: newTotalCount } = getCartMetadata(newCartDrawer);

  // Handle three cases: empty cart, cart became non-empty, or cart updated
  if (newTotalCount === "" || newTotalCount === "0") {
    handleEmptyCart(cartDrawerContainer, cartDrawer, newCartDrawer, newTotalCount, callbackFn);
  } else if (oldTotalCount === "" || oldTotalCount === "0") {
    handleCartBecameNonEmpty(cartDrawerContainer, cartDrawer, newCartDrawer, callbackFn);
  } else {
    handleCartUpdate(cartDrawerContainer, cartDrawer, newCartDrawer, checkFreeProduct, callbackFn);
  }

  if (cartDrawerContainer && cartDrawerContainer.dispatchEvent) {
    cartDrawerContainer.dispatchEvent(new CustomEvent("cart-drawer:update", {
      bubbles: true,
      detail: { 
        oldTotalCount,
        newTotalCount,
        checkFreeProduct
      }
    }));
  }
}
function detectDiscountWrap() {
  const container = document.querySelector(".cart-drawer .discount_price-container");
  const discount = container?.querySelector(".discount_discount-value");
  const price = container?.querySelector(".totals__total-value");

  if (!container || !discount || !price) return;
  const discountTop = discount.getBoundingClientRect().top;
  const priceTop = price.getBoundingClientRect().top;
  if (discountTop + 5 < priceTop) {
    container.classList.add("wrap");
  } else {
    container.classList.remove("wrap");
  }
}

function colorSVG(cartDrawerContainer, startValue, newTotalValue) {
  let freeShippingThreshhold = null;

  if (Alpine && Alpine.store) {
    const store = Alpine.store(AlpineStoreKeys.FREE_SHIPPING_THRESHHOLD_STORE);
    if (store) {
      freeShippingThreshhold = store.freeShippingThreshhold || null;
      helpers.log("colorSVG", { freeShippingThreshhold });
    }
  }

  const freeProductSvg = cartDrawerContainer.querySelector(".free-product-progress-bar-main .free-gift-main");
  const freeShipSvg = cartDrawerContainer.querySelector(".free-product-progress-bar-main .free-shipping-main");
  const amountFreeProduct = document.querySelector("[data-treshold-product]")
    ? document.querySelector("[data-treshold-product]").getAttribute("data-treshold-product")
    : null;

  if (startValue < amountFreeProduct && newTotalValue >= amountFreeProduct) {
    freeProductSvg?.classList.add("free-gift-main-color");
  } else if (startValue >= amountFreeProduct && newTotalValue < amountFreeProduct) {
    freeProductSvg?.classList.remove("free-gift-main-color");
  }
  if (
    freeShippingThreshhold &&
    freeShipSvg &&
    startValue < freeShippingThreshhold &&
    newTotalValue >= freeShippingThreshhold
  ) {
    freeShipSvg.classList.add("free-shipping-main-color");
  } else if (
    freeShippingThreshhold &&
    freeShipSvg &&
    startValue >= freeShippingThreshhold &&
    newTotalValue < freeShippingThreshhold
  ) {
    freeShipSvg.classList.remove("free-shipping-main-color");
  }
}

function startLoading(buttonElem) {
  if (!buttonElem) return;
  const spinAnim = buttonElem.querySelector(".spin-animation");
  const contentElem = buttonElem.querySelector(".content");
  if (spinAnim) spinAnim.style.display = "block";
  if (contentElem) contentElem.style.display = "none";
}

function stopLoading(buttonElem) {
  if (!buttonElem) return;
  const spinAnim = buttonElem.querySelector(".spin-animation");
  const contentElem = buttonElem.querySelector(".content");
  if (spinAnim) spinAnim.style.display = "none";
  if (contentElem) contentElem.style.display = "block";
}

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.clickHandler = this.handleClick.bind(this);
    this.addEventListener("click", this.clickHandler);
  }

  handleClick(event) {
    event.preventDefault();
    const removeButton = event.target.closest("button.cart-remove-button");
    startLoading(removeButton);
    const cartItems = this.closest("cart-items") || this.closest("cart-drawer-items");

    if (cartItems) {
      cartItems.updateQuantity(this.dataset.index, 0, event);
    } else {
      stopLoading(removeButton);
    }
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.clickHandler);
  }
}

customElements.define("cart-remove-button", CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById("shopping-cart-line-item-status") || document.getElementById("CartDrawer-LineItemStatus");
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.boundOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener("change", this.boundOnChange);

    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === "cart-items") {
        return;
      }
      return this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    // Remove change listener when disconnected
    if (this.boundOnChange) {
      this.removeEventListener("change", this.boundOnChange);
    }

    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute("value");
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event, callbackFn) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = "";

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace("[min]", event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace("[max]", event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace("[step]", event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity("");
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        event,
        document.activeElement.getAttribute("name"),
        event.target.dataset.quantityVariantId,
        callbackFn,
      );
    }
  }

  onChange(event) {
    const buttonType = event.detail?.buttonType;
    const quantityInput = event.target.closest(".cart-quantity");
    if (!quantityInput) return;
    const curButton = quantityInput.querySelector(`[name='${buttonType}']`);
    if (curButton) {
      startLoading(curButton);
      this.validateQuantity(event, () => stopLoading(curButton));
    } else this.validateQuantity(event);
  }

  onCartUpdate() {
    if (this.tagName === "CART-DRAWER-ITEMS") {
      return fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, "text/html");
          const cartDrawerContainer = document.querySelector("cart-drawer");
          const newCartDrawer = html.querySelector("#CartDrawer");
          updateCartDrawer(cartDrawerContainer, newCartDrawer);
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      return fetch(`${routes.cart_url}?section_id=main-cart-items`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, "text/html");
          const sourceQty = html.querySelector("cart-items");
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: "main-cart-items",
        section: document.getElementById("main-cart-items").dataset.id,
        selector: ".js-contents",
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section",
      },
      {
        id: "cart-live-region-text",
        section: "cart-live-region-text",
        selector: ".shopify-section",
      },
      {
        id: "main-cart-footer",
        section: document.getElementById("main-cart-footer").dataset.id,
        selector: ".js-contents",
      },
    ];
  }

  updateQuantity(line, quantity, event, name, variantId, callbackFn) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    const eventTarget = event.currentTarget instanceof CartRemoveButton ? "clear" : "change";

    fetch(`${routes.cart_change_url}.js`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        // if the product is rely on gift product we remove all gifted product

        let relyOnProductId = null;

        if (Alpine && Alpine.store) {
          const store = Alpine.store(AlpineStoreKeys.FREE_GIFT_STORE);
          if (store) {
            relyOnProductId = store.relyOnProductId || null;
            helpers.log("CartUpdateQuantity", { relyOnProductId });
          }
        }

        // Start processing gift adjustments in parallel (non-blocking)
        let needsGiftAdjustment = false;
        let linkedGiftsToHide = [];

        // Check if the removed product had linked free gifts (premium-attachment-kit)
        // Only remove gifts if the product is COMPLETELY removed from cart (not just quantity reduced)
        if (parsedState.items_removed && parsedState.items_removed.length > 0) {
          const removedProductId = parsedState.items_removed[0]?.product_id;
          // Check if the product still exists in the cart
          const productStillInCart = helpers.productExistsInCart(parsedState.items, removedProductId);

          // Only remove all linked gifts if product is completely removed from cart
          if (removedProductId && !productStillInCart) {
            const linkedGiftItems = helpers.getLinkedGifts(parsedState.items, removedProductId);
            if (linkedGiftItems.length > 0) {
              needsGiftAdjustment = true;
              linkedGiftsToHide = linkedGiftItems.map((gift) => gift.key);
              // Run immediately in background, refresh will happen automatically
              setTimeout(
                () => removeLinkedFreeGifts(removedProductId, parsedState.items, null, true),
                TIMING.LINKED_GIFTS_REMOVAL_DELAY,
              );
            }
          } else if (removedProductId && productStillInCart) {
            // Check if we need to adjust gift quantities
            const mainProduct = helpers.findProductById(parsedState.items, removedProductId);
            const linkedGifts = helpers.getLinkedGifts(parsedState.items, removedProductId);
            // Only adjust if quantities don't match
            const needsAdjustment = linkedGifts.some((gift) => gift.quantity !== mainProduct?.quantity);
            if (needsAdjustment) {
              needsGiftAdjustment = true;
              // Run immediately in background, refresh will happen automatically
              setTimeout(
                () => adjustLinkedFreeGiftsQuantity(removedProductId, parsedState.items, null, true),
                TIMING.LINKED_GIFTS_ADJUSTMENT_DELAY,
              );
            }
          }
        }

        // Also check if rely_on_product from global settings was removed
        if (
          relyOnProductId &&
          !helpers.productExistsInCart(parsedState.items, relyOnProductId) &&
          String(parsedState.items_removed[0]?.product_id) === String(relyOnProductId)
        ) {
          setTimeout(() => removeAllGiftsFromSettings(), TIMING.SETTINGS_GIFTS_REMOVAL_DELAY);
        }

        CartPerformance.measure(`${eventTarget}:paint-updated-sections"`, () => {
          const quantityElement =
            document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
          const items = document.querySelectorAll(".cart-item");

          if (parsedState.errors) {
            quantityElement.value = quantityElement.getAttribute("value");
            this.updateLiveRegions(line, parsedState.errors);
            return;
          }

          this.classList.toggle("is-empty", parsedState.item_count === 0);
          const cartDrawerWrapper = document.querySelector("cart-drawer");
          const cartFooter = document.getElementById("main-cart-footer");

          if (cartFooter) cartFooter.classList.toggle("is-empty", parsedState.item_count === 0);
          if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle("is-empty", parsedState.item_count === 0);

          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document.getElementById(section.id) ||
              document.querySelector(section.selector) ||
              document.getElementById(section.id);

            if (section.section == "cart-drawer") {
              const cartDrawerContainer = elementToReplace;
              const newCartDrawerContainer = parser.parseFromString(parsedState.sections[section.section], "text/html");
              const newCartDrawer =
                newCartDrawerContainer.getElementById(section.id) ||
                newCartDrawerContainer.querySelector(section.selector) ||
                newCartDrawerContainer.getElementById(section.id);

              updateCartDrawer(cartDrawerContainer, newCartDrawer);
            } else {
              if (section.id === "cart-icon-bubble") {
                const iconType = elementToReplace.getAttribute("data-cart-icon-type");
                elementToReplace.innerHTML = this.getSectionInnerHTML(
                  parsedState.sections[section.section],
                  section.selector,
                );
                if (iconType) {
                  elementToReplace.setAttribute("data-cart-icon-type", iconType);
                }
                
                const iconWrapper = elementToReplace.querySelector(".svg-wrapper");
                if (iconWrapper && iconType) {
                  const bagIcon = iconWrapper.querySelector(".cart-icon-bag");
                  const cartIcon = iconWrapper.querySelector(".cart-icon-cart");
                  const cartIconEmpty = iconWrapper.querySelector(".cart-icon-cart-empty");
                  
                  if (iconType === "bag") {
                    if (bagIcon) bagIcon.style.display = "flex";
                  } 
                  else {
                    const cartEmpty = parsedState.item_count === 0;
                    if (cartEmpty && cartIconEmpty) {
                      cartIconEmpty.style.display = "flex";
                    } else if (cartIcon) {
                      cartIcon.style.display = "flex";
                    }
                  }
                }
              } else {
                elementToReplace.innerHTML = this.getSectionInnerHTML(
                  parsedState.sections[section.section],
                  section.selector,
                );
              }
            }
          });

          // Hide linked gift items immediately if they're being removed
          if (linkedGiftsToHide.length > 0) {
            linkedGiftsToHide.forEach((giftKey) => {
              // Find cart item by variant key
              const cartItems = document.querySelectorAll(".cart-item");
              cartItems.forEach((item) => {
                const removeButton = item.querySelector("cart-remove-button");
                if (removeButton && removeButton.dataset.id) {
                  // Check if this item matches a gift to hide
                  const itemInCart = parsedState.items.find((i) => i.id == removeButton.dataset.id);
                  if (itemInCart && itemInCart.key === giftKey) {
                    // Hide with smooth fade-out animation
                    item.style.transition = "opacity 0.2s ease-out, transform 0.2s ease-out";
                    item.style.opacity = "0";
                    item.style.transform = "translateX(-20px)";
                    item.style.pointerEvents = "none";
                  }
                }
              });
            });
          }

          const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
          let message = "";
          if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
            if (typeof updatedValue === "undefined") {
              message = window.cartStrings.error;
            } else {
              message = window.cartStrings.quantityError.replace("[quantity]", updatedValue);
            }
          }
          this.updateLiveRegions(line, message);

          const lineItem =
            document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
            cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
              : lineItem.querySelector(`[name="${name}"]`).focus();
          } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper.querySelector(".drawer__inner-empty"), cartDrawerWrapper.querySelector("a"));
          } else if (document.querySelector(".cart-item") && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper, document.querySelector(".cart-item__name"));
          }
        });

        CartPerformance.measureFromEvent(`${eventTarget}:user-action`, event);

        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: "cart-items",
          cartData: parsedState,
          variantId: variantId,
        });
      })
      .catch((err) => {
        console.error(err);
        this.querySelectorAll(".loading__spinner").forEach((overlay) => overlay.classList.add("hidden"));
        const errors = document.getElementById("cart-errors") || document.getElementById("CartDrawer-CartErrors");
        if (errors) errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
        if (callbackFn) callbackFn();
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError && !!message) {
      lineItemError.querySelector(".cart-item__error-text").textContent = message;

      lineItemError.style.display = "block";
      lineItemError.style.marginBottom = "12px";
      setTimeout(() => {
        lineItemError.style.display = "none";
        lineItemError.style.marginBottom = "0";
      }, 4000);
    }

    this.lineItemStatusElement.setAttribute("aria-hidden", true);

    const cartStatus =
      document.getElementById("cart-live-region-text") || document.getElementById("CartDrawer-LiveRegionText");
    cartStatus.setAttribute("aria-hidden", false);

    setTimeout(() => {
      cartStatus.setAttribute("aria-hidden", true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, "text/html").querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById("main-cart-items") || document.getElementById("CartDrawer-CartItems");
    mainCartItems.classList.add("cart__items--disabled");

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove("hidden"));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute("aria-hidden", false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById("main-cart-items") || document.getElementById("CartDrawer-CartItems");
    mainCartItems.classList.remove("cart__items--disabled");

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add("hidden"));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add("hidden"));
  }
}

customElements.define("cart-items", CartItems);
customElements.define("cart-drawer-items", CartItems);

if (!customElements.get("cart-note")) {
  customElements.define(
    "cart-note",
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          "input",
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}.js`, {
              ...fetchConfig(),
              ...{ body },
            }).then(() => CartPerformance.measureFromEvent("note-update:user-action", event));
          }, ON_CHANGE_DEBOUNCE_TIMER),
        );
      }
    },
  );
}
