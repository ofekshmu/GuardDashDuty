// branch-command.js — Branch Manager command center
import { DutySlots, DutyTypes, Users, Restrictions, CoinHistory, Branches, getId, addActivity, logAudit, RANKS } from '../data.js';
import { formatDate, getDutyType, getUser, coinDisplay, statusBadge, rankBadge, avatarHtml, todayStr, addDays } from '../utils/helpers.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { runAutoMatch } from '../utils/matching.js';

let _activeTab    = 'slots';
let _matchResults = [];

export function renderBranchCommand(container, user) {
  if (user.role !== 'branch_manager') { window.location.hash = '#home'; return; }
  _matchResults = [];
  drawPage(container, user);
}

function drawPage(container, user) {
  const branch   = Branches.get().find(b => b.id === user.branchId);
  const mySlots  = DutySlots.get().filter(s => s.branchManagerId === user.id);
  const pending  = mySlots.filter(s => s.status === 'pending_branch').length;

  container.innerHTML = `
    <div class="page-fade">
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fa-solid fa-sitemap"></i> Branch Command</div>
          <div class="page-subtitle">${branch?.name || 'My Branch'} — manage delegated duty slots and personnel</div>
        </div>
      </div>
      <div class="tabs" id="bc-tabs">
        <button class="tab-btn ${_activeTab==='slots'?'active':''}" data-tab="slots">
          <i class="fa-solid fa-calendar-days"></i> My Slots
          ${pending ? `<span class="nav-badge" style="display:inline-flex;margin-left:6px">${pending}</span>` : ''}
        </button>
        <button class="tab-btn ${_activeTab==='match'?'active':''}" data-tab="match">
          <i class="fa-solid fa-robot"></i> Auto Match
        </button>
        <button class="tab-btn ${_activeTab==='personnel'?'active':''}" data-tab="personnel">
          <i class="fa-solid fa-users"></i> My Personnel
        </button>
      </div>
      <div id="bc-content"></div>
    </div>`;

  container.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => {
      _activeTab = b.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(x => x.classList.toggle('active', x.dataset.tab === _activeTab));
      drawTab(container.querySelector('#bc-content'), user);
    });
  });

  drawTab(container.querySelector('#bc-content'), user);
}

function drawTab(el, user) {
  if      (_activeTab === 'slots')     drawMySlots(el, user);
  else if (_activeTab === 'match')     drawMatch(el, user);
  else if (_activeTab === 'personnel') drawPersonnel(el, user);
}

