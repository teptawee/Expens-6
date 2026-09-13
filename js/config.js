/* ============================================
   Config & Constants
   V3.1.0
============================================ */
const CONFIG = {
  STORAGE_KEY: 'expenseTrackerV3',
  VERSION: '3.1.0',

  // ⭐ วาง Web App URL ของคุณตรงนี้ (ต้องลงท้าย /exec)
  SHEETS_API_URL: 'https://script.google.com/macros/s/AKfycbwDV_G-UI_gez0cIb-Ijp01JEbwJnBZndgfgqUqApd9vQGYgC0M_GBMCE8nqyzV3RnD/exec',

  CACHE_TTL: 5 * 60 * 1000,
  DATA_MODE: 'sheets',

  SEED: {
    categories: [
      { id: 'CAT-01', name: 'ค่าอาหาร',              budget: 4000, icon: 'fa-utensils',      isActive: true },
      { id: 'CAT-02', name: 'ค่าพาหนะ',              budget: 300,  icon: 'fa-bus',           isActive: true },
      { id: 'CAT-03', name: 'เครื่องดื่ม',           budget: 600,  icon: 'fa-glass-water',   isActive: true },
      { id: 'CAT-04', name: 'ค่ากาแฟ',               budget: 250,  icon: 'fa-mug-hot',       isActive: true },
      { id: 'CAT-05', name: 'ค่าของใช้ส่วนตัว',      budget: 500,  icon: 'fa-pump-soap',     isActive: true },
      { id: 'CAT-06', name: 'ค่าน้ำมันรถ',           budget: 600,  icon: 'fa-gas-pump',      isActive: true },
      { id: 'CAT-07', name: 'ค่ายารักษาโรค',        budget: 300,  icon: 'fa-pills',         isActive: true },
      { id: 'CAT-08', name: 'ค่าช้อปปิ้ง',           budget: 500,  icon: 'fa-bag-shopping',  isActive: true },
      { id: 'CAT-09', name: 'ค่าซื้อของใช้ที่จำเป็น', budget: 500,  icon: 'fa-cart-shopping', isActive: true },
      { id: 'CAT-10', name: 'ค่าอื่นๆ',              budget: 300,  icon: 'fa-shapes',        isActive: true },
      { id: 'CAT-11', name: 'ค่าหวย',                budget: 1200, icon: 'fa-ticket',        isActive: true }
    ],

    paymentTypes: [
      { id: 'PAY001', name: 'เงินสด',       icon: 'fa-money-bill-wave',  isActive: true },
      { id: 'PAY002', name: 'พร้อมเพย์',    icon: 'fa-qrcode',           isActive: true },
      { id: 'PAY003', name: 'บัตรเครดิต',  icon: 'fa-credit-card',      isActive: true },
      { id: 'PAY004', name: 'บัตรเดบิต',   icon: 'fa-credit-card',      isActive: true },
      { id: 'PAY005', name: 'โอนเงิน',      icon: 'fa-building-columns', isActive: true },
      { id: 'PAY006', name: 'อื่นๆ',        icon: 'fa-wallet',           isActive: true }
    ]
  },

  PASTEL_COLORS: [
    '#8b80f9', '#f472b6', '#38bdf8', '#34d399', '#fbbf24',
    '#a78bfa', '#fb7185', '#2dd4bf', '#f87171', '#818cf8'
  ]
};
