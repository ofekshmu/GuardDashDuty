// calendar.js — Calendar page (Month / Week / Day views)
import { DutySlots, DutyTypes, Users, CoinHistory, getId, addActivity } from '../data.js';
import { formatDate, getDutyType, getUser, getInitials, avatarHtml, rankBadge, coinDisplay, statusBadge, todayStr, weekStart, addDays, monthName, timeToMinutes } from '../utils/helpers.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { isManager } from '../auth.js';

// Module-level state
const state = {
  view: 'month',
  date: todayStr(),
  filters: { types: [], statuses: [] },
};

export function renderCalendar(container, user) {
  state.view = 'month';
  state.date = todayStr();
  state.filters = { types: [], statuses: [] };
  draw(container, user);
}

function draw(container, user) {
  const types    = DutyTypes.get().filter(t => t.active);
  const statuses = ['vacant', 'assigned', 'completed'];

  container.innerHTML = `
    <div class="page-fade calendar-container" id="cal-root">
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fa-solid fa-calendar-days"></i> Duty Calendar</div>
          <div class="page-subtitle">View and manage all guard duty assignments</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="calendar-toolbar">
        <div class="cal-nav">
          <button class="btn btn-icon" id="cal-prev" title="Previous"><i class="fa-solid fa-chevron-left"></i></button>
          <span class="cal-title" id="cal-title"></span>
          <button class="btn btn-icon" id="cal-next" title="Next"><i class="fa-solid fa-chevron-right"></i></button>
          <button class="btn btn-secondary btn-sm" id="cal-today">Today</button>
        </div>
        <div class="view-toggles">
          <button class="view-toggle-btn ${state.view==='month'?'active':''}" data-view="month">Month</button>
          <button class="view-toggle-btn ${state.view==='week'?'active':''}"  data-view="week">Week</button>
          <button class="view-toggle-btn ${state.view==='day'?'active':''}"   data-view="day">Day</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <span class="filter-label">Type:</span>
        ${types.map(t => `<span class="filter-chip ${state.filters.types.includes(t.id)?'active':''}" data-filter-type="${t.id}">
          <span class="dot" style="background:${t.color}"></span>${t.name}</span>`).join('')}
        <span class="filter-label" style="margin-left:8px">Status:</span>
        ${statuses.map(s => `<span class="filter-chip ${state.filters.statuses.includes(s)?'active':''}" data-filter-status="${s}">${s}</span>`).join('')}
      </div>

      <!-- Calendar body -->
      <div id="cal-body"></div>
    </div>`;

  // Wire toolbar
  container.querySelector('#cal-prev').addEventListener('click', () => { shiftPeriod(-1); redraw(container, user); });
  container.querySelector('#cal-next').addEventListener('click', () => { shiftPeriod( 1); redraw(container, user); });
  container.querySelector('#cal-today').addEventListener('click', () => { state.date = todayStr(); redraw(container, user); });

  container.querySelectorAll('.view-toggle-btn').forEach(b => {
    b.addEventListener('click', () => { state.view = b.dataset.view; redraw(container, user); });
  });

  container.querySelectorAll('[data-filter-type]').forEach(c => {
    c.addEventListener('click', () => {
      const id = c.dataset.filterType;
      toggleFilter(state.filters.types, id);
      c.classList.toggle('active');
      redraw(container, user);
    });
  });
  container.querySelectorAll('[data-filter-status]').forEach(c => {
    c.addEventListener('click', () => {
      const s = c.dataset.filterStatus;
      toggleFilter(state.filters.statuses, s);
      c.classList.toggle('active');
      redraw(container, user);
    });
  });

  drawBody(container, user);
}

