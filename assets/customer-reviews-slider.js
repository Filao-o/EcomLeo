document.addEventListener("DOMContentLoaded", function () {
  initReviewsSlider();
  setupClaimButton();
});
function initReviewsSlider() {
  swiperCheckAndLoad();
  var swiper = new Swiper(".reviewSwiper", {
    slidesPerView: "auto",
    spaceBetween: 15,
    centeredSlides: !1,
    loop: !0,
    speed: parseInt(document.querySelector(".reviewSwiper").dataset.speed || 5000),
    autoplay: { delay: 1, disableOnInteraction: !1 },
    allowTouchMove: !0,
    grabCursor: !0,
    freeMode: { enabled: !1 },
  });
}
function setupClaimButton() {
  var claimButton = document.querySelector(".claim-button");
  if (claimButton) {
  }
}
function scrollToTop(event) {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
