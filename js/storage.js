/* ============================================
   LocalStorage Data Layer
   + Optional Google Sheets sync
============================================ */
const Storage = (() => {

  let state = {
    categories: [],
    paymentTypes: [],
    expenses: []
  };

  /* ---------- LocalStorage ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = {
          categories: parsed.categories || [],
          paymentTypes: parsed.paymentTypes || [],
          expenses: parsed.expenses || []
        };
        return state;
      }
    } catch (e) {
      console.warn('Load failed:', e);
    }
    seed();
    return state;
  }

  function save() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  function seed() {
    state.categories   = CONFIG.SEED.categories.map(c => ({...c}));
    state.paymentTypes = CONFIG.SEED.paymentTypes.map(p => ({...p}));
    state.expenses     = [];
    save();
  }

  /* ---------- Utilities ---------- */
  function createId(prefix) {
    return prefix + Date.now().toString(36).toUpperCase()
      + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  /* ---------- Categories ---------- */
  function getCategories()  { return state.categories; }
  function getCategory(id)  { return state.categories.find(c => c.id === id); }
  function getCategoryByName(name) { return state.categories.find(c => c.name === name); }

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
    save();
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
    save();
    return cat;
  }

  function toggleCategoryStatus(id) {
    const cat = getCategory(id);
    if (!cat) throw new Error('ไม่พบหมวดหมู่');
    cat.isActive = !cat.isActive;
    save();
    return cat;
  }

  function deleteCategory(id) {
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('ไม่พบหมวดหมู่');
    state.categories.splice(idx, 1);
    save();
  }

  /* ---------- Payment Types ---------- */
  function getPaymentTypes() { return state.paymentTypes; }
  function getPaymentType(id) { return state.paymentTypes.find(p => p.id === id); }
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
    save();
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
    save();
    return pay;
  }

  function togglePaymentTypeStatus(id) {
    const pay = getPaymentType(id);
    if (!pay) throw new Error('ไม่พบช่องทางชำระเงิน');
    pay.isActive = !pay.isActive;
    save();
    return pay;
  }

  function deletePaymentType(id) {
    const idx = state.paymentTypes.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('ไม่พบช่องทางชำระเงิน');
    state.paymentTypes.splice(idx, 1);
    save();
  }

  /* ---------- Expenses ---------- */
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

    if (!date)                       throw new Error('กรุณาระบุวันที่');
    if (!amount || amount <= 0)      throw new Error('จำนวนเงินไม่ถูกต้อง');
    if (!category)                   throw new Error('กรุณาเลือกหมวดหมู่');
    if (!paymentType)                throw new Error('กรุณาเลือกช่องทางชำระเงิน');
    if (!description)                throw new Error('กรุณาระบุรายการ');

    const exp = {
      id: createId('EXP'),
      date, amount, category, paymentType, description, note,
      createdAt: new Date().toISOString()
    };
    state.expenses.push(exp);
    save();
    return exp;
  }

  function deleteExpense(id) {
    const idx = state.expenses.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('ไม่พบรายการ');
    state.expenses.splice(idx, 1);
    save();
  }

  /* ---------- Import / Export ---------- */
  function exportData() {
    return {
      version: CONFIG.VERSION,
      exportedAt: new Date().toISOString(),
      ...state
    };
  }

  function importData(json) {
    if (!json || typeof json !== 'object') throw new Error('ข้อมูลไม่ถูกต้อง');
    if (!Array.isArray(json.categories) || !Array.isArray(json.paymentTypes))
      throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');

    state.categories   = json.categories;
    state.paymentTypes = json.paymentTypes;
    state.expenses     = Array.isArray(json.expenses) ? json.expenses : [];
    save();
    return state;
  }

  function clearAll() {
    state.expenses = [];
    save();
  }

  function resetAll() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    seed();
    return state;
  }

  /* ---------- Google Sheets Sync ---------- */
  async function syncToSheets() {
    const url = CONFIG.SHEETS_API_URL;
    if (!url) throw new Error('ยังไม่ได้ตั้งค่า Google Sheets API URL');

    // ใช้ fetch แบบ text/plain เพื่อเลี่ยง CORS preflight
    const res = await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'syncAll',
        data: exportData()
      })
    });
    return { status: 'success' };
  }

  return {
    load, save, seed,
    getCategories, getCategory, getCategoryByName,
    addCategory, updateCategory, toggleCategoryStatus, deleteCategory,
    getPaymentTypes, getPaymentType, getPaymentTypeByName,
    addPaymentType, updatePaymentType, togglePaymentTypeStatus, deletePaymentType,
    getExpenses, addExpense, deleteExpense,
    exportData, importData, clearAll, resetAll,
    syncToSheets,
    getState: () => state
  };
})();
