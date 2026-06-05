// app.js — Router and application entry point
import { seedData } from './data.js';
import { getCurrentUser, showLoginModal, logout } from './auth.js';
import { initTheme } from './utils/theme.js';
import { initMenu, updateMenu } from './components/menu.js';
import { renderHome }          from './pages/home.js';
import { renderAbout }         from './pages/about.js';
import { renderCalendar }      from './pages/calendar.js';
import { renderDutyManager }   from './pages/duty-manager.js';
import { renderBranchCommand } from './pages/branch-command.js';
import { renderUsers }         from './pages/user-management.js';
import { renderRequests }      from './pages/requests.js';
import { renderMarket }        from './pages/duty-market.js';

const ROUTES = {
  '':               renderHome,
  'home':           renderHome,
  'about':          renderAbout,
  'calendar':       renderCalendar,
  'duty-manager':   renderDutyManager,
  'branch-command': renderBranchCommand,
  'users':          renderUsers,
  'requests':       renderRequests,
  'market':         renderMarket,
};

function getPage() {
  return window.location.hash.replace('#', '') || 'home';
}

async function navigate(page, user) {
  const content = document.getElementById('page-content');

  // Role guards
  if (page === 'duty-manager'   && user.role !== 'base_manager')   { window.location.hash = '#home'; return; }
  if (page === 'branch-command' && user.role !== 'branch_manager') { window.location.hash = '#home'; return; }
  if (page === 'users'          && user.role === 'soldier')         { window.location.hash = '#home'; return; }

  document.getElementById('main-nav')?.classList.remove('open');
  document.getElementById('nav-backdrop')?.classList.remove('visible');

  content.innerHTML = `<div class="page-loader"><i class="fa-solid fa-shield-halved fa-spin"></i></div>`;
  await new Promise(r => setTimeout(r, 80));

  content.innerHTML = '';
  content.scrollTop = 0;

  const renderer = ROUTES[page] || ROUTES['home'];
  renderer(content, user);
  updateMenu(page, user);
}

function init() {
  initTheme();
  seedData();

  const user = getCurrentUser();
  if (!user) { showLoginModal(); } else { startApp(user); }

  window.addEventListener('user-logged-in', e => startApp(e.detail));
}

function startApp(user) {
  initMenu(user);
  document.getElementById('logout-btn').addEventListener('click', logout);
  navigate(getPage(), user);
  window.addEventListener('hashchange', () => {
    const u = getCurrentUser();
    if (!u) { showLoginModal(); return; }
    navigate(getPage(), u);
  });
}

init();
