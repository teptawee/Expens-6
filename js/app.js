/* ============================================
   App — Main Controller
   V3.1.0
============================================ */
const App = (() => {

  let PAGINATION = { currentPage: 1, pageSize: 10 };

  /* ============================================
     View Management
  ============================================ */
  function showView(id) {
    document.querySelectorAll('.view-section').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(x => {
      x.classList.toggle('active', x.dataset.view === id);
    });

    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.view === id) btn.classList.add('active');
    });

    const fab = document.getElementById('quickAddFab');
    if (fab) {
      fab.style.display = (id === 'viewExpense' || window.innerWidth > 900) ? 'none' : 'flex';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ============================================
     Dashboard
  ============================================ */
  function renderDashboard() {
    const expenses = Storage.getExpenses();
    const now = new Date();
    const today = UI.dateKey(now);

    const yd = new Date(now); yd.setDate(yd.getDate() - 1);
    const yesterday = UI.dateKey(yd);

    const monday = getStartOfWeek(now);
    const lastMonday = new Date(monday); lastMonday.setDate(lastMonday.getDate() - 7);
    const nextMonday = new Date(monday); nextMonday.setDate(nextMonday.getDate() + 7);

    const currentMonth = `${now.getFullYear()}-${UI.pad(now.getMonth() + 1)}`;
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = `${lm.getFullYear()}-${UI.pad(lm.getMonth() + 1)}`;

    const currentYear = String(now.getFullYear());
    const lastYear = String(now.getFullYear() - 1);

    let todayTotal = 0, yesterdayTotal = 0;
    let weekTotal = 0, lastWeekTotal = 0;
    let monthTotal = 0, lastMonthTotal = 0;
    let yearTotal = 0, lastYearTotal = 0;

    expenses.forEach(x => {
      const amt = Number(x.amount || 0);
      const d = new Date(x.date + 'T00:00:00');

      if (x.date === today) todayTotal += amt;
      if (x.date === yesterday) yesterdayTotal += amt;
      if (d >= monday && d < nextMonday) weekTotal += amt;
      if (d >= lastMonday && d < monday) lastWeekTotal += amt;
      if (x.date.startsWith(currentMonth)) monthTotal += amt;
      if (x.date.startsWith(lastMonth)) lastMonthTotal += amt;
      if (x.date.startsWith(currentYear)) yearTotal += amt;
      if (x.date.startsWith(lastYear)) lastYearTotal += amt;
    });

    document.getElementById('dashToday').innerText = UI.fmtMoney(todayTotal);
    document.getElementById('dashWeek').innerText  = UI.fmtMoney(weekTotal);
    document.getElementById('dashMonth').innerText = UI.fmtMoney(monthTotal);
    document.getElementById('dashYear').innerText  = UI.fmtMoney(yearTotal);

    document.getElementById('badgeToday').innerHTML = renderCompareBadge(todayTotal, yesterdayTotal, 'เมื่อวาน');
    document.getElementById('badgeWeek').innerHTML  = renderCompareBadge(weekTotal, lastWeekTotal, 'สัปดาห์ที่แล้ว');
    document.getElementById('badgeMonth').innerHTML = renderCompareBadge(monthTotal, lastMonthTotal, 'เดือนที่แล้ว');
    document.getElementById('badgeYear').innerHTML  = renderCompareBadge(yearTotal, lastYearTotal, 'ปีที่แล้ว');

    const recent = expenses.slice(0, 5);
    const body = document.getElementById('dashRecentTable');

    if (!recent.length) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted)">ยังไม่มีรายการค่าใช้จ่าย</td></tr>`;
      return;
    }

    body.innerHTML = recent.map(x => `
      <tr>
        <td>${UI.escapeHtml(x.date)}</td>
        <td><strong>${UI.escapeHtml(x.description)}</strong></td>
        <td><span class="badge"><i class="fa-solid ${UI.escapeHtml(getCatIcon(x.category))}"></i> ${UI.escapeHtml(x.category)}</span></td>
        <td><span class="badge badge-payment"><i class="fa-solid ${UI.escapeHtml(getPayIcon(x.paymentType))}"></i> ${UI.escapeHtml(x.paymentType)}</span></td>
        <td style="color:var(--rose);font-weight:600">${UI.fmtMoney(x.amount)}</td>
      </tr>
    `).join('');
  }

  function renderCompareBadge(current, previous, label) {
    if (!previous) {
      if (!current) return `<div class="compare-badge neutral"><i class="fa-solid fa-minus"></i> ไม่มีค่าใช้จ่าย</div>`;
      return `<div class="compare-badge neutral"><i class="fa-solid fa-info-circle"></i> ไม่มีข้อมูล${label}</div>`;
    }
    const diff = current - previous;
    const percent = Math.abs(diff / previous * 100).toFixed(1);
    if (diff > 0) return `<div class="compare-badge up"><i class="fa-solid fa-arrow-trend-up"></i> เพิ่มขึ้น ${percent}%</div>`;
    if (diff < 0) return `<div class="compare-badge down"><i class="fa-solid fa-arrow-trend-down"></i> ลดลง ${percent}%</div>`;
    return `<div class="compare-badge neutral"><i class="fa-solid fa-equals"></i> เท่าเดิม</div>`;
  }

  /* ============================================
     Payment Summary
  ============================================ */
  function renderPaymentSummary() {
    const key = `${new Date().getFullYear()}-${UI.pad(new Date().getMonth() + 1)}`;
    const totals = {};

    Storage.getExpenses().filter(x => x.date.startsWith(key)).forEach(x => {
      totals[x.paymentType] = (totals[x.paymentType] || 0) + Number(x.amount || 0);
    });

    const container = document.getElementById('paymentSummaryCards');
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

    if (!entries.length) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:20px">ไม่มีข้อมูลการชำระเงินเดือนนี้</div>`;
      return;
    }

    const total = entries.reduce((s, x) => s + x[1], 0);

    container.innerHTML = entries.map(([name, value], i) => {
      const pct = total ? (value / total * 100) : 0;
      const color = CONFIG.PASTEL_COLORS[i % CONFIG.PASTEL_COLORS.length];
      return `
        <div class="payment-card">
          <div class="payment-top">
            <div>
              <div class="payment-name">${UI.escapeHtml(name)}</div>
              <div class="payment-amount">${UI.fmtMoney(value)}</div>
            </div>
            <div class="payment-icon">
              <i class="fa-solid ${UI.escapeHtml(getPayIcon(name))}"></i>
            </div>
          </div>
          <div class="progress">
            <div class="progress-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
          </div>
          <div class="payment-percent">${pct.toFixed(1)}% ของค่าใช้จ่ายเดือนนี้</div>
        </div>
      `;
    }).join('');
  }

  /* ============================================
     Dropdowns
  ============================================ */
  function renderDropdowns() {
    const activeCats = Storage.getCategories().filter(x => x.isActive);
    const activePays = Storage.getPaymentTypes().filter(x => x.isActive);

    document.getElementById('expCategory').innerHTML =
      '<option value="">เลือกหมวดหมู่</option>' +
      activeCats.map(x => `<option value="${UI.escapeHtml(x.name)}">${UI.escapeHtml(x.name)}</option>`).join('');

    document.getElementById('expPayment').innerHTML =
      '<option value="">เลือกช่องทาง</option>' +
      activePays.map(x => `<option value="${UI.escapeHtml(x.name)}">${UI.escapeHtml(x.name)}</option>`).join('');

    const catFilter = document.getElementById('filterCat');
    const oldCat = catFilter.value;
    catFilter.innerHTML = '<option value="">ทุกหมวดหมู่</option>' +
      Storage.getCategories().map(x => `<option value="${UI.escapeHtml(x.name)}">${UI.escapeHtml(x.name)}</option>`).join('');
    catFilter.value = oldCat;

    const payFilter = document.getElementById('filterPay');
    const oldPay = payFilter.value;
    payFilter.innerHTML = '<option value="">ทุกช่องทาง</option>' +
      Storage.getPaymentTypes().map(x => `<option value="${UI.escapeHtml(x.name)}">${UI.escapeHtml(x.name)}</option>`).join('');
    payFilter.value = oldPay;
  }

  /* ============================================
     History
  ============================================ */
  function getFilteredExpenses() {
    const search = (document.getElementById('filterSearch').value || '').toLowerCase();
    const start  = document.getElementById('filterStartDate').value;
    const end    = document.getElementById('filterEndDate').value;
    const cat    = document.getElementById('filterCat').value;
    const pay    = document.getElementById('filterPay').value;

    return Storage.getExpenses().filter(x => {
      if (search) {
        const text = `${x.description} ${x.note || ''}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      if (start && x.date < start) return false;
      if (end && x.date > end) return false;
      if (cat && x.category !== cat) return false;
      if (pay && x.paymentType !== pay) return false;
      return true;
    });
  }

  function renderHistory() {
    const data = getFilteredExpenses();
    const total = data.length;

    document.getElementById('totalRecordCount').innerText = total;

    const pages = Math.max(1, Math.ceil(total / PAGINATION.pageSize));
    if (PAGINATION.currentPage > pages) PAGINATION.currentPage = pages;

    const startIdx = (PAGINATION.currentPage - 1) * PAGINATION.pageSize;
    const pageData = data.slice(startIdx, startIdx + PAGINATION.pageSize);
    const body = document.getElementById('historyTableBody');

    if (!pageData.length) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted)">ไม่พบรายการ</td></tr>`;
    } else {
      body.innerHTML = pageData.map(x => `
        <tr>
          <td>${UI.escapeHtml(x.date)}</td>
          <td>
            <strong>${UI.escapeHtml(x.description)}</strong>
            ${x.note ? `<br><small style="color:var(--muted)">${UI.escapeHtml(x.note)}</small>` : ''}
          </td>
          <td><span class="badge"><i class="fa-solid ${UI.escapeHtml(getCatIcon(x.category))}"></i> ${UI.escapeHtml(x.category)}</span></td>
          <td><span class="badge badge-payment"><i class="fa-solid ${UI.escapeHtml(getPayIcon(x.paymentType))}"></i> ${UI.escapeHtml(x.paymentType)}</span></td>
          <td style="color:var(--rose);font-weight:600">${UI.fmtMoney(x.amount)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-rose btn-sm" data-action="delete-expense" data-id="${UI.escapeHtml(x.id)}">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    renderPagination(pages);
  }

  function renderPagination(totalPages) {
    const nav = document.getElementById('paginationNav');
    let html = '';

    html += `<button class="page-btn" ${PAGINATION.currentPage === 1 ? 'disabled' : ''} data-page="${PAGINATION.currentPage - 1}">
      <i class="fa-solid fa-chevron-left"></i></button>`;

    const range = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - PAGINATION.currentPage) <= 2) {
        range.push(i);
      }
    }

    let prev = 0;
    range.forEach(i => {
      if (prev && i - prev > 1) html += `<span style="padding:0 4px;color:var(--muted)">…</span>`;
      html += `<button class="page-btn ${PAGINATION.currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
      prev = i;
    });

    html += `<button class="page-btn" ${PAGINATION.currentPage === totalPages ? 'disabled' : ''} data-page="${PAGINATION.currentPage + 1}">
      <i class="fa-solid fa-chevron-right"></i></button>`;

    nav.innerHTML = html;
  }

  /* ============================================
     Master Tables
  ============================================ */
  function renderMasterTables() {
    // Categories
    const catBody = document.getElementById('categoryTableBody');
    if (catBody) {
      catBody.innerHTML = Storage.getCategories().map(x => `
        <tr style="opacity:${x.isActive ? 1 : .55}">
          <td><span class="badge"><i class="fa-solid ${UI.escapeHtml(x.icon)}"></i> ${UI.escapeHtml(x.name)}</span></td>
          <td>${UI.fmtMoney(x.budget)}</td>
          <td>
            <span class="status-badge ${x.isActive ? 'active' : 'inactive'}">
              <i class="fa-solid ${x.isActive ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
              ${x.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </span>
          </td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-sm ${x.isActive ? 'btn-amber' : 'btn-primary'}" data-action="toggle-cat" data-id="${UI.escapeHtml(x.id)}">
                <i class="fa-solid ${x.isActive ? 'fa-eye-slash' : 'fa-eye'}"></i>
              </button>
              <button class="btn btn-sky btn-sm" data-action="edit-cat" data-id="${UI.escapeHtml(x.id)}">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-rose btn-sm" data-action="delete-cat" data-id="${UI.escapeHtml(x.id)}">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Payments
    const payBody = document.getElementById('paymentTableBody');
    if (payBody) {
      payBody.innerHTML = Storage.getPaymentTypes().map(x => `
        <tr style="opacity:${x.isActive ? 1 : .55}">
          <td><span class="badge badge-payment"><i class="fa-solid ${UI.escapeHtml(x.icon)}"></i> ${UI.escapeHtml(x.name)}</span></td>
          <td>
            <span class="status-badge ${x.isActive ? 'active' : 'inactive'}">
              <i class="fa-solid ${x.isActive ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
              ${x.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
            </span>
          </td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-sm ${x.isActive ? 'btn-amber' : 'btn-primary'}" data-action="toggle-pay" data-id="${UI.escapeHtml(x.id)}">
                <i class="fa-solid ${x.isActive ? 'fa-eye-slash' : 'fa-eye'}"></i>
              </button>
              <button class="btn btn-sky btn-sm" data-action="edit-pay" data-id="${UI.escapeHtml(x.id)}">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn btn-rose btn-sm" data-action="delete-pay" data-id="${UI.escapeHtml(x.id)}">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  }

  /* ============================================
     Icon Helpers
  ============================================ */
  function getCatIcon(name) {
    const item = Storage.getCategoryByName(name);
    return (item && item.icon) || 'fa-tag';
  }

  function getPayIcon(name) {
    const item = Storage.getPaymentTypeByName(name);
    return (item && item.icon) || 'fa-wallet';
  }

  /* ============================================
     Helpers
  ============================================ */
  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /* ============================================
     Render All
  ============================================ */
  function renderAll() {
    try {
      renderDashboard();
      renderPaymentSummary();
      Charts.renderAll(Storage.getExpenses());
      renderDropdowns();
      renderHistory();
      renderMasterTables();
    } catch (err) {
      console.error('Render error:', err);
      UI.showToast('แสดงผลไม่สำเร็จ: ' + err.message, 'fa-triangle-exclamation');
    }
  }

  /* ============================================
     Event Handlers — Setup
  ============================================ */
  function setupEventListeners() {

    // Navigation
    document.querySelectorAll('.nav-btn, .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => showView(btn.dataset.view));
    });

    // FAB
    const fab = document.getElementById('quickAddFab');
    if (fab) {
      fab.addEventListener('click', () => {
        showView('viewExpense');
        setTimeout(() => {
          const el = document.getElementById('expAmount');
          if (el) el.focus();
        }, 350);
      });
    }

    // Modal + data-action (delegated)
    document.addEventListener('click', e => {
      // Close button
      const closeBtn = e.target.closest('[data-close]');
      if (closeBtn) {
        UI.closeModal(closeBtn.dataset.close);
        return;
      }

      // Backdrop click
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        return;
      }

      // data-action buttons
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      switch (action) {
        case 'delete-expense': handleDeleteExpense(id); break;
        case 'toggle-cat':     handleToggleCat(id);     break;
        case 'edit-cat':       openEditCat(id);         break;
        case 'delete-cat':     handleDeleteCat(id);     break;
        case 'toggle-pay':     handleTogglePay(id);     break;
        case 'edit-pay':       openEditPay(id);         break;
        case 'delete-pay':     handleDeletePay(id);     break;
      }
    });

    // Forms
    const expForm = document.getElementById('expenseForm');
    if (expForm) expForm.addEventListener('submit', e => { e.preventDefault(); handleExpenseSubmit(); });

    const addCatForm = document.getElementById('addCatForm');
    if (addCatForm) addCatForm.addEventListener('submit', e => { e.preventDefault(); handleAddCategory(); });

    const addPayForm = document.getElementById('addPayForm');
    if (addPayForm) addPayForm.addEventListener('submit', e => { e.preventDefault(); handleAddPayment(); });

    const editCatForm = document.getElementById('editCatForm');
    if (editCatForm) editCatForm.addEventListener('submit', e => { e.preventDefault(); handleSaveEditCat(); });

    const editPayForm = document.getElementById('editPayForm');
    if (editPayForm) editPayForm.addEventListener('submit', e => { e.preventDefault(); handleSaveEditPay(); });

    // Filters
    ['filterSearch', 'filterStartDate', 'filterEndDate', 'filterCat', 'filterPay'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === 'filterSearch' ? 'input' : 'change', () => {
        PAGINATION.currentPage = 1;
        renderHistory();
      });
    });

    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        ['filterSearch', 'filterStartDate', 'filterEndDate', 'filterCat', 'filterPay'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        PAGINATION.currentPage = 1;
        renderHistory();
      });
    }

    const pageSize = document.getElementById('pageSizeSelect');
    if (pageSize) {
      pageSize.addEventListener('change', e => {
        PAGINATION.pageSize = Number(e.target.value);
        PAGINATION.currentPage = 1;
        renderHistory();
      });
    }

    // Pagination (delegated)
    const pag = document.getElementById('paginationNav');
    if (pag) {
      pag.addEventListener('click', e => {
        const btn = e.target.closest('[data-page]');
        if (!btn || btn.disabled) return;
        PAGINATION.currentPage = Number(btn.dataset.page);
        renderHistory();
      });
    }

    // Data Management
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', handleExport);

    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        document.getElementById('importFile').click();
      });
    }

    const importFile = document.getElementById('importFile');
    if (importFile) importFile.addEventListener('change', handleImport);

    const syncBtn = document.getElementById('syncSheetsBtn');
    if (syncBtn) syncBtn.addEventListener('click', handleSyncSheets);

    const refreshBtn = document.getElementById('refreshSyncBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', handleRefreshSync);

    const clearBtn = document.getElementById('clearAllBtn');
    if (clearBtn) clearBtn.addEventListener('click', handleClearAll);
  }

  /* ============================================
     Handlers
  ============================================ */
  function handleExpenseSubmit() {
    try {
      const payload = {
        date:        document.getElementById('expDate').value,
        amount:      document.getElementById('expAmount').value,
        category:    document.getElementById('expCategory').value,
        paymentType: document.getElementById('expPayment').value,
        description: document.getElementById('expDesc').value,
        note:        document.getElementById('expNote').value
      };

      Storage.addExpense(payload);
      UI.showToast('บันทึกค่าใช้จ่ายเรียบร้อยแล้ว');

      document.getElementById('expenseForm').reset();
      document.getElementById('expDate').valueAsDate = new Date();

      renderAll();
      showView('viewDashboard');
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function handleDeleteExpense(id) {
    if (!confirm('ยืนยันการลบรายการนี้?')) return;
    try {
      Storage.deleteExpense(id);
      UI.showToast('ลบรายการเรียบร้อยแล้ว');
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function handleAddCategory() {
    try {
      Storage.addCategory({
        name:   document.getElementById('newCatName').value,
        budget: document.getElementById('newCatBudget').value,
        icon:   document.getElementById('newCatIcon').value
      });
      UI.showToast('เพิ่มหมวดหมู่เรียบร้อยแล้ว');
      document.getElementById('newCatName').value = '';
      document.getElementById('newCatBudget').value = '';
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function openEditCat(id) {
    const item = Storage.getCategory(id);
    if (!item) return;
    document.getElementById('editCatId').value = item.id;
    document.getElementById('editCatName').value = item.name;
    document.getElementById('editCatBudget').value = item.budget;
    document.getElementById('editCatIcon').value = item.icon;
    UI.openModal('editCatModal');
  }

  function handleSaveEditCat() {
    try {
      Storage.updateCategory(document.getElementById('editCatId').value, {
        name:   document.getElementById('editCatName').value,
        budget: document.getElementById('editCatBudget').value,
        icon:   document.getElementById('editCatIcon').value
      });
      UI.closeModal('editCatModal');
      UI.showToast('แก้ไขหมวดหมู่เรียบร้อยแล้ว');
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function handleToggleCat(id) {
    try {
      const cat = Storage.toggleCategoryStatus(id);
      UI.showToast(cat.isActive ? 'เปิดใช้งานหมวดหมู่แล้ว' : 'ปิดใช้งานหมวดหมู่แล้ว');
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function handleDeleteCat(id) {
    if (!confirm('ยืนยันการลบหมวดหมู่นี้?')) return;
    try {
      Storage.deleteCategory(id);
      UI.showToast('ลบหมวดหมู่เรียบร้อยแล้ว');
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function handleAddPayment() {
    try {
      Storage.addPaymentType({
        name: document.getElementById('newPayName').value,
        icon: document.getElementById('newPayIcon').value
      });
      UI.showToast('เพิ่มช่องทางชำระเงินเรียบร้อยแล้ว');
      document.getElementById('newPayName').value = '';
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function openEditPay(id) {
    const item = Storage.getPaymentType(id);
    if (!item) return;
    document.getElementById('editPayId').value = item.id;
    document.getElementById('editPayName').value = item.name;
    document.getElementById('editPayIcon').value = item.icon;
    UI.openModal('editPayModal');
  }

  function handleSaveEditPay() {
    try {
      Storage.updatePaymentType(document.getElementById('editPayId').value, {
        name: document.getElementById('editPayName').value,
        icon: document.getElementById('editPayIcon').value
      });
      UI.closeModal('editPayModal');
      UI.showToast('แก้ไขช่องทางชำระเงินเรียบร้อยแล้ว');
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function handleTogglePay(id) {
    try {
      const pay = Storage.togglePaymentTypeStatus(id);
      UI.showToast(pay.isActive ? 'เปิดใช้งานช่องทางแล้ว' : 'ปิดใช้งานช่องทางแล้ว');
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  function handleDeletePay(id) {
    if (!confirm('ยืนยันการลบช่องทางนี้?')) return;
    try {
      Storage.deletePaymentType(id);
      UI.showToast('ลบช่องทางชำระเงินเรียบร้อยแล้ว');
      renderAll();
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    }
  }

  /* ============================================
     Data Management Handlers
  ============================================ */
  function handleExport() {
    const data = Storage.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-tracker-${UI.dateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('ส่งออกข้อมูลเรียบร้อยแล้ว');
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const json = JSON.parse(ev.target.result);
        Storage.importData(json);
        UI.showToast('นำเข้าข้อมูลเรียบร้อยแล้ว');
        renderAll();
      } catch (err) {
        UI.showToast('ไฟล์ไม่ถูกต้อง: ' + err.message, 'fa-triangle-exclamation');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  async function handleSyncSheets() {
    UI.showLoading(true);
    try {
      await Storage.pushToSheets();
      UI.showToast('Sync ขึ้น Google Sheets เรียบร้อยแล้ว');
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    } finally {
      UI.showLoading(false);
    }
  }

  async function handleRefreshSync() {
    UI.showLoading(true);
    try {
      await Storage.syncFromSheets();
      renderAll();
      UI.showToast('ดึงข้อมูลล่าสุดเรียบร้อยแล้ว');
    } catch (err) {
      UI.showToast(err.message, 'fa-triangle-exclamation');
    } finally {
      UI.showLoading(false);
    }
  }

  function handleClearAll() {
    if (!confirm('ลบข้อมูลรายการทั้งหมด? (Master Data จะถูกเก็บไว้)')) return;
    Storage.clearAll();
    UI.showToast('ล้างข้อมูลเรียบร้อยแล้ว');
    renderAll();
  }

  /* ============================================
     Init
  ============================================ */
  async function init() {
    UI.showLoading(true);

    try {
      await Storage.init();

      setupEventListeners();

      const expDate = document.getElementById('expDate');
      if (expDate) expDate.valueAsDate = new Date();

      renderAll();

      console.log('🚀 App ready');
    } catch (err) {
      console.error('Init error:', err);
      UI.showToast('โหลดข้อมูลไม่สำเร็จ: ' + err.message, 'fa-triangle-exclamation');
    } finally {
      UI.showLoading(false);
    }
  }

  return { init, showView };
})();

/* ---------- Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', App.init);
