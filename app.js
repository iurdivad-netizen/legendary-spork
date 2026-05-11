// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  MTSM_UI.renderStartScreen();
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') MTSM_UI.closeModal();
});

// Close modal when clicking the overlay backdrop
document.addEventListener('click', function (e) {
  var overlay = document.getElementById('modal-overlay');
  if (overlay && e.target === overlay) MTSM_UI.closeModal();
});