// ── Tab: My Delegated Slots ──────────────────────────────────
function drawMySlots(el, user) {
  const allSlots  = DutySlots.get();
  const mySlots   = allSlots.filter(s => s.branchManagerId === user.id)
                             .sort((a,b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const types     = DutyTypes.get();
  const soldiers  = Users.get().filter(u => u.branchId === user.branchId && u.role === 'soldier');

  el.innerHTML = `
    <div class="section-header">
      <div class="section-title"><i class="fa-solid fa-calendar-days"></i> Delegated Slots (${mySlots.length})</div>
    </div>
    <div class="filter-bar" style="margin-bottom:12px">
      <span class="filter-label">Status:</span>
      <span class="filter-chip" data-bc-status="pending_branch">Awaiting Assignment</span>
      <span class="filter-chip" data-bc-status="assigned">Assigned</span>
      <span class="filter-chip" data-bc-status="completed">Completed</span>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>Date</th><th>Time</th><th>Type</th><th>Assigned Soldier</th><th>Status</th><th class="col-actions">Actions</th>
        </tr></thead>
        <tbody id="bc-tbody">${renderBCRows(mySlots, types, soldiers)}</tbody>
      </table>
    </div>`;

  let statusFilter = [];
  el.querySelectorAll('[data-bc-status]').forEach(c => c.addEventListener('click', () => {
    const s = c.dataset.bcStatus;
    const i = statusFilter.indexOf(s); i === -1 ? statusFilter.push(s) : statusFilter.splice(i, 1);
    c.classList.toggle('active');
    const filtered = statusFilter.length ? mySlots.filter(x => statusFilter.includes(x.status)) : mySlots;
    el.querySelector('#bc-tbody').innerHTML = renderBCRows(filtered, types, soldiers);
    bindBCActions(el, user, soldiers, allSlots);
  }));

  bindBCActions(el, user, soldiers, allSlots);
}

function renderBCRows(slots, types, soldiers) {
  if (!slots.length) return `<tr><td colspan="6"><div class="empty-state" style="padding:24px"><i class="fa-solid fa-calendar"></i><h3>No slots delegated to you yet</h3></div></td></tr>`;
  return slots.map(s => {
    const dt  = types.find(t => t.id === s.typeId);
    const sol = s.assignedUserId ? (soldiers.find(u => u.id === s.assignedUserId) || getUser(s.assignedUserId)) : null;
    const canComplete = s.status === 'assigned' && s.date <= todayStr();
    return `<tr>
      <td>${formatDate(s.date)}</td>
      <td style="white-space:nowrap">${s.startTime} – ${s.endTime}</td>
      <td>${dt ? `<span style="display:flex;align-items:center;gap:6px"><span class="type-dot" style="background:${dt.color}"></span>${dt.name}</span>` : '—'}</td>
      <td>${sol ? `<span style="display:flex;align-items:center;gap:6px">${avatarHtml(sol,'avatar-xs')}${sol.name}</span>` : '<span class="text-dim">Unassigned</span>'}</td>
      <td>${statusBadge(s.status)}</td>
      <td class="col-actions">
        ${s.status === 'pending_branch' ? `<button class="btn btn-primary btn-sm" data-bc-assign="${s.id}"><i class="fa-solid fa-user-plus"></i> Assign</button>` : ''}
        ${s.status === 'assigned' ? `<button class="btn btn-secondary btn-sm" data-bc-reassign="${s.id}" title="Reassign"><i class="fa-solid fa-arrows-rotate"></i></button>` : ''}
        ${canComplete ? `<button class="btn btn-primary btn-sm" data-bc-complete="${s.id}" title="Mark Completed"><i class="fa-solid fa-check"></i></button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function bindBCActions(el, user, soldiers, allSlots) {
  el.querySelectorAll('[data-bc-assign]').forEach(b   => b.addEventListener('click', () => openAssignModal(b.dataset.bcAssign,   el, user, soldiers, false)));
  el.querySelectorAll('[data-bc-reassign]').forEach(b => b.addEventListener('click', () => openAssignModal(b.dataset.bcReassign, el, user, soldiers, true)));
  el.querySelectorAll('[data-bc-complete]').forEach(b => b.addEventListener('click', () => completeSlot(b.dataset.bcComplete, el, user)));
}

function openAssignModal(slotId, el, user, soldiers, isReassign) {
  const slot    = DutySlots.get().find(s => s.id === slotId);
  if (!slot) return;
  const dt      = DutyTypes.get().find(t => t.id === slot.typeId);
  const eligible = soldiers.filter(u => u.status === 'active' && u.rankLevel >= (dt?.requiredRankLevel || 0) && !u.capabilities?.includes(slot.typeId));

  openModal(isReassign ? 'Reassign Duty Slot' : 'Assign Soldier to Slot', `
    <div style="margin-bottom:16px">
      <div class="form-label">Slot</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dt?.color||'#ccc'}"></span>
        <strong>${dt?.name||'?'}</strong> on ${formatDate(slot.date)} ${slot.startTime}–${slot.endTime}
        &nbsp;(${coinDisplay(dt?.coinValue||0)})
      </div>
    </div>
    <div class="form-group">
      <label class="form-label required">Select Soldier</label>
      <select class="form-select" id="bc-soldier-sel">
        <option value="">— Select soldier —</option>
        ${eligible.map(u => `<option value="${u.id}" ${slot.assignedUserId===u.id?'selected':''}>${u.name} (${u.rank}) · ${u.coins} coins</option>`).join('')}
      </select>
      ${!eligible.length ? '<p style="color:var(--warning);font-size:.82rem;margin-top:6px"><i class="fa-solid fa-triangle-exclamation"></i> No eligible soldiers (rank or exemption conflict)</p>' : ''}
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-textarea" id="bc-notes" rows="2">${slot.notes||''}</textarea>
    </div>
    <div id="bc-assign-err" class="form-error"></div>`,
    [
      { label: 'Cancel',                          cls: 'btn-ghost',   action: 'cancel', onClick: closeModal },
      { label: isReassign ? 'Reassign' : 'Assign', cls: 'btn-primary', action: 'save',   onClick: () => saveAssignment(slotId, el, user) },
    ]);
}

function saveAssignment(slotId, el, user) {
  const soldierId = document.getElementById('bc-soldier-sel').value;
  const notes     = document.getElementById('bc-notes').value.trim();
  const err       = document.getElementById('bc-assign-err');
  if (!soldierId) { err.textContent = 'Please select a soldier.'; return; }

  const slots = DutySlots.get();
  const idx   = slots.findIndex(s => s.id === slotId);
  if (idx === -1) { closeModal(); return; }

  slots[idx].assignedUserId     = soldierId;
  slots[idx].status             = 'assigned';
  slots[idx].notes              = notes;
  slots[idx].lastBranchActionAt = new Date().toISOString();
  DutySlots.set(slots);

  const soldier = getUser(soldierId);
  logAudit(user, 'assign_slot', 'duty_slot', slotId, `Assigned to ${soldier?.name}`);
  addActivity(`${user.name} assigned ${soldier?.name} to duty on ${formatDate(slots[idx].date)}`, 'fa-user-check', 'success');
  closeModal();
  showToast(`Assigned to ${soldier?.name}!`, 'success');
  drawMySlots(el, user);
}

function completeSlot(slotId, el, user) {
  const slots = DutySlots.get();
  const idx   = slots.findIndex(s => s.id === slotId);
  if (idx === -1) return;

  const slot    = slots[idx];
  slots[idx].status = 'completed';
  DutySlots.set(slots);

  if (slot.assignedUserId) {
    const dt  = DutyTypes.get().find(t => t.id === slot.typeId);
    const all = Users.get();
    const ui  = all.findIndex(u => u.id === slot.assignedUserId);
    if (ui !== -1 && dt) {
      all[ui].coins += dt.coinValue;
      Users.set(all);
      const ch = CoinHistory.get();
      ch.push({ id: getId(), userId: slot.assignedUserId, amount: dt.coinValue, reason: `${dt.name} completed`, dutySlotId: slotId, date: new Date().toISOString() });
      CoinHistory.set(ch);
      logAudit(user, 'complete_slot', 'duty_slot', slotId, `${all[ui].name} completed ${dt.name} (+${dt.coinValue} coins)`);
      addActivity(`${all[ui].name} completed ${dt.name} (+${dt.coinValue} coins)`, 'fa-check-circle', 'success');
    }
  }
  showToast('Duty completed. Coins awarded!', 'success');
  drawMySlots(el, user);
}

// ── Tab: Auto Match ──────────────────────────────────────────
function drawMatch(el, user) {
  const types   = DutyTypes.get().filter(t => t.active);
  const pending = DutySlots.get().filter(s => s.branchManagerId === user.id && s.status === 'pending_branch').length;

  el.innerHTML = `
    <div class="section-header">
      <div class="section-title"><i class="fa-solid fa-robot"></i> Auto Match — My Branch</div>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><span class="card-title"><i class="fa-solid fa-gear"></i> Configuration</span></div>
      <div class="card-body">
        <p style="color:var(--text-dim);font-size:.875rem;margin-bottom:16px">
          Matches soldiers from your branch only. <strong>${pending}</strong> slot${pending!==1?'s':''} awaiting assignment.
        </p>
        <div class="form-row form-row-2" style="margin-bottom:16px">
          <div class="form-group"><label class="form-label">Date From</label><input class="form-input" id="bc-am-from" type="date" value="${todayStr()}" /></div>
          <div class="form-group"><label class="form-label">Date To</label>  <input class="form-input" id="bc-am-to"   type="date" value="${addDays(todayStr(), 30)}" /></div>
        </div>
        <div class="form-group">
          <label class="form-label">Include Duty Types</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
            ${types.map(t => `
              <label class="toggle-group" style="background:var(--surface2);padding:6px 10px;border-radius:6px;border:1px solid var(--border)">
                <input type="checkbox" class="bc-am-type" value="${t.id}" checked />
                <span class="dot" style="background:${t.color}"></span><span>${t.name}</span>
              </label>`).join('')}
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" id="bc-run-match"><i class="fa-solid fa-robot"></i> Run Auto Match</button>
      </div>
    </div>
    <div id="bc-match-results"></div>`;

  el.querySelector('#bc-run-match').addEventListener('click', () => runBranchMatch(el, user));
  if (_matchResults.length) renderBranchMatchResults(el.querySelector('#bc-match-results'), user);
}

function runBranchMatch(el, user) {
  const from     = document.getElementById('bc-am-from').value;
  const to       = document.getElementById('bc-am-to').value;
  const selTypes = [...document.querySelectorAll('.bc-am-type:checked')].map(c => c.value);

  if (!from || !to)   { showToast('Please select a date range.','warning'); return; }
  if (!selTypes.length) { showToast('Select at least one duty type.','warning'); return; }

  const btn = el.querySelector('#bc-run-match');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running…';

  setTimeout(() => {
    const allSlots = DutySlots.get();
    const vacant   = allSlots.filter(s =>
      s.branchManagerId === user.id && s.status === 'pending_branch' &&
      s.date >= from && s.date <= to && selTypes.includes(s.typeId));
    const soldiers = Users.get().filter(u => u.branchId === user.branchId && u.role === 'soldier' && u.status === 'active');
    _matchResults  = runAutoMatch(vacant, soldiers, DutyTypes.get(), Restrictions.get(), allSlots);
    btn.disabled   = false; btn.innerHTML = '<i class="fa-solid fa-robot"></i> Run Auto Match';
    renderBranchMatchResults(el.querySelector('#bc-match-results'), user);
  }, 600);
}

function renderBranchMatchResults(area, user) {
  if (!_matchResults.length) {
    area.innerHTML = `<div class="card"><div class="empty-state" style="padding:32px"><i class="fa-solid fa-calendar-check"></i><h3>No pending slots in this range</h3></div></div>`;
    return;
  }
  const matched   = _matchResults.filter(r => r.eligible);
  const unmatched = _matchResults.filter(r => !r.eligible);
  const types     = DutyTypes.get();
  const usersAll  = Users.get();

  area.innerHTML = `
    <div class="match-results">
      <div class="match-summary-row">
        <div class="match-stat"><div class="match-stat-val">${_matchResults.length}</div><div class="match-stat-lbl">Total pending</div></div>
        <div class="match-stat"><div class="match-stat-val">${matched.length}</div><div class="match-stat-lbl">Matched</div></div>
        <div class="match-stat conflict"><div class="match-stat-val">${unmatched.length}</div><div class="match-stat-lbl">Unmatched</div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fa-solid fa-list-check"></i> Proposed Assignments</span>
          <div class="flex gap-sm">
            <button class="btn btn-secondary btn-sm" id="bc-sel-all">Select All</button>
            <button class="btn btn-secondary btn-sm" id="bc-sel-none">Deselect</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th><input type="checkbox" id="bc-chk-master" checked /></th>
              <th>Date</th><th>Time</th><th>Duty Type</th><th>Proposed Soldier</th><th>Rank</th><th>Coins</th><th>Status</th><th>Notes</th>
            </tr></thead>
            <tbody>
              ${_matchResults.map((r, i) => {
                const dt = types.find(t => t.id === r.slot.typeId);
                const su = r.userId ? usersAll.find(u => u.id === r.userId) : null;
                return `<tr class="${!r.eligible?'match-row-conflict':''} match-row" style="animation-delay:${i*40}ms">
                  <td><input type="checkbox" class="bc-chk" data-idx="${i}" ${r.eligible?'checked':'disabled'} /></td>
                  <td>${formatDate(r.slot.date)}</td>
                  <td style="white-space:nowrap">${r.slot.startTime} – ${r.slot.endTime}</td>
                  <td>${dt?`<span style="display:flex;align-items:center;gap:6px"><span class="type-dot" style="background:${dt.color}"></span>${dt.name}</span>`:'—'}</td>
                  <td>${su?`<span style="display:flex;align-items:center;gap:6px">${avatarHtml(su,'avatar-xs')}${su.name}</span>`:'<em class="text-dim">No match</em>'}</td>
                  <td>${su?rankBadge(su):'—'}</td>
                  <td>${su?coinDisplay(su.coins):'—'}</td>
                  <td>${r.eligible?'<span class="badge badge-approved">Matched</span>':'<span class="badge badge-rejected">Failed</span>'}</td>
                  <td style="font-size:.78rem;color:${r.eligible?'var(--text-dim)':'var(--danger)'}">${r.conflicts.join(', ')||'—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer">
          ${matched.length ? `
          <button class="btn btn-primary" id="bc-approve-sel"><i class="fa-solid fa-check"></i> Approve Selected</button>
          <button class="btn btn-primary" id="bc-approve-all"><i class="fa-solid fa-check-double"></i> Approve All</button>` : ''}
          <button class="btn btn-ghost" id="bc-clear"><i class="fa-solid fa-xmark"></i> Clear</button>
        </div>
      </div>
    </div>`;

  const master = area.querySelector('#bc-chk-master');
  master?.addEventListener('change', () => area.querySelectorAll('.bc-chk:not(:disabled)').forEach(c => c.checked = master.checked));
  area.querySelector('#bc-sel-all')?.addEventListener('click',  () => area.querySelectorAll('.bc-chk:not(:disabled)').forEach(c => c.checked = true));
  area.querySelector('#bc-sel-none')?.addEventListener('click', () => area.querySelectorAll('.bc-chk:not(:disabled)').forEach(c => c.checked = false));

  area.querySelector('#bc-approve-sel')?.addEventListener('click', () => {
    const sel = [...area.querySelectorAll('.bc-chk:checked:not(:disabled)')].map(c => parseInt(c.dataset.idx));
    approveBranchMatches(sel.map(i => _matchResults[i]), user, area);
  });
  area.querySelector('#bc-approve-all')?.addEventListener('click', () =>
    approveBranchMatches(_matchResults.filter(r => r.eligible), user, area));
  area.querySelector('#bc-clear')?.addEventListener('click', () => { _matchResults = []; area.innerHTML = ''; });
}

function approveBranchMatches(toApprove, user, area) {
  if (!toApprove.length) { showToast('Nothing selected.','warning'); return; }
  const slots = DutySlots.get();
  const now   = new Date().toISOString();
  toApprove.forEach(r => {
    const idx = slots.findIndex(s => s.id === r.slot.id);
    if (idx !== -1) { slots[idx].assignedUserId = r.userId; slots[idx].status = 'assigned'; slots[idx].lastBranchActionAt = now; }
  });
  DutySlots.set(slots);
  logAudit(user, 'auto_match_approve', 'duty_slot', null, `${toApprove.length} slots auto-matched`);
  addActivity(`Branch auto-match: ${toApprove.length} slots assigned by ${user.name}`, 'fa-robot', 'success');
  showToast(`${toApprove.length} assignment${toApprove.length!==1?'s':''} approved!`, 'success');
  _matchResults = [];
  area.innerHTML = `<div class="card"><div class="empty-state" style="padding:32px"><i class="fa-solid fa-circle-check" style="color:var(--primary)"></i><h3>${toApprove.length} assignments saved</h3></div></div>`;
}

// ── Tab: My Personnel ─────────────────────────────────────────
function drawPersonnel(el, user) {
  const soldiers = Users.get().filter(u => u.branchId === user.branchId && u.role === 'soldier');
  const slots    = DutySlots.get();

  el.innerHTML = `
    <div class="section-header">
      <div class="section-title"><i class="fa-solid fa-users"></i> My Personnel (${soldiers.length})</div>
    </div>
    ${soldiers.length ? `
    <div class="user-grid">
      ${soldiers.map(s => {
        const upcoming = slots.filter(x => x.assignedUserId === s.id && x.status === 'assigned' && x.date >= todayStr()).length;
        return `<div class="user-card">
          <div class="user-card-avatar">${avatarHtml(s,'avatar-md')}</div>
          <div class="user-card-info">
            <div class="user-card-name">${s.name}</div>
            <div class="user-card-meta">${rankBadge(s)}</div>
            <div class="user-card-stats">
              <span><i class="fa-solid fa-coins" style="color:var(--warning)"></i> ${s.coins}</span>
              <span><i class="fa-solid fa-shield-halved"></i> ${upcoming} upcoming</span>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>` : `<div class="empty-state"><i class="fa-solid fa-users"></i><h3>No soldiers in your branch</h3></div>`}`;
}
