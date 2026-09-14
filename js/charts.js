/* ============================================
   Charts
============================================ */
const Charts = (() => {

  let instances = {
    daily: null, weekly: null, monthly: null,
    topCategory: null, categoryPie: null, paymentPie: null
  };

  function destroy(name) {
    if (instances[name]) {
      instances[name].destroy();
      instances[name] = null;
    }
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function monthKey(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }

  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function sumByRange(expenses, start, end) {
    return expenses
      .filter(x => {
        const d = new Date(x.date + 'T00:00:00');
        return d >= start && d < end;
      })
      .reduce((s, x) => s + Number(x.amount || 0), 0);
  }

  const fmtMoney = (v) => '฿' + Number(v || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        cornerRadius: 8,
        titleFont: { family: 'Prompt', size: 12 },
        bodyFont:  { family: 'Prompt', size: 12 }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { callback: v => '฿' + Number(v).toLocaleString(), font: { family: 'Prompt', size: 10 } }
      },
      x: { grid: { display: false }, ticks: { font: { family: 'Prompt', size: 10 } } }
    }
  };

  /* ---------- Daily (7 days) ---------- */
  function renderDaily(expenses) {
    const now = new Date();
    const labels = [], data = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      labels.push(i === 0 ? 'วันนี้' : `${pad(d.getDate())}/${pad(d.getMonth()+1)}`);
      data.push(expenses.filter(x => x.date === key).reduce((s, x) => s + Number(x.amount || 0), 0));
    }

    const ctx = document.getElementById('dailyChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 290);
    gradient.addColorStop(0, 'rgba(139,128,249,.35)');
    gradient.addColorStop(1, 'rgba(139,128,249,0)');

    destroy('daily');
    instances.daily = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#8b80f9',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#8b80f9',
          pointBorderWidth: 2
        }]
      },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: { label: c => ` ยอด: ${fmtMoney(c.raw)}` }
          }
        }
      }
    });
  }

  /* ---------- Weekly (4 weeks) ---------- */
  function renderWeekly(expenses) {
    const monday = getStartOfWeek(new Date());
    const labels = [], data = [];

    for (let i = 3; i >= 0; i--) {
      const start = new Date(monday);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      labels.push(i === 0 ? 'สัปดาห์นี้' : `${pad(start.getDate())}/${pad(start.getMonth()+1)}`);
      data.push(sumByRange(expenses, start, end));
    }

    destroy('weekly');
    instances.weekly = new Chart(document.getElementById('weeklyChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((_, i) => i === 3 ? '#8b80f9' : '#d8d4fe'),
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: { label: c => ` ยอด: ${fmtMoney(c.raw)}` }
          }
        }
      }
    });
  }

  /* ---------- Monthly (6 months) ---------- */
  function renderMonthly(expenses) {
    const now = new Date();
    const names = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const labels = [], data = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKey(d);
      labels.push(`${names[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`);
      data.push(expenses.filter(x => x.date.startsWith(key)).reduce((s, x) => s + Number(x.amount || 0), 0));
    }

    destroy('monthly');
    instances.monthly = new Chart(document.getElementById('monthlyChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map((_, i) => i === 5 ? '#f472b6' : '#fbcfe8'),
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: { label: c => ` ยอด: ${fmtMoney(c.raw)}` }
          }
        }
      }
    });
  }

  /* ---------- Top 5 Categories ---------- */
  function renderTopCategories(expenses) {
    const totals = {};
    expenses.forEach(x => {
      totals[x.category] = (totals[x.category] || 0) + Number(x.amount || 0);
    });

    const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);

    destroy('topCategory');
    instances.topCategory = new Chart(document.getElementById('topCategoryChart'), {
      type: 'bar',
      data: {
        labels: top.map(x => x[0]),
        datasets: [{
          data: top.map(x => x[1]),
          backgroundColor: CONFIG.PASTEL_COLORS.slice(0, top.length),
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: 'Prompt', size: 12 },
            bodyFont:  { family: 'Prompt', size: 12 },
            callbacks: { label: c => ` ${fmtMoney(c.raw)}` }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: { callback: v => '฿' + Number(v).toLocaleString(), font: { family: 'Prompt', size: 10 } }
          },
          y: { grid: { display: false }, ticks: { font: { family: 'Prompt', size: 11 } } }
        }
      }
    });
  }

  /* ---------- Category Pie (this month) ---------- */
  function renderCategoryPie(expenses) {
    const key = monthKey(new Date());
    const totals = {};
    expenses.filter(x => x.date.startsWith(key)).forEach(x => {
      totals[x.category] = (totals[x.category] || 0) + Number(x.amount || 0);
    });

    const labels = Object.keys(totals);
    const data   = Object.values(totals);

    destroy('categoryPie');
    const ctx = document.getElementById('categoryPieChart');

    if (!data.length) {
      instances.categoryPie = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['ไม่มีข้อมูล'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'Prompt', size: 11 } } }, tooltip: { enabled: false } }
        }
      });
      return;
    }

    const total = data.reduce((a, b) => a + b, 0);

    instances.categoryPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: CONFIG.PASTEL_COLORS.slice(0, data.length),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { family: 'Prompt', size: 10 } } },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: 'Prompt', size: 12 },
            bodyFont:  { family: 'Prompt', size: 12 },
            callbacks: {
              label: c => {
                const pct = (c.raw / total * 100).toFixed(1);
                return ` ${c.label}: ${fmtMoney(c.raw)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /* ---------- Payment Pie (this month) ---------- */
  function renderPaymentPie(expenses) {
    const key = monthKey(new Date());
    const totals = {};
    expenses.filter(x => x.date.startsWith(key)).forEach(x => {
      totals[x.paymentType] = (totals[x.paymentType] || 0) + Number(x.amount || 0);
    });

    const labels = Object.keys(totals);
    const data   = Object.values(totals);

    destroy('paymentPie');
    const ctx = document.getElementById('paymentPieChart');

    if (!data.length) {
      instances.paymentPie = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['ไม่มีข้อมูล'], datasets: [{ data: [1], backgroundColor: ['#e2e8f0'] }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { font: { family: 'Prompt', size: 11 } } }, tooltip: { enabled: false } }
        }
      });
      return;
    }

    const total = data.reduce((a, b) => a + b, 0);

    instances.paymentPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: CONFIG.PASTEL_COLORS.slice(0, data.length),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { family: 'Prompt', size: 10 } } },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: 'Prompt', size: 12 },
            bodyFont:  { family: 'Prompt', size: 12 },
            callbacks: {
              label: c => {
                const pct = (c.raw / total * 100).toFixed(1);
                return ` ${c.label}: ${fmtMoney(c.raw)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  function renderAll(expenses) {
    renderDaily(expenses);
    renderWeekly(expenses);
    renderMonthly(expenses);
    renderTopCategories(expenses);
    renderCategoryPie(expenses);
    renderPaymentPie(expenses);
  }

  return { renderAll };
})();
