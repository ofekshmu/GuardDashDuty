// duty-market.js — Duty trading marketplace
import { TradeOffers, DutySlots, DutyTypes, Users, Branches, getId, addActivity } from '../data.js';
import { formatDate, formatRelative, getDutyType, getUser, avatarHtml, rankBadge, statusBadge, coinDisplay, timeToMinutes } from '../utils/helpers.js';
import { openModal, closeModal, confirmDialog } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderMarket(container, user) {
  drawPage(container, user);
}

/**
 * Returns the pending_approval offers visible to the given user based on role.
 *   base_manager   — sees ALL pending_approval trades
 *   branch_manager — sees pending_approval trades where at least one party is in their branch
 *   soldier / other — sees none
 */
function getPendingForUser(offers, user, allUsers) {
  const pending = offers.filter(o => o.status === 'pending_approval');
  if (user.role === 'base_manager') return pending;
  if (user.role === 'branch_manager') {
    return pending.filter(o => {
      const offerer  = allUsers.find(u => u.id === o.offerUserId);
      const accepter = allUsers.find(u => u.id === o.acceptedByUserId);
      return offerer?.branchId === user.branchId || accepter?.branchId === user.branchId;
    });
  }
  return [];
}

function drawPage(container, user) {
  const isBaseManager   = user.role === 'base_manager';
  const isBranchManager = user.role === 'branch_manager';
  const canReview       = isBaseManager || isBranchManager;

  const allUsers       = Users.get();
  const offers         = TradeOffers.get();
  const myOffers       = offers.filter(o => o.offerUserId === user.id);
  const open           = offers.filter(o => o.status === 'open' && o.offerUserId !== user.id);
  const pendingForUser = getPendingForUser(offers, user, allUsers);

  // Always show the Pending Approval tab for reviewers (even at count 0, for visibility)
  const showPendingTab = canReview;

  container.innerHTML = `
    <div class="page-fade">
      <div class="page-header">
        <div>
          <div class="page-title"><i class="fa-solid fa-store"></i> Duty Market</div>
          <div class="page-subtitle">Trade guard duties with other personnel</div>
        </div>
        <button class="btn btn-primary" id="btn-post-trade"><i class="fa-solid fa-plus"></i> Post Trade</button>
      </div>

      <div class="tabs" id="market-tabs">
        <button class="tab-btn active" data-tab="open">
          Open Market <span style="color:var(--text-dim);font-size:.8rem">(${open.length})</span>
        </button>
        <button class="tab-btn" data-tab="mine">
          My Offers <span style="color:var(--text-dim);font-size:.8rem">(${myOffers.length})</span>
        </button>
        ${showPendingTab ? `<button class="tab-btn" data-tab="pending">
          Pending Approval ${pendingForUser.length
            ? `<span class="nav-badge" style="display:inline-flex;margin-left:6px">${pendingForUser.length}</span>`
            : `<span style="color:var(--text-dim);font-size:.8rem">(0)</span>`}
        </button>` : ''}
      </div>

      <div id="tab-open"    class="tab-pane">${renderOfferGrid(open,            user, 'open',    allUsers)}</div>
      <div id="tab-mine"    class="tab-pane" style="display:none">${renderOfferGrid(myOffers,      user, 'mine',    allUsers)}</div>
      ${showPendingTab ? `<div id="tab-pending" class="tab-pane" style="display:none">${renderOfferGrid(pendingForUser, user, 'pending', allUsers)}</div>` : ''}
    </div>`;

  container.querySelector('#btn-post-trade').addEventListener('click', () => openPostModal(user, container));

  container.querySelectorAll('#market-tabs .tab-btn').forEach(b => b.addEventListener('click', () => {
    container.querySelectorAll('#market-tabs .tab-btn').forEach(x => x.classList.toggle('active', x === b));
    container.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');
    const pane = container.querySelector(`#tab-${b.dataset.tab}`);
    if (pane) pane.style.display = '';
  }));

  bindOfferActions(container, user);
}

