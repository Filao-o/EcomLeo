console.log('Loading customer reviews carousel script...');

function initCarousel() {
  console.log('Initializing carousel...');
  
  const section = document.querySelector('.reviews-transformation-section');
  if (!section) {
    console.error('Customer reviews section not found');
    return;
  }
  
  const container = section.querySelector('.reviews-container');
  // Updated selector to work with global-nav-button snippet
  const prevButton = section.querySelector('.global-nav-button.prev, .nav-button.prev');
  const nextButton = section.querySelector('.global-nav-button.next, .nav-button.next');
  
  console.log('Section found:', !!section);
  console.log('Container found:', !!container);
  console.log('Prev button found:', !!prevButton);
  console.log('Next button found:', !!nextButton);
  
  if (!container) {
    console.error('Reviews container not found');
    return;
  }
  
  if (!prevButton || !nextButton) {
    console.warn('Navigation buttons not found, carousel will be scroll-only');
  }
  
  function getScrollAmount() {
    const firstCard = container.querySelector('.review-card');
    if (!firstCard) return 350;
    const cardWidth = firstCard.offsetWidth;
    const containerStyle = getComputedStyle(container);
    const gap = parseInt(containerStyle.gap) || 20;
    console.log('Card width:', cardWidth, 'Gap:', gap, 'Total scroll:', cardWidth + gap);
    return cardWidth + gap;
  }
  
  function isAtEnd() {
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    return scrollLeft + clientWidth >= scrollWidth - 5;
  }
  
  function isAtBeginning() {
    return container.scrollLeft <= 5;
  }
  
  if (prevButton) {
    prevButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Prev button clicked');
      if (isAtBeginning()) {
        console.log('At beginning, scrolling to end');
        container.scrollTo({
          left: container.scrollWidth - container.clientWidth,
          behavior: 'smooth'
        });
      } else {
        const scrollAmount = getScrollAmount();
        container.scrollBy({
          left: -scrollAmount,
          behavior: 'smooth'
        });
      }
    });
  }
  
  if (nextButton) {
    nextButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Next button clicked');
      if (isAtEnd()) {
        console.log('At end, scrolling to beginning');
        container.scrollTo({
          left: 0,
          behavior: 'smooth'
        });
      } else {
        const scrollAmount = getScrollAmount();
        container.scrollBy({
          left: scrollAmount,
          behavior: 'smooth'
        });
      }
    });
  }
  
  console.log('Navigation setup complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCarousel);
} else {
  initCarousel();
}

// Also initialize after a delay for dynamic content
setTimeout(initCarousel, 500);

// Re-initialize when section is loaded in theme editor
document.addEventListener('shopify:section:load', function(e) {
  if (e.target.querySelector('.reviews-transformation-section')) {
    setTimeout(initCarousel, 100);
  }
});