function redraw(container, user) {
  // Update toggles
  container.querySelectorAll('.view-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
  drawBody(container, user);
}

function drawBody(container, user) {
  const body = container.querySelector('#cal-body');
  const title = container.querySelector('#cal-title');

  const slots = getFilteredSlots();

  if (state.view === 'month') {
    title.textContent = monthName(...getMonthYear());
    body.innerHTML = renderMonth(slots, user);
  } else if (state.view === 'week') {
    const ws = weekStart(state.date);
    const we = addDays(ws, 6);
    title.textContent = `${formatDate(ws)} – ${formatDate(we)}`;
    body.innerHTML = renderWeek(ws, slots, user);
  } else {
    title.textContent = formatDate(state.date);
    body.innerHTML = renderDay(state.date, slots, user);
  }

  // Attach click handlers
  body.querySelectorAll('[data-slot-id]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      openSlotDetail(el.dataset.slotId, user, container);
    });
  });
  body.querySelectorAll('.cal-day-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      state.date = cell.dataset.date;
      state.view = 'day';
      redraw(container, user);
    });
  });
}

// ── Month View ───────────────────────────────────────────────
function renderMonth(slots, user) {
  const [year, month] = getMonthYear();
  const today = todayStr();
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  // Start grid on Monday
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0

  const days = [];
  // Leading days from previous month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(firstDay);
    d.setDate(d.getDate() - i - 1);
    days.push({ date: d.toISOString().slice(0,10), otherMonth: true });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, otherMonth: false });
  }
  // Trailing days
  while (days.length % 7 !== 0) {
    const last = new Date(days[days.length-1].date + 'T00:00:00');
    last.setDate(last.getDate() + 1);
    days.push({ date: last.toISOString().slice(0,10), otherMonth: true });
  }

  const HEADS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return `
    <div class="cal-month-grid">
      <div class="cal-month-header">
        ${HEADS.map(h => `<div class="cal-month-header-cell">${h}</div>`).join('')}
      </div>
      <div class="cal-month-body">
        ${days.map(({ date, otherMonth }) => {
          const daySlots = slots.filter(s => s.date === date);
          const show     = daySlots.slice(0, 4);
          const extra    = daySlots.length - show.length;
          const isToday  = date === today;
          return `<div class="cal-day-cell ${otherMonth?'other-month':''} ${isToday?'today':''}" data-date="${date}">
            <div class="cal-day-num">${parseInt(date.slice(8))}</div>
            <div class="cal-day-chips">
              ${show.map(s => slotChip(s)).join('')}
              ${extra > 0 ? `<span class="cal-more">+${extra}</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Week View ────────────────────────────────────────────────
function renderWeek(ws, slots, user) {
  const today = todayStr();
  const days  = Array.from({length:7}, (_, i) => addDays(ws, i));
  const DNAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const hours = Array.from({length:24}, (_, i) => String(i).padStart(2,'0') + ':00');

  return `
    <div class="cal-week-wrap">
      <div class="cal-week-header">
        <div style="background:var(--surface2)"></div>
        ${days.map((d, i) => {
          const isToday = d === today;
          const dayNum  = parseInt(d.slice(8));
          return `<div class="cal-week-col-header ${isToday?'today':''}" data-date="${d}">
            <div class="wday">${DNAMES[i]}</div>
            <div class="wdate">${isToday ? `<span style="background:var(--primary);color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center">${dayNum}</span>` : dayNum}</div>
          </div>`;
        }).join('')}
      </div>
      <div class="cal-week-grid" style="grid-template-columns:52px repeat(7,1fr)">
        <!-- Time labels column -->
        <div class="cal-time-label-col">
          ${hours.map(h => `<div class="cal-time-label">${h}</div>`).join('')}
        </div>
        <!-- Day columns -->
        ${days.map(d => {
          const daySlots = slots.filter(s => s.date === d);
          return `<div class="cal-day-col">
            ${hours.map(() => `<div class="hour-line"></div>`).join('')}
            ${daySlots.map(s => {
              const dt  = getDutyType(s.typeId);
              if (!dt) return '';
              const su  = s.assignedUserId ? getUser(s.assignedUserId) : null;
              const top    = timeToMinutes(s.startTime);
              const endMin = s.endTime === '00:00' ? 24*60 : timeToMinutes(s.endTime);
              const height = Math.max(endMin - top, 30);
              const topPx    = (top    / 60) * 56;
              const heightPx = (height / 60) * 56;
              return `<div class="duty-block" data-slot-id="${s.id}"
                style="top:${topPx}px;height:${heightPx}px;background:${dt.color};opacity:${s.status==='completed'?'.55':'1'}">
                <span class="duty-block-name">${dt.name}</span>
                <span class="duty-block-user">${su ? su.name : 'Vacant'}</span>
              </div>`;
            }).join('')}
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Day View ─────────────────────────────────────────────────
function renderDay(dateStr, slots, user) {
  const daySlots = slots.filter(s => s.date === dateStr)
    .sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (!daySlots.length) return `
    <div class="card">
      <div class="empty-state">
        <i class="fa-solid fa-calendar-xmark"></i>
        <h3>No duties on ${formatDate(dateStr)}</h3>
        ${isManager() ? `<p>Use <a href="#duty-manager" style="color:var(--primary)">Duty Manager</a> to add slots.</p>` : ''}
      </div>
    </div>`;

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fa-solid fa-calendar-day"></i> ${formatDate(dateStr)}</span>
        <span class="text-dim" style="font-size:.82rem">${daySlots.length} dut${daySlots.length===1?'y':'ies'}</span>
      </div>
      <div class="cal-day-view">
        ${daySlots.map(s => {
          const dt  = getDutyType(s.typeId);
          const su  = s.assignedUserId ? getUser(s.assignedUserId) : null;
          if (!dt) return '';
          return `<div class="cal-day-slot-card" data-slot-id="${s.id}">
            <div class="cal-day-time">${s.startTime} – ${s.endTime}</div>
            <div class="cal-day-type-bar" style="background:${dt.color}"></div>
            <div class="cal-day-info">
              <div class="cal-day-duty-name">${dt.name}</div>
              <div class="cal-day-duty-meta">
                ${su ? `${avatarHtml(su,'avatar-xs')} ${su.name}` : '<span style="color:var(--text-dim)">Vacant</span>'}
                · ${coinDisplay(dt.coinValue)}
              </div>
            </div>
            ${statusBadge(s.status)}
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ── Slot Detail Modal ────────────────────────────────────────
function openSlotDetail(slotId, user, container) {
  const slot = DutySlots.get().find(s => s.id === slotId);
  if (!slot) return;
  const dt  = getDutyType(slot.typeId);
  const su  = slot.assignedUserId ? getUser(slot.assignedUserId) : null;

  const isUserManager = user.role === 'manager';

  const buttons = [];
  if (isUserManager) {
    buttons.push({ label: '<i class="fa-solid fa-pencil"></i> Edit',   cls: 'btn-secondary', action: 'edit',   onClick: () => openEditSlotModal(slot, container, user) });
    if (slot.status === 'assigned') {
      buttons.push({ label: '<i class="fa-solid fa-check"></i> Mark Completed', cls: 'btn-primary', action: 'complete', onClick: () => markCompleted(slot, container, user) });
    }
    buttons.push({ label: '<i class="fa-solid fa-trash"></i> Delete',  cls: 'btn-danger',    action: 'delete', onClick: () => deleteSlot(slot, container, user) });
  } else if (slot.assignedUserId === user.id && slot.status === 'assigned') {
    buttons.push({ label: '<i class="fa-solid fa-arrow-right-arrow-left"></i> Request Change', cls: 'btn-secondary', action: 'req', onClick: () => { closeModal(); window.location.hash = '#requests'; } });
  }
  buttons.push({ label: 'Close', cls: 'btn-ghost', action: 'close', onClick: closeModal });

  openModal('Duty Slot Details', `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="flex items-center gap-sm flex-wrap">
        <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${dt?.color||'#ccc'}"></span>
        <strong style="font-size:1.05rem">${dt?.name || 'Unknown'}</strong>
        ${statusBadge(slot.status)}
      </div>
      <div class="form-row-2 form-row">
        <div><div class="form-label">Date</div><strong>${formatDate(slot.date)}</strong></div>
        <div><div class="form-label">Time</div><strong>${slot.startTime} – ${slot.endTime}</strong></div>
        <div><div class="form-label">Coin Value</div>${coinDisplay(dt?.coinValue || 0)}</div>
        <div><div class="form-label">Required Rank</div><strong>${dt ? ['Private','Corporal','Sergeant','Staff Sergeant','Lieutenant','Captain','Colonel'][dt.requiredRankLevel] : '—'}</strong></div>
      </div>
      <div>
        <div class="form-label">Assigned To</div>
        ${su ? `<div class="flex items-center gap-sm mt-1">${avatarHtml(su)} <div><div>${su.name}</div><div>${rankBadge(su)}</div></div></div>` : '<em style="color:var(--text-dim)">Vacant — awaiting assignment</em>'}
      </div>
      ${slot.notes ? `<div><div class="form-label">Notes</div><p style="color:var(--text-muted)">${slot.notes}</p></div>` : ''}
    </div>`, buttons, { size: 'lg' });
}

function markCompleted(slot, container, user) {
  closeModal();
  const slots = DutySlots.get();
  const idx   = slots.findIndex(s => s.id === slot.id);
  if (idx === -1) return;

  slots[idx].status = 'completed';
  DutySlots.set(slots);

  // Award coins
  const dt = getDutyType(slot.typeId);
  if (dt && slot.assignedUserId) {
    const users = Users.get();
    const ui    = users.findIndex(u => u.id === slot.assignedUserId);
    if (ui !== -1) {
      users[ui].coins += dt.coinValue;
      Users.set(users);
    }
    const ch = CoinHistory.get();
    ch.push({ id: getId(), userId: slot.assignedUserId, amount: dt.coinValue, reason: `${dt.name} completed`, dutySlotId: slot.id, date: new Date().toISOString() });
    CoinHistory.set(ch);
  }

  addActivity(`Duty marked completed: ${dt?.name || 'Unknown'}`, 'fa-check-circle', 'success');
  showToast('Duty marked as completed. Coins awarded!', 'success');
  draw(container, user);
}

function deleteSlot(slot, container, user) {
  closeModal();
  confirmDialog('Delete this duty slot? This cannot be undone.', () => {
    const slots = DutySlots.get().filter(s => s.id !== slot.id);
    DutySlots.set(slots);
    showToast('Duty slot deleted.', 'success');
    draw(container, user);
  }, 'Delete Slot');
}

function openEditSlotModal(slot, container, user) {
  closeModal();
  window.location.hash = '#duty-manager';
}

// ── Helpers ──────────────────────────────────────────────────
function getMonthYear() {
  const d = new Date(state.date + 'T00:00:00');
  return [d.getFullYear(), d.getMonth()];
}

function shiftPeriod(dir) {
  const d = new Date(state.date + 'T00:00:00');
  if (state.view === 'month') {
    d.setMonth(d.getMonth() + dir);
    d.setDate(1);
  } else if (state.view === 'week') {
    d.setDate(d.getDate() + dir * 7);
  } else {
    d.setDate(d.getDate() + dir);
  }
  state.date = d.toISOString().slice(0,10);
}

function getFilteredSlots() {
  let slots = DutySlots.get();
  if (state.filters.types.length)    slots = slots.filter(s => state.filters.types.includes(s.typeId));
  if (state.filters.statuses.length) slots = slots.filter(s => state.filters.statuses.includes(s.status));
  return slots;
}

function toggleFilter(arr, val) {
  const i = arr.indexOf(val);
  if (i === -1) arr.push(val);
  else arr.splice(i, 1);
}

function slotChip(slot) {
  const dt  = getDutyType(slot.typeId);
  if (!dt) return '';
  const su  = slot.assignedUserId ? getUser(slot.assignedUserId) : null;
  const lbl = su ? getInitials(su.name) : 'VAC';
  const cls = su ? '' : 'vacant';
  return `<div class="duty-chip ${cls}" style="${su?'background:'+dt.color:''}" data-slot-id="${slot.id}" title="${dt.name} — ${su?su.name:'Vacant'}">${lbl}</div>`;
}
