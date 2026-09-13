/* ============================================
   UI Helpers (DOM, toast, modal, format)
============================================ */
const UI = (() => {

  /* ---------- Loading ---------- */
  function showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('active', show);
  }

  /* ---------- Toast ---------- */
  function showToast(message, icon = 'fa-circle-check') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all .3s';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  /* ---------- Modal ---------- */
  function openModal(id) { document.getElementById(id).classList.add('active'); }
  function closeModal(id) { document.getElementById(id).classList.remove('active'); }

  /* ---------- Escape HTML ---------- */
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ---------- Format ---------- */
  function fmtMoney(amount) {
    return '฿' + Number(amount || 0).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

  return { showLoading, showToast, openModal, closeModal, escapeHtml, fmtMoney, pad, dateKey };
})();

/* ---------- Global function bindings (ใช้ใน HTML onclick) ---------- */
function closeModal(id) { UI.closeModal(id); }
function showView(id) { App.showView(id); }
