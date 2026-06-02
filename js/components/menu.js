// menu.js — Sidebar navigation and hamburger
import { RANK_CSS, Requests } from '../data.js';
import { avatarHtml, rankBadge, coinDisplay } from '../utils/helpers.js';
import { isManager } from '../auth.js';

export function initMenu(user) {
  renderUserSection(user);

  const hamburger = document.getElementById('hamburger');
  const navClose   = document.getElementById('nav-close');
  const backdrop   = document.getElementById('nav-backdrop');
  const nav        = document.getElementById('main-nav');

  hamburger && hamburger.addEventListener('click', () => openNav());
  navClose  && navClose.addEventListener('click',  () => closeNav());
  backdrop  && backdrop.addEventListener('click',  () => closeNav());

  // Manager-only nav item
  const managerLi = document.getElementById('nav-li-duty-manager');
  if (managerLi) managerLi.style.display = user.role === 'manager' ? '' : 'none';

  // Mobile coin display
  updateMobileCoins(user);

  // Pending requests badge
  refreshRequestsBadge(user);
}

export function updateMenu(activePage, user) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === activePage);
  });
  refreshRequestsBadge(user);
}

function renderUserSection(user) {
  const el = document.getElementById('nav-user-section');
  if (!el) return;
  el.innerHTML = `
    <div class="nav-user-inner">
      ${avatarHtml(user, 'avatar-sm')}
      <div class="nav-user-info">
        <div class="nav-user-name">${user.name}</div>
        <div class="nav-user-meta">
          ${rankBadge(user)}
          <span class="nav-coins"><i class="fa-solid fa-coins"></i>${user.coins}</span>
        </div>
      </div>
    </div>`;
}

function updateMobileCoins(user) {
  const el = document.getElementById('mobile-coins');
  if (el) el.innerHTML = `<i class="fa-solid fa-coins" style="color:var(--warning)"></i> ${user.coins}`;
}

function refreshRequestsBadge(user) {
  const badge = document.getElementById('requests-badge');
  if (!badge) return;
  if (user.role === 'manager') {
    const pending = Requests.get().filter(r => r.status === 'pending').length;
    if (pending > 0) { badge.textContent = pending; badge.style.display = ''; }
    else badge.style.display = 'none';
  } else {
    badge.style.display = 'none';
  }
}

function openNav() {
  document.getElementById('main-nav').classList.add('open');
  document.getElementById('nav-backdrop').classList.add('visible');
}

function closeNav() {
  document.getElementById('main-nav').classList.remove('open');
  document.getElementById('nav-backdrop').classList.remove('visible');
}
