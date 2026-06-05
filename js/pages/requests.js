// requests.js — Request submission and management
import { Requests, DutySlots, DutyTypes, Users, getId, addActivity } from '../data.js';
import { formatDate, formatRelative, getDutyType, getUser, avatarHtml, rankBadge, statusBadge, coinDisplay } from '../utils/helpers.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderRequests(container, user) {
  checkExpiredExemptions();
  drawPage(container, user);
}

// Remove capabilities whose exemption has passed its expiry date
function checkExpiredExemptions() {
  const today    = new Date().toISOString().slice(0,10);
  const users    = Users.get();
  const requests = Requests.get();
  let   changed  = false;

  requests.filter(r => r.status === 'approved' && r.type === 'exemption' && r.expiryDate && r.expiryDate < today).forEach(r => {
    const ui = users.findIndex(u => u.id === r.userId);
    if (ui !== -1 && Array.isArray(users[ui].capabilities) && r.dutyTypeId) {
      users[ui].capabilities = users[ui].capabilities.filter(id => id !== r.dutyTypeId);
      changed = true;
    }
    // Mark as expired
    const ri = requests.findIndex(x => x.id === r.id);
    if (ri !== -1) requests[ri].status = 'rejected';
  });
  if (changed) { Users.set(users); Requests.set(requests); }
}

function drawPage(container, user) {
  const isBaseManager   = user.role === 'base_manager';
  const isBranchManager = user.role === 'branch_manager';
  const canReview       = isBaseManager || isBranchManager;

  const allReqs = Requests.get();
  const myReqs  = allReqs.filter(r => r.userId === user.id);

  // Scope requests visible to the reviewer
  let scopedReqs;
  if (isBaseManager) {
    scopedReqs = allReqs;
  } else if (isBranchManager) {
    const branchSoldierIds = Users.get()
      .filter(u => u.branchId === user.branchId && u.role === 'soldier')
      .map(u => u.id);
    scopedReqs = allReqs.filter(r => branchSoldierIds.includes(r.userId));
  } else {
    scopedReqs = myReqs;
  }

  const pendingScoped = scopedReqs.filter(r => r.status === 'pending' && r.userId !== user.id);

  // Page subtitle varies by role
  let subtitle;
  if (isBaseManager) {
    subtitle = 'Review all requests across every branch';
  } else if (isBranchManager) {
    subtitle = 'Review requests from your branch soldiers';
  } else {
    subtitle = 'Submit duty-change and exemption requests';
  }

  // Build tabs HTML
  let tabsHtml;
  if (isBaseManager) {
    tabsHtml = `
      <div class="tabs" id="req-tabs">
        <button class="tab-btn active" data-tab="all">
          All Requests ${pendingScoped.length ? `<span class="nav-badge" style="display:inline-flex;margin-left:6px">${pendingScoped.length}</span>` : ''}
        </button>
        <button class="tab-btn" data-tab="mine">My Requests</button>
      </div>
      <div id="req-all-content">${renderRequestList(scopedReqs, user, canReview, true)}</div>
      <div id="req-mine-content" style="display:none">${renderRequestList(myReqs, user, false, false)}</div>`;
  } else if (isBranchManager) {
    tabsHtml = `
      <div class="tabs" id="req-tabs">
        <button class="tab-btn active" data-tab="all">
          Branch Requests ${pendingScoped.length ? `<span class="nav-badge" style="display:inline-flex;margin-left:6px">${pendingScoped.length}</span>` : ''}
        </button>
        <button class="tab-btn" data-tab="mine">My Requests</button>
      </div>
      <div id="req-all-content">${renderRequestList(scopedReqs, user, canReview, true)}</div>
      <div id="req-mine-content" style="display:none">${renderRequestList(myReqs, user, false, false)}</div>`;
  } else {
    tabsHtml = `<div id="req-mine-content">${renderRequestList(myReqs, user, false, false)}</div>`;
  }

  container.innerHTML = `
    <div class="page-fade">
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fa-solid fa-inbox"></i> Requests</div>
          <div class="page-subtitle">${subtitle}</div>
        </div>
        <button class="btn btn-primary" id="btn-submit-req"><i class="fa-solid fa-plus"></i> Submit Request</button>
      </div>
      ${tabsHtml}
    </div>`;

  container.querySelector('#btn-submit-req').addEventListener('click', () => openSubmitModal(user, container));

  if (canReview) {
    container.querySelectorAll('#req-tabs .tab-btn').forEach(b => b.addEventListener('click', () => {
      container.querySelectorAll('#req-tabs .tab-btn').forEach(x => x.classList.toggle('active', x === b));
      container.querySelector('#req-all-content').style.display  = b.dataset.tab === 'all'  ? '' : 'none';
      container.querySelector('#req-mine-content').style.display = b.dataset.tab === 'mine' ? '' : 'none';
    }));
  }

  bindRequestActions(container, user);
}

