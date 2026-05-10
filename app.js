// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  // If a saved game exists, go straight to the game; otherwise show the menu
  if (MTSM_ENGINE.loadGame()) {
    MTSM_UI.render('dashboard');
  } else {
    MTSM_UI.renderMenu();
  }
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