function renderOfferGrid(offers, user, context, allUsers) {
  if (!offers.length) {
    const msgs = {
      open:    'No open trades at the moment. Post one to get started!',
      mine:    'You have not posted any trade offers yet.',
      pending: 'No trades awaiting approval.',
    };
    return `<div class="empty-state"><i class="fa-solid fa-store"></i><h3>No offers</h3><p>${msgs[context] || ''}</p></div>`;
  }
  return `<div class="offer-grid">${offers.map(o => renderOfferCard(o, user, context, allUsers)).join('')}</div>`;
}

function renderOfferCard(o, user, context, allUsers) {
  const offerer    = getUser(o.offerUserId);
  const offeredDts = (o.offeredDutyIds || []).map(id => {
    const s = DutySlots.get().find(x => x.id === id);
    return s ? getDutyType(s.typeId) : null;
  }).filter(Boolean);

  const wantedDts = (o.requestedDutyIds || []).map(id => {
    const s = DutySlots.get().find(x => x.id === id);
    return s ? getDutyType(s.typeId) : null;
  }).filter(Boolean);

  const compat = context === 'open' ? checkCompat(o, user) : null;

  let actions = '';
  if (context === 'open') {
    actions = `<button class="btn btn-primary btn-sm" data-accept-offer="${o.id}"><i class="fa-solid fa-handshake"></i> Accept</button>`;
  } else if (context === 'mine' && o.status === 'open') {
    actions = `<button class="btn btn-danger btn-sm" data-cancel-offer="${o.id}"><i class="fa-solid fa-xmark"></i> Cancel</button>`;
  } else if (context === 'pending') {
    actions = `
      <button class="btn btn-primary btn-sm" data-mgr-approve="${o.id}"><i class="fa-solid fa-check"></i> Approve</button>
      <button class="btn btn-danger  btn-sm" data-mgr-reject="${o.id}"><i class="fa-solid fa-xmark"></i> Reject</button>`;
  }

  const offeredSlots = (o.offeredDutyIds || []).map(id => DutySlots.get().find(s => s.id === id)).filter(Boolean);

  // For pending context: show which branch each party belongs to
  let partiesLine = '';
  if (context === 'pending') {
    const branches     = Branches.get();
    const users        = allUsers || Users.get();
    const offererUser  = users.find(u => u.id === o.offerUserId);
    const accepterUser = o.acceptedByUserId ? users.find(u => u.id === o.acceptedByUserId) : null;
    const offererBranch  = offererUser?.branchId
      ? (branches.find(b => b.id === offererUser.branchId)?.name  || offererUser.branchId)
      : 'Base';
    const accepterBranch = accepterUser?.branchId
      ? (branches.find(b => b.id === accepterUser.branchId)?.name || accepterUser.branchId)
      : (accepterUser ? 'Base' : '—');
    partiesLine = `<div class="offer-parties-line" style="font-size:.78rem;color:var(--text-dim);margin-top:6px">
      <i class="fa-solid fa-code-branch" style="margin-right:4px"></i>
      Parties: <strong>${offererBranch}</strong> <i class="fa-solid fa-right-left" style="margin:0 4px"></i> <strong>${accepterBranch}</strong>
    </div>`;
  }

  return `<div class="offer-card">
    <div class="offer-card-header">
      <div class="offer-user">
        ${avatarHtml(offerer, 'avatar-sm')}
        <div class="offer-user-info">
          <div class="offer-user-name">${offerer?.name || '—'}</div>
          <div class="offer-user-meta">${rankBadge(offerer || {})} · ${coinDisplay(offerer?.coins || 0)}</div>
        </div>
      </div>
      ${statusBadge(o.status)}
    </div>
    <div class="offer-card-body">
      <div>
        <div class="offer-section-label"><i class="fa-solid fa-arrow-right-from-bracket"></i> Offering</div>
        <div class="offer-duties">
          ${offeredSlots.map(s => {
            const dt = getDutyType(s.typeId);
            return dt ? `<span class="offer-duty-chip" style="background:${dt.color}" title="${formatDate(s.date)} ${s.startTime}–${s.endTime}">${dt.name} · ${formatDate(s.date)}</span>` : '';
          }).join('')}
        </div>
      </div>
      <div>
        <div class="offer-section-label"><i class="fa-solid fa-arrow-right-to-bracket"></i> Wants in Return</div>
        <div class="offer-duties">
          ${o.requestedDutyIds?.length
            ? wantedDts.map(dt => `<span class="offer-duty-chip" style="background:${dt.color}">${dt.name}</span>`).join('')
            : '<span style="color:var(--text-dim);font-size:.82rem">Open to any offer</span>'}
        </div>
      </div>
      ${o.message ? `<div class="offer-message">"${o.message}"</div>` : ''}
      ${compat ? `<div class="compat-badges">${compat.map(c => `<span class="compat-badge compat-${c.ok ? 'ok' : 'fail'}">${c.label}</span>`).join('')}</div>` : ''}
      ${partiesLine}
    </div>
    <div class="offer-card-footer">
      <span style="font-size:.75rem;color:var(--text-dim)">${formatRelative(o.createdAt)}</span>
      ${actions}
    </div>
  </div>`;
}

