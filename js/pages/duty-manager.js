// duty-manager.js — Manager-only duty administration page
import { DutySlots, DutyTypes, Restrictions, Users, CoinHistory, AuditLog, Branches, getId, addActivity, logAudit, RANKS } from '../data.js';
import { canOverrideBranch } from '../auth.js';
import { formatDate, getDutyType, getUser, coinDisplay, statusBadge, rankBadge, avatarHtml, todayStr, addDays } from '../utils/helpers.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { runAutoMatch } from '../utils/matching.js';
import { generateMatchReport } from '../utils/pdf.js';

let _activeTab   = 'types';
let _matchResults = [];

export function renderDutyManager(container, user) {
  if (user.role !== 'base_manager') { window.location.hash = '#home'; return; }
  _matchResults = [];
  drawPage(container, user);
}

function drawPage(container, user) {
  container.innerHTML = `
    <div class="page-fade">
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fa-solid fa-sliders"></i> Duty Manager</div>
          <div class="page-subtitle">Manage duty types, slots, auto-matching and restrictions</div>
        </div>
      </div>

      <div class="tabs" id="dm-tabs">
        <button class="tab-btn ${_activeTab==='types'?'active':''}"     data-tab="types">  <i class="fa-solid fa-tag"></i> Duty Types</button>
        <button class="tab-btn ${_activeTab==='slots'?'active':''}"     data-tab="slots">  <i class="fa-solid fa-calendar-plus"></i> Duty Slots</button>
        <button class="tab-btn ${_activeTab==='match'?'active':''}"     data-tab="match">  <i class="fa-solid fa-robot"></i> Auto Match</button>
        <button class="tab-btn ${_activeTab==='restrict'?'active':''}"  data-tab="restrict"><i class="fa-solid fa-ban"></i> Restrictions</button>
        <button class="tab-btn ${_activeTab==='audit'?'active':''}"     data-tab="audit">  <i class="fa-solid fa-clock-rotate-left"></i> Audit Log</button>
      </div>

      <div id="dm-content"></div>
    </div>`;

  container.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => {
      _activeTab = b.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(x => x.classList.toggle('active', x.dataset.tab === _activeTab));
      drawTab(container.querySelector('#dm-content'), user);
    });
  });

  drawTab(container.querySelector('#dm-content'), user);
}

function drawTab(el, user) {
  if (_activeTab === 'types')      drawTypes(el, user);
  else if (_activeTab === 'slots')      drawSlots(el, user);
  else if (_activeTab === 'match')      drawMatch(el, user);
  else if (_activeTab === 'restrict')   drawRestrictions(el, user);
  else if (_activeTab === 'audit')      drawAuditLog(el, user);
}

