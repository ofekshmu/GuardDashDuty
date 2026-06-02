// helpers.js — Shared formatting and rendering utilities
import { RANKS, RANK_COLORS, RANK_CSS, DutyTypes, Users } from '../data.js';

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatRelative(isoStr) {
  if (!isoStr) return 'Never';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function getInitials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getDutyType(id) {
  return DutyTypes.get().find(t => t.id === id) || null;
}

export function getUser(id) {
  return Users.get().find(u => u.id === id) || null;
}

export function avatarHtml(user, size = '') {
  if (!user) return `<div class="user-avatar ${size}">?</div>`;
  const cls = RANK_CSS[user.rankLevel] || 'rank-private';
  return `<div class="user-avatar ${cls} ${size}" title="${user.name}">${getInitials(user.name)}</div>`;
}

export function rankBadge(user) {
  if (!user) return '';
  const cls = RANK_CSS[user.rankLevel] || 'rank-private';
  return `<span class="badge badge-rank ${cls}">${user.rank}</span>`;
}

export function roleBadge(user) {
  if (!user) return '';
  return user.role === 'manager'
    ? `<span class="badge badge-manager">Manager</span>`
    : `<span class="badge badge-user">Soldier</span>`;
}

export function statusBadge(status) {
  const map = {
    vacant:          ['badge-vacant',   'Vacant'],
    assigned:        ['badge-assigned', 'Assigned'],
    completed:       ['badge-completed','Completed'],
    pending_approval:['badge-pending',  'Pending'],
    pending:         ['badge-pending',  'Pending'],
    approved:        ['badge-approved', 'Approved'],
    rejected:        ['badge-rejected', 'Rejected'],
    open:            ['badge-open',     'Open'],
    completed_trade: ['badge-completed','Completed'],
  };
  const [cls, label] = map[status] || ['badge-vacant', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

export function dutyChip(slot, user) {
  const dt = getDutyType(slot.typeId);
  if (!dt) return '';
  const label = user ? getInitials(user.name) : 'VAC';
  const cls   = user ? '' : 'vacant';
  return `<div class="duty-chip ${cls}" style="background:${dt.color}" title="${dt.name} — ${user ? user.name : 'Vacant'}" data-slot-id="${slot.id}">${label}</div>`;
}

export function coinDisplay(amount) {
  return `<span class="coin-display"><i class="fa-solid fa-coins coin-icon"></i>${amount}</span>`;
}

export function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(m) {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
}

export function slotDateTimeMs(slot) {
  const dateStr = slot.date;
  const t = slot.startTime === '00:00' && slot.endTime === '00:00' ? '00:00' : slot.startTime;
  return new Date(`${dateStr}T${t}:00`).getTime();
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day); // Monday as start
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function monthName(year, month) {
  return new Date(year, month, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}
