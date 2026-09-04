const navItems = document.querySelectorAll('.nav-item');
const taskItem = document.getElementById('task-shopify-setup');
const genericView = document.getElementById('generic-view');
const genericTitle = document.getElementById('generic-title');
const chatView = document.getElementById('chat-view');
const domainsView = document.getElementById('domains-view');
const topbarTitleEl = document.getElementById('topbar-title');

const titles = {
  'new-task': 'New task',
  'agents': 'Agents',
  'plugins': 'Plugins',
  'scheduled': 'Scheduled Tasks',
  'channels': 'Channels',
  'mobile': 'Mobile',
  'domains': 'Domains',
  'knowledge': 'Knowledge Base'
};

function showTab(tab) {
  navItems.forEach((el) => el.classList.remove('active'));
  if (taskItem) taskItem.classList.remove('active');

  chatView.hidden = true;
  domainsView.hidden = true;
  genericView.hidden = true;
  topbarTitleEl.hidden = true;
  topbarTitleEl.textContent = '';

  if (tab === 'chat') {
    if (taskItem) taskItem.classList.add('active');
    chatView.hidden = false;
    topbarTitleEl.textContent = 'Shopify store setup';
    topbarTitleEl.hidden = false;
  } else if (tab === 'domains') {
    navItems.forEach((el) => {
      if (el.getAttribute('data-tab') === 'domains') el.classList.add('active');
    });
    domainsView.hidden = false;
  } else {
    navItems.forEach((el) => {
      if (el.getAttribute('data-tab') === tab) el.classList.add('active');
    });
    genericView.hidden = false;
    genericTitle.textContent = titles[tab] || '';
  }
}

navItems.forEach((item) => {
  item.addEventListener('click', () => showTab(item.getAttribute('data-tab')));
});

if (taskItem) {
  taskItem.addEventListener('click', () => showTab('chat'));
}

const upsellCard = document.getElementById('domain-upsell-card');
const upsellCta = document.getElementById('domain-upsell-cta');

function goToDomains() {
  showTab('domains');
}

if (upsellCta) {
  upsellCta.addEventListener('click', (e) => {
    e.stopPropagation();
    goToDomains();
  });
}
if (upsellCard) {
  upsellCard.addEventListener('click', goToDomains);
  upsellCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToDomains();
    }
  });
}

showTab('chat');