// ── Tab: Duty Types ──────────────────────────────────────────
function drawTypes(el, user) {
  const types = DutyTypes.get();
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title"><i class="fa-solid fa-tag"></i> Duty Types (${types.length})</div>
      <button class="btn btn-primary btn-sm" id="btn-add-type"><i class="fa-solid fa-plus"></i> New Type</button>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr>
          <th>Color</th><th>Name</th><th>Description</th><th>Req. Rank</th><th>Coin Value</th><th>Status</th><th class="col-actions">Actions</th>
        </tr></thead>
        <tbody>
          ${types.length ? types.map(t => `
            <tr>
              <td><span class="type-dot" style="background:${t.color}"></span></td>
              <td><strong>${t.name}</strong></td>
              <td style="color:var(--text-muted);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.description}</td>
              <td><span class="badge badge-rank">${RANKS[t.requiredRankLevel]}</span></td>
              <td>${coinDisplay(t.coinValue)}</td>
              <td>${t.active ? '<span class="badge badge-approved">Active</span>' : '<span class="badge badge-rejected">Inactive</span>'}</td>
              <td class="col-actions">
                <button class="btn btn-secondary btn-sm" data-edit-type="${t.id}"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn btn-danger    btn-sm" data-del-type="${t.id}"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state" style="padding:32px"><i class="fa-solid fa-tag"></i><h3>No duty types yet</h3></div></td></tr>`}
        </tbody>
      </table>
    </div>`;

  el.querySelector('#btn-add-type').addEventListener('click', () => openTypeModal(null, el, user));
  el.querySelectorAll('[data-edit-type]').forEach(b => b.addEventListener('click', () => openTypeModal(b.dataset.editType, el, user)));
  el.querySelectorAll('[data-del-type]').forEach(b => b.addEventListener('click', () => {
    confirmDialog('Delete this duty type? Existing slots using it will become orphaned.', () => {
      const t = DutyTypes.get().filter(x => x.id !== b.dataset.delType);
      DutyTypes.set(t); showToast('Duty type deleted.','success'); drawTypes(el, user);
    }, 'Delete');
  }));
}

function openTypeModal(id, el, user) {
  const types = DutyTypes.get();
  const t     = id ? types.find(x => x.id === id) : null;
  const title = t ? 'Edit Duty Type' : 'New Duty Type';

  openModal(title, `
    <div class="form-group"><label class="form-label required">Name</label><input class="form-input" id="dt-name" value="${t?.name||''}" placeholder="e.g. Gate Guard" /></div>
    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="dt-desc" rows="2">${t?.description||''}</textarea></div>
    <div class="form-row form-row-2">
      <div class="form-group">
        <label class="form-label required">Coin Value</label>
        <input class="form-input" id="dt-coin" type="number" min="1" value="${t?.coinValue||50}" />
      </div>
      <div class="form-group">
        <label class="form-label required">Required Rank</label>
        <select class="form-select" id="dt-rank">
          ${RANKS.map((r,i) => `<option value="${i}" ${t?.requiredRankLevel===i?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label">Color</label><input class="form-input" id="dt-color" type="color" value="${t?.color||'#4CAF50'}" /></div>
      <div class="form-group">
        <label class="form-label">Active</label>
        <label class="toggle-group" style="margin-top:8px">
          <input type="checkbox" id="dt-active" ${t?.active!==false?'checked':''} />
          <span class="toggle-label">Enabled for scheduling</span>
        </label>
      </div>
    </div>
    <div id="dt-err" class="form-error"></div>`,
    [
      { label: 'Cancel', cls: 'btn-ghost',    action: 'cancel', onClick: closeModal },
      { label: t ? 'Save Changes' : 'Create', cls: 'btn-primary', action: 'save',   onClick: () => saveType(id, el, user) },
    ], { id: 'dt-modal' });
}

function saveType(id, el, user) {
  const name    = document.getElementById('dt-name').value.trim();
  const desc    = document.getElementById('dt-desc').value.trim();
  const coin    = parseInt(document.getElementById('dt-coin').value);
  const rank    = parseInt(document.getElementById('dt-rank').value);
  const color   = document.getElementById('dt-color').value;
  const active  = document.getElementById('dt-active').checked;
  const err     = document.getElementById('dt-err');

  if (!name) { err.textContent = 'Name is required.'; return; }
  if (isNaN(coin) || coin < 1) { err.textContent = 'Coin value must be at least 1.'; return; }

  const types = DutyTypes.get();
  if (id) {
    const i = types.findIndex(t => t.id === id);
    if (i !== -1) types[i] = { ...types[i], name, description: desc, coinValue: coin, requiredRankLevel: rank, color, active };
    DutyTypes.set(types);
    showToast('Duty type updated.', 'success');
  } else {
    types.push({ id: getId(), name, description: desc, coinValue: coin, requiredRankLevel: rank, color, active: true, icon: 'fa-shield' });
    DutyTypes.set(types);
    addActivity(`New duty type created: ${name}`, 'fa-tag', 'info');
    showToast('Duty type created!', 'success');
  }
  closeModal();
  drawTypes(el, user);
}

// ── Tab: Duty Slots ──────────────────────────────────────────
function drawSlots(el, user) {
  const slots = DutySlots.get().sort((a,b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));
  const types = DutyTypes.get();
  const users = Users.get();

  el.innerHTML = `
    <div class="section-header">
      <div class="section-title"><i class="fa-solid fa-calendar-plus"></i> Duty Slots (${slots.length})</div>
      <div class="flex gap-sm flex-wrap">
        <button class="btn btn-secondary btn-sm" id="btn-bulk-add"><i class="fa-solid fa-layer-group"></i> Bulk Add</button>
        <button class="btn btn-primary btn-sm"   id="btn-add-slot"><i class="fa-solid fa-plus"></i> Add Slot</button>
      </div>
    </div>

    <!-- Slot filters -->
    <div class="filter-bar" style="margin-bottom:12px">
      <span class="filter-label">Status:</span>
      ${['vacant','assigned','completed','pending_branch'].map(s => `<span class="filter-chip" data-slot-status="${s}">${s}</span>`).join('')}
      <span class="filter-label">Type:</span>
      ${types.map(t => `<span class="filter-chip" data-slot-type="${t.id}"><span class="dot" style="background:${t.color}"></span>${t.name}</span>`).join('')}
    </div>

    <div class="table-wrap">
      <table class="table" id="slots-table">
        <thead><tr>
          <th>Date</th><th>Time</th><th>Type</th><th>Assigned To</th><th>Branch</th><th>Status</th><th>Notes</th><th class="col-actions">Actions</th>
        </tr></thead>
        <tbody id="slots-tbody">
          ${renderSlotsRows(slots, types, users)}
        </tbody>
      </table>
    </div>`;

  el.querySelector('#btn-add-slot').addEventListener('click', () => openSlotModal(null, el, user));
  el.querySelector('#btn-bulk-add').addEventListener('click', () => openBulkModal(el, user));
  bindSlotActions(el, el.querySelector('#slots-tbody'), user);

  // Slot filter chips
  let sFilter = { statuses: [], types: [] };
  el.querySelectorAll('[data-slot-status]').forEach(c => c.addEventListener('click', () => {
    const s = c.dataset.slotStatus; toggleFilter(sFilter.statuses, s); c.classList.toggle('active');
    refilterSlots(el, sFilter, slots, types, users);
  }));
  el.querySelectorAll('[data-slot-type]').forEach(c => c.addEventListener('click', () => {
    const t = c.dataset.slotType; toggleFilter(sFilter.types, t); c.classList.toggle('active');
    refilterSlots(el, sFilter, slots, types, users);
  }));
}

function toggleFilter(arr, val) {
  const i = arr.indexOf(val);
  i === -1 ? arr.push(val) : arr.splice(i, 1);
}

function refilterSlots(el, f, allSlots, types, users) {
  let s = allSlots;
  if (f.statuses.length) s = s.filter(x => f.statuses.includes(x.status));
  if (f.types.length)    s = s.filter(x => f.types.includes(x.typeId));
  el.querySelector('#slots-tbody').innerHTML = renderSlotsRows(s, types, users);
  bindSlotActions(el, el.querySelector('#slots-tbody'), null);
}

function renderSlotsRows(slots, types, users) {
  if (!slots.length) return `<tr><td colspan="8"><div class="empty-state" style="padding:24px"><i class="fa-solid fa-calendar"></i><h3>No slots found</h3></div></td></tr>`;
  return slots.map(s => {
    const dt  = types.find(t => t.id === s.typeId);
    const su  = s.assignedUserId ? users.find(u => u.id === s.assignedUserId) : null;
    const bm  = s.branchManagerId ? users.find(u => u.id === s.branchManagerId) : null;
    const canOverride = canOverrideBranch(s);

    // Edit button — locked if assigned and canOverrideBranch is false
    let editBtn = '';
    if (s.status === 'assigned' && !canOverride) {
      editBtn = `<button class="btn btn-secondary btn-sm" data-edit-slot="${s.id}" title="Branch manager active — cannot override" disabled style="opacity:0.5;cursor:not-allowed"><i class="fa-solid fa-lock"></i></button>`;
    } else {
      editBtn = `<button class="btn btn-secondary btn-sm" data-edit-slot="${s.id}"><i class="fa-solid fa-pencil"></i></button>`;
    }

    // Delegate button
    let delegateBtn = '';
    if (s.status === 'vacant') {
      delegateBtn = `<button class="btn btn-secondary btn-sm" data-delegate-slot="${s.id}" title="Delegate to branch manager"><i class="fa-solid fa-share-nodes"></i> Delegate</button>`;
    } else if (s.status === 'pending_branch') {
      delegateBtn = `<button class="btn btn-ghost btn-sm" data-delegate-slot="${s.id}" title="Reassign branch manager"><i class="fa-solid fa-share-nodes"></i> Reassign Branch</button>`;
    }

    return `<tr>
      <td>${formatDate(s.date)}</td>
      <td style="white-space:nowrap">${s.startTime} – ${s.endTime}</td>
      <td>${dt ? `<span style="display:flex;align-items:center;gap:6px"><span class="type-dot" style="background:${dt.color}"></span>${dt.name}</span>` : '—'}</td>
      <td>${su ? `<span style="display:flex;align-items:center;gap:6px">${avatarHtml(su,'avatar-xs')}${su.name}</span>` : '<span class="text-dim">Vacant</span>'}</td>
      <td>${bm ? `<span style="font-size:.82rem">${bm.name}</span>` : '<span class="text-dim">—</span>'}</td>
      <td>${statusBadge(s.status)}</td>
      <td style="color:var(--text-dim);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.notes||'—'}</td>
      <td class="col-actions">
        ${editBtn}
        ${delegateBtn}
        ${s.status==='assigned'&&s.date<=todayStr() ? `<button class="btn btn-primary btn-sm" data-complete-slot="${s.id}" title="Mark Completed"><i class="fa-solid fa-check"></i></button>` : ''}
        <button class="btn btn-danger btn-sm" data-del-slot="${s.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function bindSlotActions(el, tbody, user) {
  tbody.querySelectorAll('[data-edit-slot]').forEach(b => {
    if (b.disabled) return;
    b.addEventListener('click', () => {
      const u = user || { role: 'base_manager' };
      openSlotModal(b.dataset.editSlot, el, u);
    });
  });
  tbody.querySelectorAll('[data-delegate-slot]').forEach(b => b.addEventListener('click', () => {
    const u = user || { role: 'base_manager' };
    openDelegateModal(b.dataset.delegateSlot, el, u);
  }));
  tbody.querySelectorAll('[data-complete-slot]').forEach(b => b.addEventListener('click', () => completeSlotById(b.dataset.completeSlot, el, user)));
  tbody.querySelectorAll('[data-del-slot]').forEach(b => b.addEventListener('click', () => {
    confirmDialog('Delete this duty slot?', () => {
      DutySlots.set(DutySlots.get().filter(s => s.id !== b.dataset.delSlot));
      showToast('Slot deleted.','success');
      drawSlots(el, user || {role:'base_manager'});
    }, 'Delete');
  }));
}

function completeSlotById(slotId, el, user) {
  const slots = DutySlots.get();
  const idx   = slots.findIndex(s => s.id === slotId);
  if (idx === -1) return;
  const slot = slots[idx];
  slots[idx].status = 'completed';
  DutySlots.set(slots);

  // Award coins
  if (slot.assignedUserId) {
    const dt    = getDutyType(slot.typeId);
    const users = Users.get();
    const ui    = users.findIndex(u => u.id === slot.assignedUserId);
    if (ui !== -1 && dt) {
      users[ui].coins += dt.coinValue;
      Users.set(users);
      const ch = CoinHistory.get();
      ch.push({ id: getId(), userId: slot.assignedUserId, amount: dt.coinValue, reason: `${dt.name} completed`, dutySlotId: slotId, date: new Date().toISOString() });
      CoinHistory.set(ch);
      const su = users[ui];
      addActivity(`${su.name} completed ${dt.name} (+${dt.coinValue} coins)`, 'fa-check-circle', 'success');
    }
  }
  showToast('Duty marked completed. Coins awarded!','success');
  drawSlots(el, user || {role:'base_manager'});
}

function openSlotModal(id, el, user) {
  const slots    = DutySlots.get();
  const types    = DutyTypes.get().filter(t => t.active);
  const soldiers = Users.get().filter(u => u.role === 'soldier' && u.status === 'active');
  const s        = id ? slots.find(x => x.id === id) : null;

  openModal(s ? 'Edit Duty Slot' : 'Add Duty Slot', `
    <div class="form-row form-row-2">
      <div class="form-group">
        <label class="form-label required">Date</label>
        <input class="form-input" id="sl-date" type="date" value="${s?.date||todayStr()}" />
      </div>
      <div class="form-group">
        <label class="form-label required">Duty Type</label>
        <select class="form-select" id="sl-type">
          ${types.map(t => `<option value="${t.id}" ${s?.typeId===t.id?'selected':''}>${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label required">Start Time</label>
        <input class="form-input" id="sl-start" type="time" value="${s?.startTime||'08:00'}" />
      </div>
      <div class="form-group">
        <label class="form-label required">End Time</label>
        <input class="form-input" id="sl-end"   type="time" value="${s?.endTime||'12:00'}" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Assign Soldier (optional)</label>
      <select class="form-select" id="sl-user">
        <option value="">— Leave Vacant —</option>
        ${soldiers.map(u => `<option value="${u.id}" ${s?.assignedUserId===u.id?'selected':''}>${u.name} (${u.rank})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea class="form-textarea" id="sl-notes" rows="2">${s?.notes||''}</textarea>
    </div>
    <div id="sl-err" class="form-error"></div>`,
    [
      { label: 'Cancel', cls: 'btn-ghost',   action: 'cancel', onClick: closeModal },
      { label: s ? 'Save' : 'Add Slot', cls: 'btn-primary', action: 'save', onClick: () => saveSlot(id, el, user) },
    ]);
}

function saveSlot(id, el, user) {
  const date    = document.getElementById('sl-date').value;
  const typeId  = document.getElementById('sl-type').value;
  const start   = document.getElementById('sl-start').value;
  const end     = document.getElementById('sl-end').value;
  const userId  = document.getElementById('sl-user').value || null;
  const notes   = document.getElementById('sl-notes').value.trim();
  const err     = document.getElementById('sl-err');

  if (!date)   { err.textContent = 'Date is required.'; return; }
  if (!typeId) { err.textContent = 'Duty type is required.'; return; }
  if (!start)  { err.textContent = 'Start time is required.'; return; }

  const slots  = DutySlots.get();
  const status = userId ? 'assigned' : 'vacant';

  if (id) {
    const i = slots.findIndex(s => s.id === id);
    if (i !== -1) slots[i] = { ...slots[i], date, typeId, startTime: start, endTime: end||'00:00', assignedUserId: userId, notes, status };
    DutySlots.set(slots);
    showToast('Slot updated.', 'success');
  } else {
    slots.push({ id: getId(), date, typeId, startTime: start, endTime: end||'00:00', assignedUserId: userId, notes, status, createdAt: new Date().toISOString() });
    DutySlots.set(slots);
    addActivity(`New duty slot added: ${formatDate(date)}`, 'fa-calendar-plus', 'info');
    showToast('Slot added!', 'success');
  }
  closeModal();
  drawSlots(el, user);
}

function openBulkModal(el, user) {
  const types = DutyTypes.get().filter(t => t.active);
  const timeWindows = [
    { label: '00:00 – 04:00', s: '00:00', e: '04:00' },
    { label: '04:00 – 08:00', s: '04:00', e: '08:00' },
    { label: '08:00 – 12:00', s: '08:00', e: '12:00' },
    { label: '12:00 – 16:00', s: '12:00', e: '16:00' },
    { label: '16:00 – 20:00', s: '16:00', e: '20:00' },
    { label: '20:00 – 00:00', s: '20:00', e: '00:00' },
  ];

  openModal('Bulk Add Duty Slots', `
    <p style="color:var(--text-muted);font-size:.875rem;margin-bottom:4px">Generate multiple slots across a date range with a selected pattern.</p>
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label required">From Date</label><input class="form-input" id="bk-from" type="date" value="${todayStr()}" /></div>
      <div class="form-group"><label class="form-label required">To Date</label>  <input class="form-input" id="bk-to"   type="date" value="${addDays(todayStr(), 7)}" /></div>
    </div>
    <div class="form-group">
      <label class="form-label required">Duty Type</label>
      <select class="form-select" id="bk-type">
        ${types.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label required">Time Windows (select one or more)</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
        ${timeWindows.map((w,i) => `
          <label class="toggle-group" style="background:var(--surface2);padding:6px 10px;border-radius:6px;border:1px solid var(--border)">
            <input type="checkbox" class="bk-tw" value="${i}" /> <span>${w.label}</span>
          </label>`).join('')}
      </div>
    </div>
    <div id="bk-err" class="form-error"></div>`,
    [
      { label: 'Cancel',  cls: 'btn-ghost',   action: 'cancel', onClick: closeModal },
      { label: 'Generate Slots', cls: 'btn-primary', action: 'gen', onClick: () => {
        const from   = document.getElementById('bk-from').value;
        const to     = document.getElementById('bk-to').value;
        const typeId = document.getElementById('bk-type').value;
        const selTw  = [...document.querySelectorAll('.bk-tw:checked')].map(c => parseInt(c.value));
        const err    = document.getElementById('bk-err');
        if (!from || !to || from > to) { err.textContent = 'Invalid date range.'; return; }
        if (!selTw.length) { err.textContent = 'Select at least one time window.'; return; }

        const slots  = DutySlots.get();
        let   added  = 0;
        let   d      = from;
        while (d <= to) {
          selTw.forEach(twi => {
            const tw = timeWindows[twi];
            const dup = slots.some(s => s.date===d && s.typeId===typeId && s.startTime===tw.s);
            if (!dup) {
              slots.push({ id: getId(), date: d, typeId, startTime: tw.s, endTime: tw.e, assignedUserId: null, notes: '', status: 'vacant', createdAt: new Date().toISOString() });
              added++;
            }
          });
          d = addDays(d, 1);
        }
        DutySlots.set(slots);
        closeModal();
        showToast(`${added} slot${added!==1?'s':''} generated.`, 'success');
        drawSlots(el, user);
      }},
    ]);
}

// ── Delegate Modal ───────────────────────────────────────────
function openDelegateModal(slotId, el, user) {
  const slot = DutySlots.get().find(s => s.id === slotId);
  if (!slot) return;
  const dt = DutyTypes.get().find(t => t.id === slot.typeId);
  const branchManagers = Users.get().filter(u => u.role === 'branch_manager' && u.status === 'active');
  const branches = Branches.get();

  openModal('Delegate Slot to Branch Manager', `
    <div style="margin-bottom:16px">
      <div class="form-label">Slot</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dt?.color||'#ccc'}"></span>
        <strong>${dt?.name||'?'}</strong> · ${formatDate(slot.date)} ${slot.startTime}–${slot.endTime}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label required">Branch Manager</label>
      <select class="form-select" id="dlg-bm-sel">
        <option value="">— Select branch manager —</option>
        ${branchManagers.map(bm => {
          const branch = branches.find(b => b.id === bm.branchId);
          return `<option value="${bm.id}" ${slot.branchManagerId===bm.id?'selected':''}>${bm.name} (${branch?.name||'No branch'})</option>`;
        }).join('')}
      </select>
    </div>
    <div id="dlg-err" class="form-error"></div>`,
    [
      { label: 'Cancel',    cls: 'btn-ghost',   action: 'cancel', onClick: closeModal },
      { label: slot.branchManagerId ? 'Reassign' : 'Delegate', cls: 'btn-primary', action: 'delegate', onClick: () => saveDelegate(slotId, el, user) },
    ]);
}

function saveDelegate(slotId, el, user) {
  const bmId = document.getElementById('dlg-bm-sel').value;
  const err  = document.getElementById('dlg-err');
  if (!bmId) { err.textContent = 'Please select a branch manager.'; return; }

  const slots = DutySlots.get();
  const idx   = slots.findIndex(s => s.id === slotId);
  if (idx === -1) { closeModal(); return; }

  slots[idx].branchManagerId = bmId;
  slots[idx].delegatedAt     = new Date().toISOString();
  slots[idx].status          = 'pending_branch';
  slots[idx].assignedUserId  = null;
  slots[idx].lastBranchActionAt = null;
  DutySlots.set(slots);

  const bm = getUser(bmId);
  logAudit(user, 'delegate_slot', 'duty_slot', slotId, `Delegated to ${bm?.name}`);
  addActivity(`${user.name} delegated slot to ${bm?.name}`, 'fa-share-nodes', 'info');
  closeModal();
  showToast(`Slot delegated to ${bm?.name}!`, 'success');
  drawSlots(el, user);
}

// ── Tab: Auto Match ──────────────────────────────────────────
function drawMatch(el, user) {
  const types = DutyTypes.get().filter(t => t.active);
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title"><i class="fa-solid fa-robot"></i> Auto Match</div>
    </div>

    <!-- Config Card -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><span class="card-title"><i class="fa-solid fa-gear"></i> Match Configuration</span></div>
      <div class="card-body">
        <div class="form-row form-row-2" style="margin-bottom:16px">
          <div class="form-group">
            <label class="form-label">Date From</label>
            <input class="form-input" id="am-from" type="date" value="${todayStr()}" />
          </div>
          <div class="form-group">
            <label class="form-label">Date To</label>
            <input class="form-input" id="am-to"   type="date" value="${addDays(todayStr(), 30)}" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Include Duty Types</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
            ${types.map(t => `
              <label class="toggle-group" style="background:var(--surface2);padding:6px 10px;border-radius:6px;border:1px solid var(--border)">
                <input type="checkbox" class="am-type" value="${t.id}" checked />
                <span class="dot" style="background:${t.color}"></span>
                <span>${t.name}</span>
              </label>`).join('')}
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary" id="btn-run-match">
          <i class="fa-solid fa-robot"></i> Run Auto Match
        </button>
      </div>
    </div>

    <!-- Results -->
    <div id="match-results-area"></div>`;

  el.querySelector('#btn-run-match').addEventListener('click', () => runMatch(el, user));

  // If we have previous results, show them
  if (_matchResults.length) renderMatchResults(el.querySelector('#match-results-area'), user);
}

function runMatch(el, user) {
  const from      = document.getElementById('am-from').value;
  const to        = document.getElementById('am-to').value;
  const selTypes  = [...document.querySelectorAll('.am-type:checked')].map(c => c.value);

  if (!from || !to) { showToast('Please select a date range.','warning'); return; }
  if (!selTypes.length) { showToast('Select at least one duty type.','warning'); return; }

  const btn = el.querySelector('#btn-run-match');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running…';

  setTimeout(() => {
    const allSlots  = DutySlots.get();
    const vacant    = allSlots.filter(s => s.status === 'vacant' && s.date >= from && s.date <= to && selTypes.includes(s.typeId));
    const users     = Users.get().filter(u => u.role === 'soldier' && u.status === 'active');
    const types     = DutyTypes.get();
    const rests     = Restrictions.get();

    _matchResults = runAutoMatch(vacant, users, types, rests, allSlots);

    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-robot"></i> Run Auto Match';

    renderMatchResults(el.querySelector('#match-results-area'), user);
  }, 600);
}

function renderMatchResults(area, user) {
  if (!_matchResults.length) {
    area.innerHTML = `<div class="card"><div class="empty-state" style="padding:32px"><i class="fa-solid fa-calendar-check"></i><h3>No vacant slots found in this range</h3></div></div>`;
    return;
  }

  const matched   = _matchResults.filter(r => r.eligible);
  const unmatched = _matchResults.filter(r => !r.eligible);
  const types     = DutyTypes.get();
  const usersAll  = Users.get();

  area.innerHTML = `
    <div class="match-results">
      <div class="match-summary-row">
        <div class="match-stat"><div class="match-stat-val">${_matchResults.length}</div><div class="match-stat-lbl">Total vacant</div></div>
        <div class="match-stat"><div class="match-stat-val">${matched.length}</div><div class="match-stat-lbl">Matched</div></div>
        <div class="match-stat conflict"><div class="match-stat-val">${unmatched.length}</div><div class="match-stat-lbl">Unmatched</div></div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fa-solid fa-list-check"></i> Proposed Assignments</span>
          <div class="flex gap-sm">
            <button class="btn btn-secondary btn-sm" id="am-sel-all">Select All</button>
            <button class="btn btn-secondary btn-sm" id="am-sel-none">Deselect</button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead><tr>
              <th><input type="checkbox" id="am-chk-master" checked /></th>
              <th>Date</th><th>Time</th><th>Duty Type</th><th>Proposed User</th><th>Rank</th><th>Current Coins</th><th>Status</th><th>Notes</th>
            </tr></thead>
            <tbody>
              ${_matchResults.map((r, i) => {
                const dt = types.find(t => t.id === r.slot.typeId);
                const su = r.userId ? usersAll.find(u => u.id === r.userId) : null;
                const hasConflict = !r.eligible;
                return `<tr class="${hasConflict ? 'match-row-conflict' : ''} match-row" style="animation-delay:${i * 40}ms">
                  <td><input type="checkbox" class="am-chk" data-idx="${i}" ${r.eligible ? 'checked' : 'disabled'} /></td>
                  <td>${formatDate(r.slot.date)}</td>
                  <td style="white-space:nowrap">${r.slot.startTime} – ${r.slot.endTime}</td>
                  <td>${dt ? `<span style="display:flex;align-items:center;gap:6px"><span class="type-dot" style="background:${dt.color}"></span>${dt.name}</span>` : '—'}</td>
                  <td>${su ? `<span style="display:flex;align-items:center;gap:6px">${avatarHtml(su,'avatar-xs')}${su.name}</span>` : '<em class="text-dim">No match</em>'}</td>
                  <td>${su ? rankBadge(su) : '—'}</td>
                  <td>${su ? coinDisplay(su.coins) : '—'}</td>
                  <td>${r.eligible ? '<span class="badge badge-approved">Matched</span>' : '<span class="badge badge-rejected">Failed</span>'}</td>
                  <td style="font-size:.78rem;color:${r.eligible?'var(--text-dim)':'var(--danger)'}">${r.conflicts.join(', ')||'—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        <div class="card-footer">
          ${matched.length > 0 ? `
          <button class="btn btn-primary" id="am-approve-sel"><i class="fa-solid fa-check"></i> Approve Selected</button>
          <button class="btn btn-primary" id="am-approve-all"><i class="fa-solid fa-check-double"></i> Approve All</button>` : ''}
          <button class="btn btn-pdf" id="am-pdf"><i class="fa-solid fa-file-pdf"></i> Generate PDF</button>
          <button class="btn btn-ghost" id="am-clear"><i class="fa-solid fa-xmark"></i> Clear</button>
        </div>
      </div>
    </div>`;

  // Master checkbox
  const master = area.querySelector('#am-chk-master');
  master?.addEventListener('change', () => {
    area.querySelectorAll('.am-chk:not(:disabled)').forEach(c => c.checked = master.checked);
  });

  area.querySelector('#am-sel-all')?.addEventListener('click', () => {
    area.querySelectorAll('.am-chk:not(:disabled)').forEach(c => c.checked = true);
  });
  area.querySelector('#am-sel-none')?.addEventListener('click', () => {
    area.querySelectorAll('.am-chk:not(:disabled)').forEach(c => c.checked = false);
  });

  area.querySelector('#am-approve-sel')?.addEventListener('click', () => {
    const sel = [...area.querySelectorAll('.am-chk:checked:not(:disabled)')].map(c => parseInt(c.dataset.idx));
    approveMatches(sel.map(i => _matchResults[i]), user, area);
  });
  area.querySelector('#am-approve-all')?.addEventListener('click', () => {
    approveMatches(_matchResults.filter(r => r.eligible), user, area);
  });
  area.querySelector('#am-pdf')?.addEventListener('click', () => {
    generateMatchReport(_matchResults, DutySlots.get(), Users.get(), DutyTypes.get());
  });
  area.querySelector('#am-clear')?.addEventListener('click', () => {
    _matchResults = [];
    area.innerHTML = '';
  });
}

function approveMatches(toApprove, user, area) {
  if (!toApprove.length) { showToast('Nothing selected to approve.','warning'); return; }

  const slots = DutySlots.get();
  toApprove.forEach(r => {
    const idx = slots.findIndex(s => s.id === r.slot.id);
    if (idx !== -1) {
      slots[idx].assignedUserId = r.userId;
      slots[idx].status = 'assigned';
    }
  });
  DutySlots.set(slots);

  addActivity(`Auto-match: ${toApprove.length} slots assigned`, 'fa-robot', 'success');
  showToast(`${toApprove.length} assignment${toApprove.length!==1?'s':''} approved and saved!`, 'success');

  // Clear results
  _matchResults = [];
  area.innerHTML = `
    <div class="card">
      <div class="empty-state" style="padding:32px">
        <i class="fa-solid fa-circle-check" style="color:var(--primary)"></i>
        <h3>${toApprove.length} assignment${toApprove.length!==1?'s':''} saved</h3>
        <p>Run the matcher again to assign remaining vacant slots.</p>
      </div>
    </div>`;
}

// ── Tab: Restrictions ────────────────────────────────────────
function drawRestrictions(el, user) {
  const rests = Restrictions.get();
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title"><i class="fa-solid fa-ban"></i> Scheduling Restrictions (${rests.length})</div>
      <button class="btn btn-primary btn-sm" id="btn-add-rest"><i class="fa-solid fa-plus"></i> Add Restriction</button>
    </div>
    <p style="color:var(--text-muted);font-size:.875rem;margin-bottom:20px">
      Restrictions limit how the auto-matcher assigns duties. Active restrictions are applied during every auto-match run.
    </p>

    <div id="rest-list" style="display:flex;flex-direction:column;gap:12px">
      ${rests.length ? rests.map(r => renderRestrictionCard(r)).join('') : `<div class="empty-state"><i class="fa-solid fa-ban"></i><h3>No restrictions defined</h3><p>Add scheduling rules to enforce fair and safe duty assignments.</p></div>`}
    </div>`;

  el.querySelector('#btn-add-rest').addEventListener('click', () => openRestrictionModal(null, el, user));
  bindRestrictionActions(el, user);
}

function renderRestrictionCard(r) {
  const icons = { consecutive_weeks: 'fa-rotate', max_per_period: 'fa-calendar-xmark', min_rest_hours: 'fa-bed' };
  const icon  = icons[r.type] || 'fa-ban';
  return `<div class="restriction-card" data-rest-id="${r.id}">
    <div class="restriction-icon"><i class="fa-solid ${icon}"></i></div>
    <div class="restriction-body">
      <div class="restriction-name">${r.name}</div>
      <div class="restriction-desc">${r.description}</div>
    </div>
    <div class="restriction-actions">
      <label class="toggle-switch" title="${r.active?'Disable':'Enable'}">
        <input type="checkbox" class="rest-toggle" data-rest-id="${r.id}" ${r.active?'checked':''}>
        <span class="slider"></span>
      </label>
      <button class="icon-btn" data-edit-rest="${r.id}" title="Edit"><i class="fa-solid fa-pencil"></i></button>
      <button class="icon-btn" data-del-rest="${r.id}"  title="Delete" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>
    </div>
  </div>`;
}

function bindRestrictionActions(el, user) {
  el.querySelectorAll('.rest-toggle').forEach(t => t.addEventListener('change', () => {
    const rests = Restrictions.get();
    const i     = rests.findIndex(r => r.id === t.dataset.restId);
    if (i !== -1) { rests[i].active = t.checked; Restrictions.set(rests); }
    showToast(t.checked ? 'Restriction enabled.' : 'Restriction disabled.', 'info');
  }));
  el.querySelectorAll('[data-edit-rest]').forEach(b => b.addEventListener('click', () => openRestrictionModal(b.dataset.editRest, el, user)));
  el.querySelectorAll('[data-del-rest]').forEach(b => b.addEventListener('click', () => {
    confirmDialog('Delete this restriction?', () => {
      Restrictions.set(Restrictions.get().filter(r => r.id !== b.dataset.delRest));
      showToast('Restriction deleted.','success');
      drawRestrictions(el, user);
    }, 'Delete');
  }));
}

function openRestrictionModal(id, el, user) {
  const rests = Restrictions.get();
  const r     = id ? rests.find(x => x.id === id) : null;
  const types = DutyTypes.get().filter(t => t.active);

  openModal(r ? 'Edit Restriction' : 'Add Restriction',
    `<p style="color:var(--text-muted);font-size:.85rem;margin-bottom:8px">Use the builder below to define your scheduling rule.</p>
    <div class="form-group">
      <label class="form-label required">Restriction Name</label>
      <input class="form-input" id="rn-name" value="${r?.name||''}" placeholder="e.g. No Consecutive Weeks" />
    </div>
    <div class="form-group">
      <label class="form-label required">Rule Type</label>
      <select class="form-select" id="rn-type">
        <option value="consecutive_weeks" ${r?.type==='consecutive_weeks'?'selected':''}>No Consecutive Weeks (same duty type)</option>
        <option value="max_per_period"    ${r?.type==='max_per_period'?'selected':''}>Max Duties Per Period</option>
        <option value="min_rest_hours"    ${r?.type==='min_rest_hours'?'selected':''}>Minimum Rest Hours Between Duties</option>
      </select>
    </div>

    <!-- Rule sentence builder — changes dynamically -->
    <div class="form-group" id="rn-sentence-wrap">
      <label class="form-label">Rule Parameters</label>
      <div class="rule-sentence" id="rn-sentence"></div>
      <div class="rule-preview" id="rn-preview"></div>
    </div>
    <div id="rn-err" class="form-error"></div>`,
    [
      { label: 'Cancel', cls: 'btn-ghost',   action: 'cancel', onClick: closeModal },
      { label: r ? 'Save' : 'Add Restriction', cls: 'btn-primary', action: 'save', onClick: () => saveRestriction(id, el, user) },
    ], { id: 'rn-modal', size: 'lg' });

  const typeSel = document.getElementById('rn-type');
  renderRuleSentence(typeSel.value, r, types);
  typeSel.addEventListener('change', () => renderRuleSentence(typeSel.value, null, types));
}

function renderRuleSentence(type, r, types) {
  const wrap = document.getElementById('rn-sentence');
  if (!wrap) return;

  if (type === 'consecutive_weeks') {
    wrap.innerHTML = `Cannot assign the same duty type to the same soldier more than once every
      <input type="number" id="rn-weeks" class="form-input" style="width:70px;display:inline-block" min="1" max="12" value="${r?.params?.weeks||2}" />
      weeks in a row.`;
  } else if (type === 'max_per_period') {
    wrap.innerHTML = `A soldier cannot have more than
      <input type="number" id="rn-max" class="form-input" style="width:70px;display:inline-block" min="1" max="30" value="${r?.params?.max||3}" />
      duties within any
      <input type="number" id="rn-period" class="form-input" style="width:70px;display:inline-block" min="1" max="90" value="${r?.params?.periodDays||7}" />
      day period.`;
  } else if (type === 'min_rest_hours') {
    wrap.innerHTML = `Every soldier must have at least
      <input type="number" id="rn-hours" class="form-input" style="width:70px;display:inline-block" min="1" max="168" value="${r?.params?.hours||8}" />
      hours of rest between any two guard duties.`;
  }

  updateRulePreview();

  wrap.querySelectorAll('input').forEach(inp => inp.addEventListener('input', updateRulePreview));
}

function updateRulePreview() {
  const prev = document.getElementById('rn-preview');
  const type = document.getElementById('rn-type')?.value;
  if (!prev || !type) return;

  let txt = '';
  if (type === 'consecutive_weeks') {
    const w = document.getElementById('rn-weeks')?.value || 2;
    txt = `Rule: No soldier performs the same duty type more than once every ${w} week(s).`;
  } else if (type === 'max_per_period') {
    const m = document.getElementById('rn-max')?.value    || 3;
    const p = document.getElementById('rn-period')?.value || 7;
    txt = `Rule: No soldier receives more than ${m} duties in any ${p}-day window.`;
  } else if (type === 'min_rest_hours') {
    const h = document.getElementById('rn-hours')?.value || 8;
    txt = `Rule: At least ${h} hours must separate a soldier's consecutive duties.`;
  }
  prev.textContent = txt;
}

function saveRestriction(id, el, user) {
  const name  = document.getElementById('rn-name').value.trim();
  const type  = document.getElementById('rn-type').value;
  const err   = document.getElementById('rn-err');

  if (!name) { err.textContent = 'Name is required.'; return; }

  let params = {};
  let desc   = '';
  if (type === 'consecutive_weeks') {
    const w = parseInt(document.getElementById('rn-weeks')?.value || 2);
    params  = { weeks: w };
    desc    = `Same duty type cannot be assigned to the same soldier ${w} weeks in a row.`;
  } else if (type === 'max_per_period') {
    const m = parseInt(document.getElementById('rn-max')?.value    || 3);
    const p = parseInt(document.getElementById('rn-period')?.value || 7);
    params  = { max: m, periodDays: p };
    desc    = `No soldier can have more than ${m} duties in any ${p}-day period.`;
  } else if (type === 'min_rest_hours') {
    const h = parseInt(document.getElementById('rn-hours')?.value || 8);
    params  = { hours: h };
    desc    = `Soldiers must have at least ${h}h of rest between any two duties.`;
  }

  const rests = Restrictions.get();
  if (id) {
    const i = rests.findIndex(r => r.id === id);
    if (i !== -1) rests[i] = { ...rests[i], name, type, params, description: desc };
    Restrictions.set(rests);
    showToast('Restriction updated.', 'success');
  } else {
    rests.push({ id: getId(), name, type, params, description: desc, active: true });
    Restrictions.set(rests);
    showToast('Restriction added!', 'success');
  }
  closeModal();
  drawRestrictions(el, user);
}

// ── Tab: Audit Log ───────────────────────────────────────────
function drawAuditLog(el, user) {
  const log = AuditLog.get().slice(0, 100);
  el.innerHTML = `
    <div class="section-header">
      <div class="section-title"><i class="fa-solid fa-clock-rotate-left"></i> Audit Log (${log.length})</div>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>
          ${log.length ? log.map(e => `
            <tr>
              <td style="white-space:nowrap;font-size:.8rem">${new Date(e.ts).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
              <td>${e.actorName}</td>
              <td><span class="badge ${e.actorRole === 'base_manager' ? 'badge-base-manager' : 'badge-branch-manager'}">${e.actorRole === 'base_manager' ? 'Base' : 'Branch'}</span></td>
              <td><code style="font-size:.78rem;background:var(--surface2);padding:2px 6px;border-radius:4px">${e.action}</code></td>
              <td style="color:var(--text-dim);font-size:.82rem">${e.details}</td>
            </tr>`).join('') : '<tr><td colspan="5"><div class="empty-state" style="padding:24px"><i class="fa-solid fa-clock-rotate-left"></i><h3>No audit entries yet</h3></div></td></tr>'}
        </tbody>
      </table>
    </div>`;
}
