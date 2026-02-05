// Bottom sheet swipe logic
document.addEventListener('DOMContentLoaded', () => {
  const sheet = document.getElementById('bottomSheet');
  const header = document.getElementById('sheetHeader');
  if (!sheet || !header) return;

  let startY = 0;
  let startHeight = 0;
  let isDragging = false;

  header.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    startHeight = sheet.clientHeight;
    sheet.classList.remove('sheet-transition');
  }, { passive: false });

  header.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY;
    const newHeight = startHeight + deltaY;

    const maxHeight = window.innerHeight * 0.95;
    const minHeight = window.innerHeight * 0.10;

    if (newHeight >= minHeight && newHeight <= maxHeight) {
      sheet.style.height = `${newHeight}px`;
    }
  }, { passive: false });

  header.addEventListener('touchend', () => {
    isDragging = false;
    sheet.classList.add('sheet-transition');

    const currentHeight = sheet.clientHeight;
    const windowHeight = window.innerHeight;

    if (currentHeight > windowHeight * 0.65) sheet.style.height = '85%';
    else if (currentHeight < windowHeight * 0.25) sheet.style.height = '15%';
    else sheet.style.height = '40%';
  });
});

// Tab switching (needs to be global because HTML uses onclick="")
window.switchSheetTab = function switchSheetTab(tabName) {
  const tabs = ['location', 'groups', 'pins'];

  tabs.forEach(t => {
    const el = document.getElementById('tab-' + t);
    const view = document.getElementById('view-' + t);

    if (el) {
      el.className = (t === tabName)
        ? 'sheet-tab active bg-primary text-white rounded-4 p-3 d-flex justify-content-center align-items-center shadow-sm h-50 cursor-pointer'
        : 'sheet-tab bg-primary-subtle border border-primary text-primary rounded-4 p-3 d-flex justify-content-center align-items-center h-50 cursor-pointer';
    }

    if (view) view.classList.add('d-none');
  });

  const selectedView = document.getElementById('view-' + tabName);
  if (selectedView) selectedView.classList.remove('d-none');

  // optional hooks from your existing code:
  if (typeof hideGroupVisuals === 'function') hideGroupVisuals();
  if (typeof setPinsVisibility === 'function') setPinsVisibility(false);

  if (tabName === 'groups') {
    if (typeof showGroupVisuals === 'function') showGroupVisuals();
  } else if (tabName === 'pins') {
    if (typeof setPinsVisibility === 'function') setPinsVisibility(true);
  }
}