document.addEventListener("DOMContentLoaded", function () {
  const cartDrawer = document.querySelector("cart-drawer");
  if (!cartDrawer) return;
  const productForms = document.querySelectorAll('form[action*="/cart/add"]');
  productForms.forEach((form) => {
    if (form.classList.contains("drawer-initialized")) return;
    form.classList.add("drawer-initialized");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const submitButton = form.querySelector('[type="submit"]');
      let loadingSpinner = submitButton?.querySelector(".loading__spinner");
      if (submitButton) {
        submitButton.setAttribute("aria-disabled", "true");
        submitButton.classList.add("loading");
        if (loadingSpinner) loadingSpinner.classList.remove("hidden");
      }
      const formData = new FormData(form);
      formData.append("sections", "cart-drawer,cart-icon-bubble");
      formData.append("sections_url", window.location.pathname);
      fetch(window.routes.cart_add_url, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            console.error("Error adding to cart:", response.description);
            const errorContainer = form.querySelector(".product-form__error-message");
            if (errorContainer) {
              errorContainer.textContent = response.description || "Error adding to cart";
              errorContainer.closest(".product-form__error-message-wrapper")?.removeAttribute("hidden");
            } else {
              alert(response.description || "Error adding product to cart");
            }
          } else {
            cartDrawer.renderContents(response);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          form.submit();
        })
        .finally(() => {
          if (submitButton) {
            submitButton.classList.remove("loading");
            submitButton.removeAttribute("aria-disabled");
            if (loadingSpinner) loadingSpinner.classList.add("hidden");
          }
        });
    });
  });
});
