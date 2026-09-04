(function () {
  'use strict';

  /* =====================================================================
     TLD PORTFOLIO — single source of truth for pricing, free status,
     hero designation and display order (see PROTOTYPE-GUIDELINES.md §12).
     Hero TLD: .store — free for the first year. Everything else is paid.
     Prices are the suggested registration / renewal prices from the
     partner pricing sheet (not estimates).
  ===================================================================== */
  const HERO = { tld: '.store', freeRenew: 55 };

  const TLDS = [
    { tld: '.com',    price: 15, renewPrice: 16 },
    { tld: '.tech',   price: 55, renewPrice: 55 },
    { tld: '.online', price: 35, renewPrice: 35 },
    { tld: '.io',     price: 64, renewPrice: 64 },
    { tld: '.co',     price: 35, renewPrice: 35 },
    { tld: '.net',    price: 18, renewPrice: 18 },
    { tld: '.org',    price: 14, renewPrice: 18 },
    { tld: '.site',   price: 35, renewPrice: 35 },
  ];

  const ALL_TLD_STRINGS = [HERO.tld, ...TLDS.map((t) => t.tld)];

  /* ---------- State ---------- */
  const state = {
    hasRegisteredFirstDomain: false,
    domains: [],
    view: 'idle', // idle | results | register | success | manage
    currentQuery: '',
    pendingRegistration: null,
  };

  let pendingPayAction = null;
  let pendingCloseCallback = null;
  let openDotsIdx = null;

  /* ---------- Elements ---------- */
  const myDomainsCardEl = document.getElementById('my-domains-card');
  const domainsTableEl = document.getElementById('domains-table');

  const searchHeroEl = document.getElementById('search-hero');
  const heroHeadlineEl = document.getElementById('hero-headline');
  const searchFormEl = document.getElementById('search-form');
  const searchInputEl = document.getElementById('search-input');

  const resultsSectionEl = document.getElementById('results-section');
  const heroTldCardEl = document.getElementById('hero-tld-card');
  const resultsListEl = document.getElementById('results-list');

  const registerSectionEl = document.getElementById('register-section');
  const registerDomainEl = document.getElementById('register-domain');
  const registerPriceChipEl = document.getElementById('register-price-chip');
  const registerFormEl = document.getElementById('register-form');
  const registerSubmitEl = document.getElementById('register-submit');
  const registerCancelEl = document.getElementById('register-cancel');
  const regFirstNameEl = document.getElementById('reg-first-name');
  const regLastNameEl = document.getElementById('reg-last-name');
  const regEmailEl = document.getElementById('reg-email');
  const regPhoneEl = document.getElementById('reg-phone');
  const regAddressEl = document.getElementById('reg-address');
  const regCityEl = document.getElementById('reg-city');
  const regStateEl = document.getElementById('reg-state');
  const regPostalEl = document.getElementById('reg-postal');
  const regCountryEl = document.getElementById('reg-country');
  const regConsentEl = document.getElementById('reg-consent');

  const successSectionEl = document.getElementById('success-section');
  const successSubtitleEl = document.getElementById('success-subtitle');
  const successMessageEl = document.getElementById('success-message');
  const successMyDomainsBtn = document.getElementById('success-my-domains');

  const manageDomainSectionEl = document.getElementById('manage-domain-section');
  const manageBackBtn = document.getElementById('manage-back-btn');
  const manageDomainNameEl = document.getElementById('manage-domain-name');
  const managePrimaryBadgeEl = document.getElementById('manage-primary-badge');
  const manageInfoSubtitleEl = document.getElementById('manage-info-subtitle');
  const dnsRecordsBodyEl = document.getElementById('dns-records-body');
  const manageAutorenewToggleEl = document.getElementById('manage-autorenew-toggle');
  const manageAutorenewSubtitleEl = document.getElementById('manage-autorenew-subtitle');
  const manageTransferSubtitleEl = document.getElementById('manage-transfer-subtitle');
  const manageDeleteSubtitleEl = document.getElementById('manage-delete-subtitle');
  const connectTabEls = document.querySelectorAll('.connect-tab');
  const ciDomainEls = document.querySelectorAll('.ci-domain');

  const paymentModalEl = document.getElementById('payment-modal');
  const modalInvoiceViewEl = document.getElementById('modal-invoice-view');
  const modalSuccessViewEl = document.getElementById('modal-success-view');
  const modalSuccessTitleEl = document.getElementById('modal-success-title');
  const modalSuccessMessageEl = document.getElementById('modal-success-message');
  const modalDoneBtn = document.getElementById('modal-done-btn');
  const invoiceAmountEl = document.getElementById('invoice-amount');
  const invoiceDescEl = document.getElementById('invoice-desc');
  const invoiceNumberEl = document.getElementById('invoice-number');
  const invoiceDueEl = document.getElementById('invoice-due');
  const invoicePayBtn = document.getElementById('invoice-pay');
  const invoiceCloseBtn = document.getElementById('payment-close');
  const invoiceDownloadBtn = document.getElementById('invoice-download');

  /* ---------- Helpers ---------- */
  function fmtMoney(n) {
    return '$' + (Math.round(n * 100) / 100).toString();
  }
  function fmtDate(d) {
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  function freeBadge() {
    return '<span class="free-badge">1<sup>st</sup> Year Free</span>';
  }

  function parseQuery(raw) {
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '');
    for (const tld of ALL_TLD_STRINGS) {
      if (cleaned.endsWith(tld) && cleaned.length > tld.length) {
        return { base: cleaned.slice(0, -tld.length).replace(/[^a-z0-9-]/g, ''), typedTld: tld };
      }
    }
    return { base: cleaned.replace(/[^a-z0-9-]/g, ''), typedTld: null };
  }

  function getOrderedList(typedTld) {
    const list = TLDS.map((t) => ({ ...t }));
    if (typedTld && typedTld !== HERO.tld && typedTld !== '.com') {
      const idx = list.findIndex((t) => t.tld === typedTld);
      if (idx > 0) {
        const [item] = list.splice(idx, 1);
        list.unshift(item);
      }
    }
    return list;
  }

  /* ---------- View switching ---------- */
  function showView(view) {
    state.view = view;
    searchHeroEl.hidden = !(view === 'idle' || view === 'results');
    resultsSectionEl.hidden = !(view === 'results');
    registerSectionEl.hidden = !(view === 'register');
    successSectionEl.hidden = !(view === 'success');
    manageDomainSectionEl.hidden = !(view === 'manage');
    updateMyDomainsVisibility();
    updateHeroHeadline();
    if (view !== 'results') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function updateMyDomainsVisibility() {
    myDomainsCardEl.hidden = !(state.domains.length > 0 && state.view !== 'success' && state.view !== 'manage');
  }

  function updateHeroHeadline() {
    heroHeadlineEl.innerHTML = state.hasRegisteredFirstDomain
      ? 'Find another domain. <span class="bolt">⚡</span>'
      : 'Find your name. <span class="bolt">⚡</span>';
  }

  /* ---------- Rendering: hero TLD card ---------- */
  function renderHero(base) {
    const domain = base + HERO.tld;
    const free = !state.hasRegisteredFirstDomain;
    const priceMain = free ? 'Free' : fmtMoney(HERO.freeRenew) + '/yr';
    const priceSub = free ? `then ${fmtMoney(HERO.freeRenew)}/yr` : '';

    heroTldCardEl.innerHTML = `
      <div class="hero-tld-left">
        <div class="hero-tld-name-row">
          <span class="hero-tld-name">${domain}</span>
          ${free ? freeBadge() : ''}
          <span class="pro-chip">Pro</span>
        </div>
        <span class="hero-tld-sub">Recommended</span>
      </div>
      <div class="hero-tld-right">
        <div class="hero-tld-price">
          <span class="price-main">${priceMain}</span>
          ${priceSub ? `<span class="price-sub">${priceSub}</span>` : ''}
        </div>
        <button type="button" class="btn-black">Register →</button>
      </div>`;

    heroTldCardEl.querySelector('button').addEventListener('click', () => {
      openRegister({
        domain,
        isFree: free,
        payPrice: free ? 0 : HERO.freeRenew,
        renewPrice: HERO.freeRenew,
      });
    });
  }

  /* ---------- Rendering: results list ---------- */
  function renderResultsList(base, typedTld) {
    const list = getOrderedList(typedTld);
    resultsListEl.innerHTML = '';

    list.forEach((t) => {
      const domain = base + t.tld;

      const row = document.createElement('div');
      row.className = 'result-row';

      const priceMain = fmtMoney(t.price) + '/yr';

      row.innerHTML = `
        <div class="result-left">
          <span class="result-domain">${domain}</span>
        </div>
        <div class="result-right">
          <div class="result-price"><span class="price-main">${priceMain}</span></div>
          <button type="button" class="result-action">Register</button>
        </div>`;

      row.querySelector('.result-action').addEventListener('click', () => {
        openRegister({ domain, isFree: false, payPrice: t.price, renewPrice: t.renewPrice });
      });
      resultsListEl.appendChild(row);
    });
  }

  /* ---------- Search ---------- */
  searchFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = searchInputEl.value;
    const { base, typedTld } = parseQuery(raw);
    if (!base) return;
    state.currentQuery = raw;
    renderHero(base);
    renderResultsList(base, typedTld);
    showView('results');
  });

  /* ---------- Registration ---------- */
  function openRegister({ domain, isFree, payPrice, renewPrice }) {
    state.pendingRegistration = { domain, isFree, payPrice, renewPrice };
    registerDomainEl.textContent = domain;
    registerPriceChipEl.innerHTML = isFree ? '1<sup>st</sup> Year Free' : fmtMoney(payPrice) + '/yr';
    registerPriceChipEl.className = 'price-chip' + (isFree ? '' : ' paid');
    registerSubmitEl.textContent = isFree ? 'Register domain' : `Pay & Register — ${fmtMoney(payPrice)}`;

    regFirstNameEl.value = 'Alex';
    regLastNameEl.value = 'Carter';
    regEmailEl.value = 'alex.carter@example.com';
    regPhoneEl.value = '+1 (512) 555-0142';
    regAddressEl.value = '482 Maple Grove Drive';
    regCityEl.value = 'Austin';
    regStateEl.value = 'TX';
    regPostalEl.value = '78701';
    regCountryEl.value = 'United States';
    regConsentEl.checked = false;

    showView('register');
  }

  registerCancelEl.addEventListener('click', () => {
    showView(state.currentQuery ? 'results' : 'idle');
  });

  registerFormEl.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!regConsentEl.checked) return;
    const { domain, isFree, payPrice, renewPrice } = state.pendingRegistration;
    if (isFree) {
      completeRegistration(domain, renewPrice);
    } else {
      openPaymentModal({
        amount: payPrice,
        description: `Domain registration for ${domain}`,
        onPay: () => completeRegistration(domain, renewPrice),
      });
    }
  });

  function completeRegistration(domain, renewPrice) {
    const isFirst = state.domains.length === 0;
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    state.domains.push({ domain, expiry, connected: isFirst, autoRenew: true, renewPrice });
    state.hasRegisteredFirstDomain = true;

    renderDomainsTable();

    successSubtitleEl.textContent = `${domain} is now yours`;
    successMessageEl.innerHTML = isFirst
      ? 'Your domain is registered. Visit <strong>My domains</strong> and click <strong>Manage domain</strong> to connect it to your store.'
      : 'Your domain is registered. Visit <strong>My domains</strong> and click <strong>Manage domain</strong> to set it up or make it your primary domain.';

    showView('success');
  }

  successMyDomainsBtn.addEventListener('click', () => {
    showView('idle');
  });

  /* ---------- My Domains table ---------- */
  function renderDomainsTable(highlightDomain) {
    domainsTableEl.innerHTML = '';
    state.domains.forEach((d, idx) => {
      const row = document.createElement('div');
      row.className = 'domain-row';
      const flash = d.domain === highlightDomain;
      row.innerHTML = `
        <div class="domain-info">
          <span class="domain-name">${d.domain}</span>
          <span class="domain-expiry${flash ? ' expiry-flash' : ''}">Expiry ${fmtDate(d.expiry)}</span>
        </div>
        <div class="domain-actions">
          <div class="autorenew-toggle">
            <span class="autorenew-label">Auto-renew</span>
            <label class="switch">
              <input type="checkbox" class="autorenew-input" ${d.autoRenew ? 'checked' : ''}>
              <span class="switch-track"></span>
            </label>
          </div>
          <button type="button" class="domain-action-btn primary manage-btn">Manage domain</button>
          <button type="button" class="domain-action-btn renew-btn">Renew</button>
          <div class="dots-menu-wrap">
            <button type="button" class="dots-btn" title="More">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.3"></circle><circle cx="12" cy="12" r="1.3"></circle><circle cx="12" cy="19" r="1.3"></circle></svg>
            </button>
          </div>
        </div>`;

      row.querySelector('.autorenew-input').addEventListener('change', (e) => {
        d.autoRenew = e.target.checked;
      });

      row.querySelector('.manage-btn').addEventListener('click', () => {
        openManageDomain(idx);
      });

      row.querySelector('.renew-btn').addEventListener('click', () => {
        openPaymentModal({
          amount: d.renewPrice,
          description: `Domain renewal for ${d.domain}`,
          onPay: () => {
            d.expiry = new Date(d.expiry);
            d.expiry.setFullYear(d.expiry.getFullYear() + 1);
            return {
              title: 'Domain renewed!',
              message: `${d.domain} is now active through ${fmtDate(d.expiry)}.`,
              onDone: () => renderDomainsTable(d.domain),
            };
          },
        });
      });

      row.querySelector('.dots-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDotsMenu(idx, row);
      });

      domainsTableEl.appendChild(row);
    });
    updateMyDomainsVisibility();
  }

  function closeAllDots() {
    document.querySelectorAll('.dots-dropdown').forEach((el) => el.remove());
    openDotsIdx = null;
  }

  function toggleDotsMenu(idx, row) {
    const wasOpen = openDotsIdx === idx;
    closeAllDots();
    if (wasOpen) return;
    openDotsIdx = idx;

    const d = state.domains[idx];
    const wrap = row.querySelector('.dots-menu-wrap');
    const dd = document.createElement('div');
    dd.className = 'dots-dropdown';
    dd.innerHTML = `<button type="button" class="make-primary-btn" ${d.connected ? 'disabled' : ''}>${d.connected ? 'Primary domain' : 'Make primary'}</button>`;
    wrap.appendChild(dd);

    dd.querySelector('.make-primary-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      state.domains.forEach((dm, i) => { dm.connected = i === idx; });
      closeAllDots();
      renderDomainsTable();
    });
  }

  document.addEventListener('click', closeAllDots);

  /* ---------- Manage domain ---------- */
  let manageTargetIdx = null;

  function dnsRecordsFor() {
    const token = 'accio-verify=' + Math.random().toString(36).slice(2, 10);
    return [
      { type: 'A', name: '@', value: '192.0.2.1', ttl: 3600 },
      { type: 'CNAME', name: 'www', value: 'connect.acciowork.com', ttl: 3600 },
      { type: 'TXT', name: '_accio-verify', value: token, ttl: 3600 },
    ];
  }

  function renderDnsRecords(records) {
    dnsRecordsBodyEl.innerHTML = '';
    records.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'dns-table-row';
      row.innerHTML = `
        <span><strong>${r.type}</strong></span>
        <span>${r.name}</span>
        <span title="${r.value}">${r.value}</span>
        <span class="dns-ttl">${r.ttl}</span>
        <button type="button" class="dns-delete-btn" aria-label="Delete record">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"></path><path d="M10 11v6M14 11v6"></path><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"></path><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"></path></svg>
        </button>`;
      row.querySelector('.dns-delete-btn').addEventListener('click', () => row.remove());
      dnsRecordsBodyEl.appendChild(row);
    });
  }

  function openManageDomain(idx) {
    manageTargetIdx = idx;
    const d = state.domains[idx];

    manageDomainNameEl.textContent = d.domain;
    managePrimaryBadgeEl.hidden = !d.connected;
    manageInfoSubtitleEl.textContent = 'Point this domain to your store by adding the DNS records below, or check your store platform’s custom-domain settings for the exact values it needs.';

    ciDomainEls.forEach((el) => { el.textContent = d.domain; });
    connectTabEls.forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('.connect-instructions').forEach((panel) => { panel.hidden = true; });

    renderDnsRecords(dnsRecordsFor());

    manageAutorenewToggleEl.checked = d.autoRenew;
    manageAutorenewSubtitleEl.textContent = d.autoRenew
      ? `Renews automatically at ${fmtMoney(d.renewPrice)}/yr on ${fmtDate(d.expiry)}. Cancel anytime.`
      : `Auto-renew is off. ${d.domain} will not renew automatically.`;

    manageTransferSubtitleEl.textContent = `Move ${d.domain} to another registrar. We'll send you an authorization code.`;
    manageDeleteSubtitleEl.textContent = `Permanently remove ${d.domain} from your account. This can't be undone.`;

    showView('manage');
  }

  manageBackBtn.addEventListener('click', () => {
    manageTargetIdx = null;
    showView('idle');
  });

  connectTabEls.forEach((tab) => {
    tab.addEventListener('click', () => {
      const platform = tab.getAttribute('data-platform');
      const panel = document.getElementById(`connect-instructions-${platform}`);
      const isOpen = tab.classList.contains('active');

      connectTabEls.forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.connect-instructions').forEach((p) => { p.hidden = true; });

      if (!isOpen) {
        tab.classList.add('active');
        panel.hidden = false;
      }
    });
  });

  manageAutorenewToggleEl.addEventListener('change', () => {
    if (manageTargetIdx === null) return;
    const d = state.domains[manageTargetIdx];
    d.autoRenew = manageAutorenewToggleEl.checked;
    manageAutorenewSubtitleEl.textContent = d.autoRenew
      ? `Renews automatically at ${fmtMoney(d.renewPrice)}/yr on ${fmtDate(d.expiry)}. Cancel anytime.`
      : `Auto-renew is off. ${d.domain} will not renew automatically.`;
    renderDomainsTable();
  });

  /* ---------- Payment modal ----------
     onPay may optionally return { title, message, onDone } — when it does,
     the modal shows an in-place success state instead of closing immediately;
     onDone (if provided) fires once the close animation finishes, so a visual
     update (like the expiry-date flash) is revealed as the modal closes rather
     than while it's still covering the page. ---------- */
  function openPaymentModal({ amount, description, onPay }) {
    pendingPayAction = onPay;
    pendingCloseCallback = null;
    modalInvoiceViewEl.hidden = false;
    modalSuccessViewEl.hidden = true;
    invoiceAmountEl.textContent = fmtMoney(amount);
    invoiceDescEl.textContent = description;
    invoiceNumberEl.textContent = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    const due = new Date();
    due.setDate(due.getDate() + 7);
    invoiceDueEl.textContent = fmtDate(due);
    paymentModalEl.classList.remove('closing');
    paymentModalEl.hidden = false;
  }

  function closePaymentModal() {
    if (paymentModalEl.hidden) return;
    paymentModalEl.classList.add('closing');
    window.setTimeout(() => {
      paymentModalEl.hidden = true;
      paymentModalEl.classList.remove('closing');
      modalInvoiceViewEl.hidden = false;
      modalSuccessViewEl.hidden = true;
      pendingPayAction = null;
      const onDone = pendingCloseCallback;
      pendingCloseCallback = null;
      if (onDone) onDone();
    }, 200);
  }

  function showModalSuccess({ title, message, onDone }) {
    pendingCloseCallback = onDone || null;
    modalInvoiceViewEl.hidden = true;
    modalSuccessViewEl.hidden = false;
    modalSuccessTitleEl.textContent = title;
    modalSuccessMessageEl.textContent = message;
  }

  invoicePayBtn.addEventListener('click', () => {
    const action = pendingPayAction;
    pendingPayAction = null;
    const result = action ? action() : null;
    if (result && result.title) {
      showModalSuccess(result);
    } else {
      closePaymentModal();
    }
  });
  modalDoneBtn.addEventListener('click', closePaymentModal);
  invoiceCloseBtn.addEventListener('click', closePaymentModal);
  invoiceDownloadBtn.addEventListener('click', () => {});
  paymentModalEl.addEventListener('click', (e) => {
    if (e.target === paymentModalEl) closePaymentModal();
  });

  /* ---------- Init ---------- */
  updateHeroHeadline();
  updateMyDomainsVisibility();
})();