function renderRequestList(reqs, user, canReview, showUserName) {
  const sorted = [...reqs].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  if (!sorted.length) return `
    <div class="empty-state">
      <i class="fa-solid fa-inbox"></i>
      <h3>No requests yet</h3>
      <p>${canReview ? 'No requests have been submitted.' : 'You have not submitted any requests.'}</p>
    </div>`;

  return `<div style="display:flex;flex-direction:column;gap:12px">${sorted.map(r => renderCard(r, user, canReview, showUserName)).join('')}</div>`;
}

function renderCard(r, user, canReview, showUserName) {
  const reqUser = getUser(r.userId);
  const dt      = r.dutyTypeId ? getDutyType(r.dutyTypeId) : null;

  return `<div class="request-card" data-req-id="${r.id}">
    <div class="request-card-header">
      ${showUserName && reqUser ? `<div class="flex items-center gap-sm">${avatarHtml(reqUser,'avatar-sm')}<div>${reqUser.name}</div></div>` : ''}
      <div class="request-card-title">${r.title}</div>
      <span class="badge ${r.type==='exemption'?'badge-warning':'badge-info'}" style="${r.type==='exemption'?'color:var(--warning)':'color:var(--info)'}">${r.type==='exemption'?'Exemption':'Duty Change'}</span>
      ${statusBadge(r.status)}
    </div>
    <div class="request-card-body">${r.description}</div>
    <div class="request-card-meta">
      <span><i class="fa-solid fa-clock"></i> Submitted ${formatRelative(r.createdAt)}</span>
      ${dt ? `<span><i class="fa-solid fa-tag"></i> ${dt.name}</span>` : ''}
      ${r.expiryDate ? `<span><i class="fa-solid fa-calendar-xmark"></i> Expires ${formatDate(r.expiryDate)}</span>` : ''}
      ${r.reviewedAt ? `<span><i class="fa-solid fa-check-circle"></i> Reviewed ${formatRelative(r.reviewedAt)}</span>` : ''}
    </div>
    ${r.reviewNotes ? `<div style="margin-top:8px;padding:8px 10px;background:var(--surface2);border-radius:6px;font-size:.82rem;color:var(--text-muted)"><strong>Review notes:</strong> ${r.reviewNotes}</div>` : ''}
    ${canReview && r.status === 'pending' ? `
      <div class="request-card-actions">
        <textarea class="review-notes" data-notes-for="${r.id}" placeholder="Optional review notes…" rows="1"></textarea>
        <button class="btn btn-primary btn-sm"  data-approve-req="${r.id}"><i class="fa-solid fa-check"></i> Approve</button>
        <button class="btn btn-danger  btn-sm"  data-reject-req="${r.id}"><i class="fa-solid fa-xmark"></i> Reject</button>
      </div>` : ''}
  </div>`;
}

function bindRequestActions(container, user) {
  container.querySelectorAll('[data-approve-req]').forEach(b => b.addEventListener('click', () => {
    const notes = container.querySelector(`[data-notes-for="${b.dataset.approveReq}"]`)?.value || '';
    reviewRequest(b.dataset.approveReq, 'approved', notes, user, container);
  }));
  container.querySelectorAll('[data-reject-req]').forEach(b => b.addEventListener('click', () => {
    const notes = container.querySelector(`[data-notes-for="${b.dataset.rejectReq}"]`)?.value || '';
    reviewRequest(b.dataset.rejectReq, 'rejected', notes, user, container);
  }));
}