function checkCompat(offer, user) {
  const checks = [];
  const slots  = DutySlots.get();
  const types  = DutyTypes.get();

  // Check offered duties: user has required rank
  (offer.offeredDutyIds || []).forEach(id => {
    const s  = slots.find(x => x.id === id);
    const dt = s ? types.find(t => t.id === s.typeId) : null;
    if (dt) {
      const ok = user.rankLevel >= dt.requiredRankLevel;
      checks.push({ label: `Rank: ${dt.name}`, ok });
    }
  });

  // Check no exemption conflicts
  (offer.offeredDutyIds || []).forEach(id => {
    const s = slots.find(x => x.id === id);
    if (s && Array.isArray(user.capabilities) && user.capabilities.includes(s.typeId)) {
      checks.push({ label: 'No exemption conflict', ok: false });
    }
  });

  // Check schedule conflict
  const userSlots = slots.filter(s => s.assignedUserId === user.id);
  const hasConflict = (offer.offeredDutyIds || []).some(id => {
    const offered = slots.find(x => x.id === id);
    if (!offered) return false;
    return userSlots.some(s => {
      if (s.date !== offered.date) return false;
      const aS = timeToMinutes(s.startTime);
      const aE = s.endTime === '00:00' ? 24 * 60 : timeToMinutes(s.endTime);
      const bS = timeToMinutes(offered.startTime);
      const bE = offered.endTime === '00:00' ? 24 * 60 : timeToMinutes(offered.endTime);
      return bS < aE && bE > aS;
    });
  });
  if (offer.offeredDutyIds?.length) checks.push({ label: 'No schedule conflict', ok: !hasConflict });

  return checks;
}

function bindOfferActions(container, user) {
  container.querySelectorAll('[data-accept-offer]').forEach(b => b.addEventListener('click', () => acceptOffer(b.dataset.acceptOffer, user, container)));
  container.querySelectorAll('[data-cancel-offer]').forEach(b => b.addEventListener('click', () => {
    confirmDialog('Cancel this trade offer?', () => {
      const offers = TradeOffers.get();
      const i      = offers.findIndex(o => o.id === b.dataset.cancelOffer);
      if (i !== -1) { offers[i].status = 'cancelled'; TradeOffers.set(offers); }
      showToast('Trade offer cancelled.', 'info');
      drawPage(container, user);
    }, 'Cancel Offer', 'btn-danger');
  }));
  container.querySelectorAll('[data-mgr-approve]').forEach(b => b.addEventListener('click', () => managerReview(b.dataset.mgrApprove, 'approved', user, container)));
  container.querySelectorAll('[data-mgr-reject]').forEach(b  => b.addEventListener('click', () => managerReview(b.dataset.mgrReject,  'rejected', user, container)));
}

