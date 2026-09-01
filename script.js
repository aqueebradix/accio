const navItems = document.querySelectorAll('.nav-item');
const genericView = document.getElementById('generic-view');
const genericTitle = document.getElementById('generic-title');
const domainsView = document.getElementById('domains-view');

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

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navItems.forEach((el) => el.classList.remove('active'));
    item.classList.add('active');
    const tab = item.getAttribute('data-tab');

    if (tab === 'domains') {
      domainsView.hidden = false;
      genericView.hidden = true;
    } else {
      domainsView.hidden = true;
      genericView.hidden = false;
      genericTitle.textContent = titles[tab] || '';
    }
  });
});
