// home.js — Home / Dashboard page
import { DutySlots, DutyTypes, Requests, TradeOffers, CoinHistory, ActivityFeed } from '../data.js';
import { formatDate, formatRelative, getDutyType, getUser, avatarHtml, rankBadge, coinDisplay, statusBadge, todayStr } from '../utils/helpers.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderHome(container, user) {
  const today = todayStr();
  const slots  = DutySlots.get();
  const types  = DutyTypes.get();
  const feed   = ActivityFeed.get().slice(0, 6);
  const coinH  = CoinHistory.get().filter(c => c.userId === user.id);

  // Stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0,10);

  const mySlots    = slots.filter(s => s.assignedUserId === user.id);
  const thisMonth  = mySlots.filter(s => s.date >= monthStart && s.date <= monthEnd);
  const completed  = mySlots.filter(s => s.status === 'completed');
  const pending    = Requests.get().filter(r => r.status === 'pending' && (user.role === 'manager' || r.userId === user.id));
  const openTrades = TradeOffers.get().filter(t => t.status === 'open' && t.offerUserId !== user.id);

  const coinsThisMonth = CoinHistory.get()
    .filter(c => c.userId === user.id && c.date.slice(0,10) >= monthStart)
    .reduce((sum, c) => sum + c.amount, 0);

  // Upcoming duties
  const upcoming = mySlots
    .filter(s => s.date >= today && s.status === 'assigned')
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 4);

  container.innerHTML = `
    <div class="page-fade">
      <!-- Hero -->
      <div class="hero-banner">
        <div>
          ${avatarHtml(user, 'avatar-lg')}
        </div>
        <div class="hero-text">
          <h1>Welcome back, <span>${user.name.split(' ').pop()}</span></h1>
          <p>${rankBadge(user)} &nbsp;${user.role === 'manager' ? '&nbsp;<span class="badge badge-manager">Commander</span>' : ''} &nbsp;Last login: ${formatRelative(user.lastLogin)}</p>
        </div>
        <div class="hero-actions">
          <a href="#calendar" class="btn btn-primary"><i class="fa-solid fa-calendar-days"></i> Calendar</a>
          <a href="#market"   class="btn btn-secondary"><i class="fa-solid fa-store"></i> Market</a>
          <a href="#requests" class="btn btn-secondary"><i class="fa-solid fa-inbox"></i> Requests</a>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon"><i class="fa-solid fa-shield-halved"></i></div>
          <div class="stat-body">
            <div class="stat-value">${thisMonth.length}</div>
            <div class="stat-label">Duties this month</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fa-solid fa-coins"></i></div>
          <div class="stat-body">
            <div class="stat-value">${user.coins}</div>
            <div class="stat-label">Total coins</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon info"><i class="fa-solid fa-inbox"></i></div>
          <div class="stat-body">
            <div class="stat-value">${pending.length}</div>
            <div class="stat-label">${user.role === 'manager' ? 'Pending approvals' : 'My requests'}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><i class="fa-solid fa-store"></i></div>
          <div class="stat-body">
            <div class="stat-value">${openTrades.length}</div>
            <div class="stat-label">Open market offers</div>
          </div>
        </div>
      </div>

      <!-- Grid: Upcoming + Activity -->
      <div class="grid-2">
        <!-- Upcoming Duties -->
        <div class="card section">
          <div class="card-header">
            <span class="card-title"><i class="fa-solid fa-clock"></i> Upcoming Duties</span>
            <a href="#calendar" class="btn btn-text btn-sm">View all</a>
          </div>
          ${upcoming.length ? `
            <div class="duty-list">
              ${upcoming.map(s => {
                const dt = getDutyType(s.typeId);
                if (!dt) return '';
                return `<div class="duty-list-item" data-slot="${s.id}">
                  <div class="duty-type-dot" style="background:${dt.color}"></div>
                  <div class="duty-list-info">
                    <div class="duty-list-name">${dt.name}</div>
                    <div class="duty-list-meta">${formatDate(s.date)} &nbsp;·&nbsp; ${s.startTime}–${s.endTime}</div>
                  </div>
                  <div class="duty-list-coin">${coinDisplay(dt.coinValue)}</div>
                </div>`;
              }).join('')}
            </div>` : `
            <div class="empty-state">
              <i class="fa-solid fa-calendar-check"></i>
              <h3>No upcoming duties</h3>
              <p>You have no assigned duties coming up.</p>
            </div>`}
        </div>

        <!-- Activity Feed -->
        <div class="card section">
          <div class="card-header">
            <span class="card-title"><i class="fa-solid fa-bolt"></i> Recent Activity</span>
          </div>
          ${feed.length ? `
            <div class="activity-feed">
              ${feed.map(a => `
                <div class="activity-item">
                  <div class="activity-icon ${a.type}"><i class="fa-solid ${a.icon}"></i></div>
                  <div class="activity-text">${a.text}</div>
                  <div class="activity-time">${formatRelative(a.ts)}</div>
                </div>`).join('')}
            </div>` : `
            <div class="empty-state">
              <i class="fa-solid fa-list"></i>
              <h3>No activity yet</h3>
            </div>`}
        </div>
      </div>

      ${completed.length ? `
      <!-- Coin History -->
      <div class="card section">
        <div class="card-header">
          <span class="card-title"><i class="fa-solid fa-coins" style="color:var(--warning)"></i> Coin Earnings</span>
          <span class="coin-display large">${coinDisplay(user.coins)}</span>
        </div>
        <div class="card-body" style="padding:0">
          <table class="table">
            <thead><tr>
              <th>Duty</th><th>Date</th><th>Coins Earned</th>
            </tr></thead>
            <tbody>
              ${CoinHistory.get().filter(c => c.userId === user.id).slice(0,5).map(c => `
                <tr>
                  <td>${c.reason}</td>
                  <td>${formatDate(c.date)}</td>
                  <td>${coinDisplay(c.amount)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}
    </div>`;

  // Slot click → detail modal
  container.querySelectorAll('[data-slot]').forEach(el => {
    el.addEventListener('click', () => openSlotModal(el.dataset.slot));
  });
}

function openSlotModal(slotId) {
  const slots = DutySlots.get();
  const slot  = slots.find(s => s.id === slotId);
  if (!slot) return;

  const dt   = getDutyType(slot.typeId);
  const user = slot.assignedUserId ? getUser(slot.assignedUserId) : null;

  openModal('Duty Details', `
    <div style="display:flex;flex-direction:column;gap:12px">
      <div class="flex items-center gap-sm">
        <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${dt?.color||'#ccc'}"></span>
        <strong>${dt?.name || '—'}</strong>
        ${statusBadge(slot.status)}
      </div>
      <div class="form-row-2 form-row">
        <div><div class="form-label">Date</div><div>${formatDate(slot.date)}</div></div>
        <div><div class="form-label">Time</div><div>${slot.startTime} – ${slot.endTime}</div></div>
        <div><div class="form-label">Coin Value</div><div>${coinDisplay(dt?.coinValue || 0)}</div></div>
        <div><div class="form-label">Assigned To</div><div>${user ? user.name : '<em>Vacant</em>'}</div></div>
      </div>
      ${slot.notes ? `<div><div class="form-label">Notes</div><div style="color:var(--text-muted)">${slot.notes}</div></div>` : ''}
    </div>`, [
    { label: 'Close', cls: 'btn-ghost', action: 'close', onClick: closeModal }
  ]);
}