function acceptOffer(offerId, user, container) {
  const offers = TradeOffers.get();
  const offer  = offers.find(o => o.id === offerId);
  if (!offer) return;

  // Compat check
  const compat = checkCompat(offer, user);
  const failed = compat.filter(c => !c.ok);
  if (failed.length) {
    showToast(`Cannot accept: ${failed.map(c => c.label).join(', ')}`, 'error');
    return;
  }

  // Move to pending approval
  const i = offers.findIndex(o => o.id === offerId);
  offers[i].status           = 'pending_approval';
  offers[i].acceptedByUserId = user.id;
  offers[i].acceptedAt       = new Date().toISOString();
  TradeOffers.set(offers);

  addActivity(`${user.name} accepted trade offer from ${getUser(offer.offerUserId)?.name}`, 'fa-handshake', 'info');
  showToast('Trade offer accepted! Awaiting manager approval.', 'success');
  drawPage(container, user);
}

/**
 * Called by both base_manager and branch_manager to approve or reject a pending trade.
 * The swap logic is identical regardless of which reviewer role triggers it.
 */
function managerReview(offerId, decision, user, container) {
  const offers = TradeOffers.get();
  const idx    = offers.findIndex(o => o.id === offerId);
  if (idx === -1) return;

  const offer        = offers[idx];
  offers[idx].status     = decision === 'approved' ? 'completed' : 'rejected';
  offers[idx].reviewedAt = new Date().toISOString();
  TradeOffers.set(offers);

  if (decision === 'approved') {
    // Swap duty assignments
    const slots   = DutySlots.get();
    const offerer = offer.offerUserId;
    const taker   = offer.acceptedByUserId;

    (offer.offeredDutyIds || []).forEach(id => {
      const i = slots.findIndex(s => s.id === id);
      if (i !== -1) slots[i].assignedUserId = taker;
    });
    (offer.requestedDutyIds || []).forEach(id => {
      const i = slots.findIndex(s => s.id === id);
      if (i !== -1) slots[i].assignedUserId = offerer;
    });
    DutySlots.set(slots);

    addActivity(`Trade approved by ${user.name}: duties swapped between ${getUser(offerer)?.name} and ${getUser(taker)?.name}`, 'fa-rotate', 'success');
    showToast('Trade approved! Duties swapped.', 'success');
  } else {
    showToast('Trade rejected.', 'info');
  }

  drawPage(container, user);
}

