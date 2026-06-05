// user-management.js — Personnel roster page
import { Users, DutySlots, DutyTypes, CoinHistory, Requests, Branches, getId, addActivity, RANKS, RANK_CSS } from '../data.js';
import { formatDate, formatDateTime, formatRelative, getInitials, avatarHtml, rankBadge, roleBadge, coinDisplay, statusBadge } from '../utils/helpers.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderUsers(container, user) {
  if (user.role === 'soldier') {
    window.location.hash = '#home';
    return;
  }
  drawPage(container, user);
}

function drawPage(container, user) {
  const isBaseManager   = user.role === 'base_manager';
  const isBranchManager = user.role === 'branch_manager';

  // Scope the visible user list by role
  const allUsers = Users.get();
  const users = isBaseManager
    ? allUsers
    : allUsers.filter(u => u.branchId === user.branchId && u.role === 'soldier');

  const slots = DutySlots.get();

  // Page title
  let pageTitle;
  if (isBaseManager) {
    pageTitle = 'Personnel Roster — All Branches';
  } else {
    const branch = Branches.get().find(b => b.id === user.branchId);
    pageTitle = `My Personnel — ${branch ? branch.name : 'My Branch'}`;
  }

  // Sort / filter state
  let sortBy       = 'name';
  let filterRole   = '';
  let filterStatus = '';
  let search       = '';

  function filtered() {
    return users.filter(u => {
      if (filterRole   && u.role   !== filterRole)  return false;
      if (filterStatus && u.status !== filterStatus) return false;
      if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.username.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'name')   return a.name.localeCompare(b.name);
      if (sortBy === 'coins')  return b.coins - a.coins;
      if (sortBy === 'rank')   return b.rankLevel - a.rankLevel;
      if (sortBy === 'duties') return countDuties(b.id, slots) - countDuties(a.id, slots);
      return 0;
    });
  }

  // Role filter dropdown — only shown to base_manager
  const roleFilterHtml = isBaseManager ? `
    <select class="form-select" id="filter-role" style="max-width:160px">
      <option value="">All Roles</option>
      <option value="soldier">Soldiers</option>
      <option value="branch_manager">Branch Managers</option>
      <option value="base_manager">Base Managers</option>
    </select>` : '';

  container.innerHTML = `
    <div class="page-fade">
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fa-solid fa-users"></i> ${pageTitle}</div>
          <div class="page-subtitle">Manage personnel, ranks, and coin balances</div>
        </div>
        ${isBaseManager ? `<button class="btn btn-primary" id="btn-add-user"><i class="fa-solid fa-user-plus"></i> Add Soldier</button>` : ''}
      </div>

      <!-- Controls -->
      <div class="filter-bar" style="gap:10px;flex-wrap:wrap">
        <input class="form-input" id="search-users" placeholder="Search by name…" style="max-width:220px" value="${search}" />
        <select class="form-select" id="sort-users" style="max-width:160px">
          <option value="name"   ${sortBy==='name'  ?'selected':''}>Sort: Name</option>
          <option value="rank"   ${sortBy==='rank'  ?'selected':''}>Sort: Rank</option>
          <option value="coins"  ${sortBy==='coins' ?'selected':''}>Sort: Coins</option>
          <option value="duties" ${sortBy==='duties'?'selected':''}>Sort: Duties</option>
        </select>
        ${roleFilterHtml}
        <select class="form-select" id="filter-status" style="max-width:140px">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div class="user-grid" id="user-grid">
        ${renderGrid(filtered(), slots, isBaseManager)}
      </div>
    </div>`;

  const grid = container.querySelector('#user-grid');

  function refresh() {
    grid.innerHTML = renderGrid(filtered(), slots, isBaseManager);
    bindCardClicks(grid, user, container);
  }

  container.querySelector('#search-users').addEventListener('input', e => { search = e.target.value; refresh(); });
  container.querySelector('#sort-users').addEventListener('change', e   => { sortBy = e.target.value; refresh(); });
  container.querySelector('#filter-role')?.addEventListener('change', e  => { filterRole = e.target.value; refresh(); });
  container.querySelector('#filter-status').addEventListener('change', e => { filterStatus = e.target.value; refresh(); });

  isBaseManager && container.querySelector('#btn-add-user')?.addEventListener('click', () => openUserModal(null, container, user));
  bindCardClicks(grid, user, container);
}

