// menu.js — Sidebar navigation and hamburger
import { RANK_CSS, Requests } from '../data.js';
import { avatarHtml, rankBadge, coinDisplay } from '../utils/helpers.js';
import { isManager } from '../auth.js';
import { getTheme, setTheme, THEMES } from '../utils/theme.js';
import { openModal, closeModal } from './modal.js';

export function initMenu(user) {
  renderUserSection(user);

  const hamburger = document.getElementById('hamburger');
  const navClose   = document.getElementById('nav-close');
  const backdrop   = document.getElementById('nav-backdrop');
  const nav        = document.getElementById('main-nav');

  hamburger && hamburger.addEventListener('click', () => openNav());
  navClose  && navClose.addEventListener('click',  () => closeNav());
  backdrop  && backdrop.addEventListener('click',  () => closeNav());

  // Settings button
  document.getElementById('settings-btn')?.addEventListener('click', openSettingsModal);

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

function openSettingsModal() {
  const current = getTheme();

  const body = `
    <div style="display:flex;flex-direction:column;gap:20px">
      <div>
        <div class="form-label" style="margin-bottom:10px">Appearance</div>
        <div class="theme-grid">
          ${Object.values(THEMES).map(t => `
            <div class="theme-card ${current === t.id ? 'selected' : ''}" data-theme-pick="${t.id}" role="button" tabindex="0">
              <div class="check-mark"><i class="fa-solid fa-check"></i></div>
              <div class="theme-swatches">
                ${t.swatches.map(c => `<div class="theme-swatch" style="background:${c}"></div>`).join('')}
              </div>
              <div class="theme-card-name">
                <i class="fa-solid ${t.icon}" style="margin-right:5px"></i>${t.name}
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div style="padding-top:12px;border-top:1px solid var(--border)">
        <div class="form-label" style="margin-bottom:6px">About Sentinel</div>
        <p style="font-size:.82rem;color:var(--text-dim);line-height:1.6">
          Guard duty management system for army bases.<br>
          All data stored locally in your browser.
        </p>
      </div>
    </div>`;

  openModal('Settings', body, [
    { label: 'Close', cls: 'btn-ghost', action: 'close', onClick: closeModal },
  ], { id: 'settings-modal' });

  // Live theme switching
  document.querySelectorAll('[data-theme-pick]').forEach(card => {
    card.addEventListener('click', () => {
      const pick = card.dataset.themePick;
      setTheme(pick);
      // Update selection UI without closing modal
      document.querySelectorAll('[data-theme-pick]').forEach(c => {
        c.classList.toggle('selected', c.dataset.themePick === pick);
      });
    });
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') card.click(); });
  });
}