function reviewRequest(reqId, decision, notes, user, container) {
  const reqs = Requests.get();
  const idx  = reqs.findIndex(r => r.id === reqId);
  if (idx === -1) return;

  const r = reqs[idx];
  reqs[idx].status     = decision;
  reqs[idx].reviewedAt = new Date().toISOString();
  reqs[idx].reviewNotes= notes;
  Requests.set(reqs);

  // Apply exemption if approved
  if (decision === 'approved' && r.type === 'exemption' && r.dutyTypeId) {
    const users = Users.get();
    const ui    = users.findIndex(u => u.id === r.userId);
    if (ui !== -1) {
      if (!Array.isArray(users[ui].capabilities)) users[ui].capabilities = [];
      if (!users[ui].capabilities.includes(r.dutyTypeId)) {
        users[ui].capabilities.push(r.dutyTypeId);
        Users.set(users);
      }
    }
    addActivity(`Exemption approved for ${getUser(r.userId)?.name}: ${getDutyType(r.dutyTypeId)?.name}`, 'fa-shield-halved', 'info');
  }

  addActivity(`Request "${r.title}" ${decision} by ${user.name}`, decision==='approved'?'fa-check-circle':'fa-xmark', decision==='approved'?'success':'info');
  showToast(`Request ${decision}.`, decision === 'approved' ? 'success' : 'info');
  drawPage(container, user);
}

function openSubmitModal(user, container) {
  const types   = DutyTypes.get().filter(t => t.active);
  const mySlots = DutySlots.get().filter(s => s.assignedUserId === user.id && s.status === 'assigned');

  openModal('Submit Request', `
    <div class="form-group">
      <label class="form-label required">Request Type</label>
      <select class="form-select" id="rq-type">
        <option value="duty_change">Duty Change Request</option>
        <option value="exemption">Exemption Request (medical / personal)</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label required">Title</label>
      <input class="form-input" id="rq-title" placeholder="Brief description of your request" />
    </div>
    <div class="form-group" id="rq-duty-wrap">
      <label class="form-label">Select Duty (for duty change)</label>
      <select class="form-select" id="rq-duty">
        <option value="">— Not applicable —</option>
        ${mySlots.map(s => {
          const dt = getDutyType(s.typeId);
          return `<option value="${s.id}">${dt?.name||'?'} on ${formatDate(s.date)} ${s.startTime}–${s.endTime}</option>`;
        }).join('')}
      </select>
    </div>
    <div class="form-group" id="rq-exempttype-wrap" style="display:none">
      <label class="form-label required">Duty Type to Exempt From</label>
      <select class="form-select" id="rq-exempttype">
        ${types.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" id="rq-expiry-wrap" style="display:none">
      <label class="form-label required">Exemption Expiry Date</label>
      <input class="form-input" id="rq-expiry" type="date" />
    </div>
    <div class="form-group">
      <label class="form-label required">Description / Reason</label>
      <textarea class="form-textarea" id="rq-desc" rows="3" placeholder="Explain your request…"></textarea>
    </div>
    <div id="rq-err" class="form-error"></div>`,
    [
      { label: 'Cancel', cls: 'btn-ghost', action: 'cancel', onClick: closeModal },
      { label: 'Submit Request', cls: 'btn-primary', action: 'submit', onClick: () => submitRequest(user, container) },
    ], { size: 'lg' });

  document.getElementById('rq-type').addEventListener('change', e => {
    const isEx = e.target.value === 'exemption';
    document.getElementById('rq-duty-wrap').style.display       = isEx ? 'none' : '';
    document.getElementById('rq-exempttype-wrap').style.display = isEx ? '' : 'none';
    document.getElementById('rq-expiry-wrap').style.display     = isEx ? '' : 'none';
  });
}

function submitRequest(user, container) {
  const type       = document.getElementById('rq-type').value;
  const title      = document.getElementById('rq-title').value.trim();
  const desc       = document.getElementById('rq-desc').value.trim();
  const dutySlotId = document.getElementById('rq-duty')?.value || null;
  const exemptType = document.getElementById('rq-exempttype')?.value || null;
  const expiry     = document.getElementById('rq-expiry')?.value || null;
  const err        = document.getElementById('rq-err');

  if (!title) { err.textContent = 'Title is required.'; return; }
  if (!desc)  { err.textContent = 'Description is required.'; return; }
  if (type === 'exemption' && !expiry) { err.textContent = 'Expiry date is required for exemptions.'; return; }

  const reqs = Requests.get();
  reqs.push({
    id: getId(),
    userId:      user.id,
    type,
    title,
    description: desc,
    dutySlotId:  type === 'duty_change' ? dutySlotId : null,
    dutyTypeId:  type === 'exemption'   ? exemptType  : null,
    expiryDate:  expiry,
    status:      'pending',
    createdAt:   new Date().toISOString(),
    reviewedAt:  null,
    reviewNotes: '',
  });
  Requests.set(reqs);
  addActivity(`${user.name} submitted a request: ${title}`, 'fa-inbox', 'info');
  closeModal();
  showToast('Request submitted!', 'success');
  drawPage(container, user);
}