function openPostModal(user, container) {
  const slots    = DutySlots.get().filter(s => s.assignedUserId === user.id && s.status === 'assigned');
  const allSlots = DutySlots.get();
  // Only soldiers can be trade partners — managers do not participate as traders
  const users    = Users.get().filter(u => u.id !== user.id && u.role === 'soldier' && u.status === 'active');

  if (!slots.length) {
    showToast('You have no assigned duties to offer.', 'warning');
    return;
  }

  openModal('Post Trade Offer', `
    <div class="form-group">
      <label class="form-label required">Duty to Offer</label>
      <select class="form-select" id="pt-offered">
        ${slots.map(s => {
          const dt = getDutyType(s.typeId);
          return `<option value="${s.id}">${dt?.name || '?'} — ${formatDate(s.date)} ${s.startTime}–${s.endTime}</option>`;
        }).join('')}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Target User (optional — leave blank for open offer)</label>
      <select class="form-select" id="pt-target-user">
        <option value="">— Open to anyone —</option>
        ${users.map(u => `<option value="${u.id}">${u.name} (${u.rank})</option>`).join('')}
      </select>
    </div>

    <div class="form-group" id="pt-wanted-wrap" style="display:none">
      <label class="form-label">Their Duties You Want (optional)</label>
      <select class="form-select" id="pt-target-slot-select">
        <option value="">— Select target user first —</option>
      </select>
      <div id="pt-selected-duties" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
    </div>

    <div class="form-group">
      <label class="form-label">Message</label>
      <textarea class="form-textarea" id="pt-msg" rows="2" placeholder="Optional message to accompany your offer…"></textarea>
    </div>
    <div id="pt-err" class="form-error"></div>`,
    [
      { label: 'Cancel',     cls: 'btn-ghost',   action: 'cancel', onClick: closeModal },
      { label: 'Post Offer', cls: 'btn-primary',  action: 'post',   onClick: () => postTrade(user, container) },
    ], { size: 'lg' });

  const targetSel     = document.getElementById('pt-target-user');
  const wantedWrap    = document.getElementById('pt-wanted-wrap');
  const targetSlotSel = document.getElementById('pt-target-slot-select');
  const selectedDivs  = document.getElementById('pt-selected-duties');
  const selectedIds   = [];

  targetSel.addEventListener('change', () => {
    const targetId = targetSel.value;
    if (targetId) {
      wantedWrap.style.display = '';
      const targetSlots = allSlots.filter(s => s.assignedUserId === targetId && s.status === 'assigned');
      targetSlotSel.innerHTML = `<option value="">— Select a duty to request —</option>` +
        targetSlots.map(s => {
          const dt = getDutyType(s.typeId);
          return `<option value="${s.id}">${dt?.name || '?'} — ${formatDate(s.date)} ${s.startTime}–${s.endTime}</option>`;
        }).join('');
    } else {
      wantedWrap.style.display = 'none';
      selectedIds.length = 0;
      selectedDivs.innerHTML = '';
    }
  });

  targetSlotSel.addEventListener('change', () => {
    const val = targetSlotSel.value;
    if (val && !selectedIds.includes(val)) {
      selectedIds.push(val);
      const s  = allSlots.find(x => x.id === val);
      const dt = s ? getDutyType(s.typeId) : null;
      if (dt) {
        const chip = document.createElement('span');
        chip.className = 'offer-duty-chip';
        chip.style.background = dt.color;
        chip.style.cursor = 'pointer';
        chip.title = 'Click to remove';
        chip.textContent = `${dt.name} · ${formatDate(s.date)}`;
        chip.addEventListener('click', () => {
          const i = selectedIds.indexOf(val);
          if (i !== -1) selectedIds.splice(i, 1);
          chip.remove();
        });
        selectedDivs.appendChild(chip);
      }
      targetSlotSel.value = '';
    }
  });

  // Store selectedIds reference on modal so postTrade can read it
  document.getElementById('pt-target-user')._selectedIds = selectedIds;
}

function postTrade(user, container) {
  const offeredId = document.getElementById('pt-offered').value;
  const targetId  = document.getElementById('pt-target-user').value || null;
  const wantedIds = document.getElementById('pt-target-user')._selectedIds || [];
  const msg       = document.getElementById('pt-msg').value.trim();
  const err       = document.getElementById('pt-err');

  if (!offeredId) { err.textContent = 'Select a duty to offer.'; return; }

  const offers = TradeOffers.get();
  offers.push({
    id:                  getId(),
    offerUserId:         user.id,
    offeredDutyIds:      [offeredId],
    requestedFromUserId: targetId,
    requestedDutyIds:    [...wantedIds],
    message:             msg,
    status:              'open',
    createdAt:           new Date().toISOString(),
    acceptedByUserId:    null,
    acceptedAt:          null,
    reviewedAt:          null,
  });
  TradeOffers.set(offers);

  addActivity(`${user.name} posted a trade offer`, 'fa-store', 'info');
  closeModal();
  showToast('Trade offer posted!', 'success');
  drawPage(container, user);
}
