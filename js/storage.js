/* ============================================
   Storage — Hybrid LocalStorage + Google Sheets
   V3.2.0
============================================ */
const Storage = (() => {

  let state = {
    categories: [],
    paymentTypes: [],
    expenses: []
  };

  let lastSyncTime = 0;
  let isSyncing = false;

  /* ============================================
     LocalStorage (cache layer)
  ============================================ */
  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (!raw) return false;

      const parsed = JSON.parse(raw);
      state = {
        categories:   Array.isArray(parsed.categories)   ? parsed.categories   : [],
        paymentTypes: Array.isArray(parsed.paymentTypes) ? parsed.paymentTypes : [],
        expenses:     Array.isArray(parsed.expenses)     ? parsed.expenses     : []
      };
      lastSyncTime = parsed._syncedAt || 0;
      return true;
    } catch (e) {
      console.warn('Load local failed:', e);
      return false;
    }
  }

  function saveToLocal() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
        categories:   state.categories,
        paymentTypes: state.paymentTypes,
        expenses:     state.expenses,
        _syncedAt:    lastSyncTime,
        _version:     CONFIG.VERSION
      }));
      return true;
    } catch (e) {
      console.error('Save local failed:', e);
      return false;
    }
  }

  function seed() {
    state.categories   = CONFIG.SEED.categories.map(c => ({ ...c }));
    state.paymentTypes = CONFIG.SEED.paymentTypes.map(p => ({ ...p }));
    state.expenses     = [];
    saveToLocal();
  }

  /* ============================================
     JSONP fetch
  ============================================ */
  function jsonpFetch(params) {
    return new Promise((resolve, reject) => {
      if (!CONFIG.SHEETS_API_URL) {
        reject(new Error('ยังไม่ได้ตั้งค่า SHEETS_API_URL ใน config.js'));
        return;
      }

      const callbackName = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

      const query = Object.keys(params)
        .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
        .join('&');

      const url = CONFIG.SHEETS_API_URL
        + (CONFIG.SHEETS_API_URL.includes('?') ? '&' : '?')
        + query
        + '&callback=' + callbackName;

      const script = document.createElement('script');
      script.src = url;
      script.async = true;

      let done = false;

      const cleanup = () => {
        if (done) return;
        done = true;
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      };

      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('เชื่อมต่อ Sheets API ไม่สำเร็จ — ตรวจสอบ URL หรือสิทธิ์การเข้าถึง'));
      };

      document.head.appendChild(script);

      setTimeout(() => {
        if (!done) {
          cleanup();
          reject(new Error('หมดเวลาเชื่อมต่อ Sheets (เกิน 20 วินาที)'));
        }
      }, 20000);
    });
  }

  /* ============================================
     Sync — ดึงข้อมูลจาก Sheets
  ============================================ */
  async function syncFromSheets() {
    if (!CONFIG.SHEETS_API_URL) {
      throw new Error('ยังไม่ได้ตั้งค่า SHEETS_API_URL');
    }

    if (isSyncing) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!isSyncing) {
            clearInterval(check);
            resolve(state);
          }
        }, 100);
      });
    }

    isSyncing = true;

    try {
      const res = await jsonpFetch({ action: 'getAll' });

      if (!res || res.status !== 'success') {
        throw new Error((res && res.message) || 'API ตอบกลับผิดพลาด');
      }

      const data = res.data || {};

      state = {
        categories:   Array.isArray(data.categories)   ? data.categories   : [],
        paymentTypes: Array.isArray(data.paymentTypes) ? data.paymentTypes : [],
        expenses:     Array.isArray(data.expenses)     ? data.expenses     : []
      };

      lastSyncTime = Date.now();
      saveToLocal();

      console.log('✅ Sync success:', {
        categories:   state.categories.length,
        paymentTypes: state.paymentTypes.length,
        expenses:     state.expenses.length
      });

      return state;

    } catch (err) {
      console.error('❌ Sync failed:', err.message);
      throw err;

    } finally {
      isSyncing = false;
    }
  }

  /* ============================================
     Push — ส่งข้อมูลขึ้น Sheets ผ่าน JSONP (GET)
  ============================================ */
  async function pushToSheets() {
    if (!CONFIG.SHEETS_API_URL) {
      console.warn('SHEETS_API_URL ไม่ได้ตั้งค่า — ข้ามการ sync');
      return;
    }

    try {
      const payload = JSON.stringify({
        categories:   state.categories,
        paymentTypes: state.paymentTypes,
        expenses:     state.expenses
      });

      // ถ้า payload ยาวเกิน ~6KB → ส่งทีละ part
      if (payload.length > 6000) {
        console.warn('Payload ใหญ่เกิน — ส่งเฉพาะ expenses');
        await jsonpFetch({
          action: 'syncAll',
          payload: JSON.stringify({ expenses: state.expenses })
        });
      } else {
        const res = await jsonpFetch({ action: 'syncAll', payload });
        if (!res || res.status !== 'success') {
          throw new Error((res && res.message) || 'syncAll failed');
        }
      }

      lastSyncTime = Date.now();
      saveToLocal();
      console.log('📤 Pushed to Sheets');
    } catch (err) {
      console.warn('Push failed:', err.message);
      // ไม่ throw เพื่อไม่ให้ flow หลักพัง
    }
  }

  /* ============================================
     Init — Hybrid Load
  ============================================ */
  async function init() {
    const hasLocal = loadFromLocal();

    if (!hasLocal) {
      seed();
    }

    if (CONFIG.SHEETS_API_URL && CONFIG.DATA_MODE === 'sheets') {
      try {
        await syncFromSheets();
      } catch (err) {
        console.warn('Sync from Sheets failed:', err.message);
        if (!hasLocal) throw err;
      }
    }

    return state;
  }

  /* ============================================
     Utilities
  ============================================ */
  function createId(prefix) {
    return prefix
      + Date.now().toString(36).toUpperCase()
      + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  /* ============================================
     Categories
  ============================================ */
  function getCategories()          { return state.categories; }
  function getCategory(id)          { return state.categories.find(c => c.id === id); }
  function getCategoryByName(name)  { return state.categories.find(c => c.name === name); }

  function addCategory({ name, budget, icon }) {
    name = String(name || '').trim();
    if (!name) throw new Error('กรุณาระบุชื่อหมวดหมู่');
    if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase()))
      throw new Error('มีหมวดหมู่นี้อยู่แล้ว');

    const cat = {
      id: createId('CAT'),
      name,
      budget: Number(budget) || 0,
      icon: String(icon || 'fa-tag').trim(),
      isActive: true
    };
    state.categories.push(cat);
    saveToLocal();
    pushToSheets();
    return cat;
  }

  function updateCategory(id, { name, budget, icon }) {
    const cat = getCategory(id);
    if (!cat) throw new Error('ไม่พบหมวดหมู่');

    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('กรุณาระบุชื่อหมวดหมู่');
    if (state.categories.some(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase()))
      throw new Error('มีชื่อหมวดหมู่นี้อยู่แล้ว');

    cat.name   = trimmed;
    cat.budget = Number(budget) || 0;
    cat.icon   = String(icon || 'fa-tag').trim();
    saveToLocal();
    pushToSheets();
    return cat;
  }

  function toggleCategoryStatus(id) {
    const cat = getCategory(id);
    if (!cat) throw new Error('ไม่พบหมวดหมู่');
    cat.isActive = !cat.isActive;
    saveToLocal();
    pushToSheets();
    return cat;
  }

  function deleteCategory(id) {
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('ไม่พบหมวดหมู่');
    state.categories.splice(idx, 1);
    saveToLocal();
    pushToSheets();
  }

  /* ============================================
     Payment Types
  ============================================ */
  function getPaymentTypes()          { return state.paymentTypes; }
  function getPaymentType(id)         { return state.paymentTypes.find(p => p.id === id); }
  function getPaymentTypeByName(name) { return state.paymentTypes.find(p => p.name === name); }

  function addPaymentType({ name, icon }) {
    name = String(name || '').trim();
    if (!name) throw new Error('กรุณาระบุชื่อช่องทางชำระเงิน');
    if (state.paymentTypes.some(p => p.name.toLowerCase() === name.toLowerCase()))
      throw new Error('มีช่องทางนี้อยู่แล้ว');

    const pay = {
      id: createId('PAY'),
      name,
      icon: String(icon || 'fa-wallet').trim(),
      isActive: true
    };
    state.paymentTypes.push(pay);
    saveToLocal();
    pushToSheets();
    return pay;
  }

  function updatePaymentType(id, { name, icon }) {
    const pay = getPaymentType(id);
    if (!pay) throw new Error('ไม่พบช่องทางชำระเงิน');

    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('กรุณาระบุชื่อช่องทาง');
    if (state.paymentTypes.some(p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase()))
      throw new Error('มีชื่อช่องทางนี้อยู่แล้ว');

    pay.name = trimmed;
    pay.icon = String(icon || 'fa-wallet').trim();
    saveToLocal();
    pushToSheets();
    return pay;
  }

  function togglePaymentTypeStatus(id) {
    const pay = getPaymentType(id);
    if (!pay) throw new Error('ไม่พบช่องทางชำระเงิน');
    pay.isActive = !pay.isActive;
    saveToLocal();
    pushToSheets();
    return pay;
  }

  function deletePaymentType(id) {
    const idx = state.paymentTypes.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('ไม่พบช่องทางชำระเงิน');
    state.paymentTypes.splice(idx, 1);
    saveToLocal();
    pushToSheets();
  }

  /* ============================================
     Expenses
  ============================================ */
  function getExpenses() {
    return [...state.expenses].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return String(b.id).localeCompare(String(a.id));
    });
  }

  function addExpense(payload) {
    const date        = String(payload.date || '').trim();
    const amount      = Number(payload.amount);
    const category    = String(payload.category || '').trim();
    const paymentType = String(payload.paymentType || '').trim();
    const description = String(payload.description || '').trim();
    const note        = String(payload.note || '').trim();

    if (!date)                  throw new Error('กรุณาระบุวันที่');
    if (!amount || amount <= 0) throw new Error('จำนวนเงินไม่ถูกต้อง');
    if (!category)              throw new Error('กรุณาเลือกหมวดหมู่');
    if (!paymentType)           throw new Error('กรุณาเลือกช่องทางชำระเงิน');
    if (!description)           throw new Error('กรุณาระบุรายการ');

    const exp = {
      id: createId('EXP'),
      date, amount, category, paymentType, description, note,
      createdAt: new Date().toISOString()
    };
    state.expenses.push(exp);
    saveToLocal();
    pushToSheets();
    return exp;
  }

  function deleteExpense(id) {
    const idx = state.expenses.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('ไม่พบรายการ');
    state.expenses.splice(idx, 1);
    saveToLocal();
    pushToSheets();
  }

  /* ============================================
     Import / Export
  ============================================ */
  function exportData() {
    return {
      version: CONFIG.VERSION,
      exportedAt: new Date().toISOString(),
      categories:   state.categories,
      paymentTypes: state.paymentTypes,
      expenses:     state.expenses
    };
  }

  function importData(json) {
    if (!json || typeof json !== 'object') throw new Error('ข้อมูลไม่ถูกต้อง');
    if (!Array.isArray(json.categories) || !Array.isArray(json.paymentTypes))
      throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');

    state.categories   = json.categories;
    state.paymentTypes = json.paymentTypes;
    state.expenses     = Array.isArray(json.expenses) ? json.expenses : [];
    saveToLocal();
    pushToSheets();
    return state;
  }

  function clearAll() {
    state.expenses = [];
    saveToLocal();
    pushToSheets();
  }

  function resetAll() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    seed();
    return state;
  }

  /* ============================================
     Public API
  ============================================ */
  return {
    init,
    load: loadFromLocal,
    syncFromSheets,
    pushToSheets,

    getCategories, getCategory, getCategoryByName,
    addCategory, updateCategory, toggleCategoryStatus, deleteCategory,

    getPaymentTypes, getPaymentType, getPaymentTypeByName,
    addPaymentType, updatePaymentType, togglePaymentTypeStatus, deletePaymentType,

    getExpenses, addExpense, deleteExpense,

    exportData, importData, clearAll, resetAll,

    getState: () => state,
    getLastSyncTime: () => lastSyncTime,
    isSyncing: () => isSyncing
  };
})();