function countDuties(userId, slots) {
  return slots.filter(s => s.assignedUserId === userId).length;
}

function renderGrid(users, slots, isBaseManager) {
  if (!users.length) return `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-user-slash"></i><h3>No personnel found</h3></div>`;
  return users.map(u => {
    const duties    = countDuties(u.id, slots);
    const completed = slots.filter(s => s.assignedUserId === u.id && s.status === 'completed').length;
    return `<div class="user-card" data-user-id="${u.id}">
      <div class="user-card-top">
        ${avatarHtml(u, 'avatar-lg')}
        <div class="user-card-info">
          <div class="user-card-name" title="${u.name}">${u.name}</div>
          <div class="user-card-rank-row">
            ${rankBadge(u)}
            ${roleBadge(u)}
            <span class="user-status-dot ${u.status==='active'?'':'inactive'}" title="${u.status}"></span>
          </div>
        </div>
      </div>
      <div class="user-card-stats">
        <div class="user-stat">
          <div class="user-stat-val">${coinDisplay(u.coins)}</div>
          <div class="user-stat-lbl">Total Coins</div>
        </div>
        <div class="user-stat">
          <div class="user-stat-val">${completed}</div>
          <div class="user-stat-lbl">Completed</div>
        </div>
        <div class="user-stat">
          <div class="user-stat-val">${duties}</div>
          <div class="user-stat-lbl">Total Duties</div>
        </div>
        <div class="user-stat">
          <div class="user-stat-val" style="font-size:.8rem;color:var(--text-dim)">${formatRelative(u.lastLogin)}</div>
          <div class="user-stat-lbl">Last Login</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function bindCardClicks(grid, user, container) {
  grid.querySelectorAll('[data-user-id]').forEach(card => {
    card.addEventListener('click', () => openUserDetail(card.dataset.userId, user, container));
  });
}

function openUserDetail(targetId, currentUser, container) {
  const users  = Users.get();
  const u      = users.find(x => x.id === targetId);
  if (!u) return;

  const isBaseManager   = currentUser.role === 'base_manager';
  const isBranchManager = currentUser.role === 'branch_manager';
  const canEdit         = isBaseManager || isBranchManager;

  const slots       = DutySlots.get();
  const types       = DutyTypes.get();
  const coinH       = CoinHistory.get().filter(c => c.userId === u.id);
  const mySlots     = slots.filter(s => s.assignedUserId === u.id);
  const upcoming    = mySlots.filter(s => s.status === 'assigned').slice(0, 3);
  const exemptTypes = (u.capabilities || []).map(tId => types.find(t => t.id === tId)?.name).filter(Boolean);

  openModal(`${u.name}`, `
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:12px">
      ${avatarHtml(u, 'avatar-lg')}
      <div>
        ${rankBadge(u)} ${roleBadge(u)}
        <div style="font-size:.8rem;color:var(--text-dim);margin-top:4px">@${u.username} · Joined ${formatDate(u.joinDate)}</div>
        <div style="font-size:.8rem;color:var(--text-dim)">Last login: ${formatRelative(u.lastLogin)}</div>
      </div>
      <div style="margin-left:auto">${coinDisplay(u.coins)}</div>
    </div>

    <div class="form-row form-row-2" style="margin-bottom:16px">
      <div class="user-stat"><div class="user-stat-val">${mySlots.filter(s=>s.status==='completed').length}</div><div class="user-stat-lbl">Completed Duties</div></div>
      <div class="user-stat"><div class="user-stat-val">${mySlots.filter(s=>s.status==='assigned').length}</div><div class="user-stat-lbl">Upcoming Duties</div></div>
    </div>

    ${upcoming.length ? `
      <div class="form-label">Upcoming Duties</div>
      ${upcoming.map(s => {
        const dt = types.find(t => t.id === s.typeId);
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span class="type-dot" style="background:${dt?.color||'#ccc'}"></span>
          <span>${dt?.name||'—'}</span>
          <span style="color:var(--text-dim);font-size:.8rem">${formatDate(s.date)} ${s.startTime}–${s.endTime}</span>
        </div>`;
      }).join('')}` : ''}

    ${exemptTypes.length ? `
      <div style="margin-top:12px">
        <div class="form-label">Active Exemptions</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          ${exemptTypes.map(n => `<span class="badge badge-rejected"><i class="fa-solid fa-ban"></i> ${n}</span>`).join('')}
        </div>
      </div>` : ''}

    ${coinH.length ? `
      <div style="margin-top:12px">
        <div class="form-label">Coin History (recent)</div>
        ${coinH.slice(0,4).map(c => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:.85rem">
            <span style="color:var(--text-muted)">${c.reason}</span>
            <span>${coinDisplay(c.amount)}</span>
          </div>`).join('')}
      </div>` : ''}`,
    canEdit ? [
      { label: 'Edit', cls: 'btn-secondary', action: 'edit', onClick: () => { closeModal(); openUserModal(targetId, container, currentUser); } },
      { label: 'Close', cls: 'btn-ghost', action: 'close', onClick: closeModal },
    ] : [
      { label: 'Close', cls: 'btn-ghost', action: 'close', onClick: closeModal },
    ], { size: 'lg' });
}

function openUserModal(id, container, currentUser) {
  const users           = Users.get();
  const types           = DutyTypes.get().filter(t => t.active);
  const u               = id ? users.find(x => x.id === id) : null;
  const isBranchManager = currentUser.role === 'branch_manager';

  // branch_manager editing an existing soldier can only adjust coins and exemptions
  const restrictedEdit = isBranchManager && !!id;

  openModal(u ? 'Edit Soldier' : 'Add Soldier', `
    <div class="form-row form-row-2">
      <div class="form-group"><label class="form-label required">Full Name</label><input class="form-input" id="um-name" value="${u?.name||''}" placeholder="e.g. Sgt. John Smith" ${restrictedEdit ? 'disabled' : ''} /></div>
      <div class="form-group"><label class="form-label required">Username</label><input class="form-input" id="um-user" value="${u?.username||''}" placeholder="login handle" ${restrictedEdit ? 'disabled' : ''} /></div>
    </div>
    ${!u ? `<div class="form-group"><label class="form-label required">Password</label><input class="form-input" id="um-pass" type="password" placeholder="Set initial password" /></div>` : ''}
    ${!restrictedEdit ? `
    <div class="form-row form-row-2">
      <div class="form-group">
        <label class="form-label required">Rank</label>
        <select class="form-select" id="um-rank">
          ${RANKS.map((r,i) => `<option value="${i}" ${u?.rankLevel===i?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Role</label>
        <select class="form-select" id="um-role">
          <option value="soldier"        ${u?.role==='soldier'       ?'selected':''}>Soldier</option>
          <option value="branch_manager" ${u?.role==='branch_manager'?'selected':''}>Branch Manager</option>
          <option value="base_manager"   ${u?.role==='base_manager'  ?'selected':''}>Base Manager</option>
        </select>
      </div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="um-status">
          <option value="active"   ${u?.status!=='inactive'?'selected':''}>Active</option>
          <option value="inactive" ${u?.status==='inactive'?'selected':''}>Inactive</option>
        </select>
      </div>
      ${u ? `<div class="form-group">
        <label class="form-label">Adjust Coins</label>
        <input class="form-input" id="um-coins" type="number" placeholder="+50 or -20" />
      </div>` : ''}
    </div>` : `
    <div class="form-group">
      <label class="form-label">Adjust Coins</label>
      <input class="form-input" id="um-coins" type="number" placeholder="+50 or -20" />
    </div>`}
    ${types.length ? `
    <div class="form-group">
      <label class="form-label">Duty Exemptions (soldier cannot be auto-matched for these)</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
        ${types.map(t => `
          <label class="toggle-group" style="background:var(--surface2);padding:6px 10px;border-radius:6px;border:1px solid var(--border)">
            <input type="checkbox" class="um-exempt" value="${t.id}" ${u?.capabilities?.includes(t.id)?'checked':''} />
            <span class="dot" style="background:${t.color}"></span>
            <span>${t.name}</span>
          </label>`).join('')}
      </div>
    </div>` : ''}
    <div id="um-err" class="form-error"></div>`,
    [
      { label: 'Cancel', cls: 'btn-ghost', action: 'cancel', onClick: closeModal },
      { label: u ? 'Save Changes' : 'Add Soldier', cls: 'btn-primary', action: 'save', onClick: () => saveUser(id, container, currentUser) },
    ], { size: 'lg' });
}

function saveUser(id, container, currentUser) {
  const isBranchManager = currentUser.role === 'branch_manager';
  const restrictedEdit  = isBranchManager && !!id;

  const name    = restrictedEdit ? null : document.getElementById('um-name')?.value.trim();
  const uname   = restrictedEdit ? null : document.getElementById('um-user')?.value.trim();
  const pass    = document.getElementById('um-pass')?.value;
  const rank    = restrictedEdit ? null : parseInt(document.getElementById('um-rank')?.value);
  const role    = restrictedEdit ? null : document.getElementById('um-role')?.value;
  const status  = restrictedEdit ? null : document.getElementById('um-status')?.value;
  const coinAdj = parseInt(document.getElementById('um-coins')?.value || 0);
  const exempts = [...document.querySelectorAll('.um-exempt:checked')].map(c => c.value);
  const err     = document.getElementById('um-err');

  if (!restrictedEdit) {
    if (!name)  { err.textContent = 'Name is required.'; return; }
    if (!uname) { err.textContent = 'Username is required.'; return; }
    if (!id && !pass) { err.textContent = 'Password is required for new users.'; return; }
  }

  const users = Users.get();

  if (id) {
    const i = users.findIndex(u => u.id === id);
    if (i !== -1) {
      const coinDelta = isNaN(coinAdj) ? 0 : coinAdj;

      if (restrictedEdit) {
        // branch_manager: only update coins and exemptions
        users[i] = { ...users[i], capabilities: exempts };
      } else {
        users[i] = { ...users[i], name, username: uname, rankLevel: rank, rank: RANKS[rank], role, status, capabilities: exempts };
      }

      if (coinDelta !== 0) {
        users[i].coins = Math.max(0, users[i].coins + coinDelta);
        const ch = CoinHistory.get();
        ch.push({ id: getId(), userId: id, amount: coinDelta, reason: `Manual adjustment by ${currentUser.name}`, dutySlotId: null, date: new Date().toISOString() });
        CoinHistory.set(ch);
      }

      Users.set(users);
      showToast('Soldier updated.', 'success');
    }
  } else {
    if (users.some(u => u.username === uname)) { err.textContent = 'Username already exists.'; return; }
    const newUser = {
      id: getId(),
      username: uname,
      password: pass,
      name,
      role,
      rank: RANKS[rank],
      rankLevel: rank,
      coins: 0,
      capabilities: exempts,
      lastLogin: null,
      status,
      joinDate: new Date().toISOString().slice(0, 10),
    };
    users.push(newUser);
    Users.set(users);
    addActivity(`New soldier added: ${name}`, 'fa-user-plus', 'info');
    showToast('Soldier added!', 'success');
  }
  closeModal();
  drawPage(container, currentUser);
}
