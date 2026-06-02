// modal.js — Reusable modal system
let _onClose = null;

export function openModal(title, bodyHtml, buttons = [], opts = {}) {
  const overlay = document.getElementById('modal-overlay');
  const size    = opts.size || '';   // 'lg', 'xl', or ''
  const id      = opts.id  || 'app-modal';

  overlay.innerHTML = `
    <div class="modal ${size ? 'modal-' + size : ''}" id="${id}" role="dialog" aria-modal="true" aria-labelledby="modal-title-${id}">
      <div class="modal-header">
        <h2 class="modal-title" id="modal-title-${id}">${title}</h2>
        <button class="icon-btn modal-close-btn" id="modal-x-btn" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${buttons.length ? `<div class="modal-footer">${buttons.map(b =>
        `<button class="btn ${b.cls || 'btn-ghost'}" data-modal-action="${b.action || ''}">${b.label}</button>`
      ).join('')}</div>` : ''}
    </div>`;

  overlay.classList.add('active');
  overlay.querySelector('#modal-x-btn').addEventListener('click', closeModal);

  // Action buttons
  overlay.querySelectorAll('[data-modal-action]').forEach(btn => {
    const action = btn.dataset.modalAction;
    const def    = buttons.find(b => b.action === action);
    if (def && def.onClick) btn.addEventListener('click', () => def.onClick(btn));
  });

  // Close on backdrop click (not on modal itself)
  overlay.addEventListener('mousedown', _backdropClose);

  if (typeof opts.onClose === 'function') _onClose = opts.onClose;
  else _onClose = null;

  // Focus trap
  const firstFocusable = overlay.querySelector('input, select, textarea, button');
  if (firstFocusable) firstFocusable.focus();
}

function _backdropClose(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('active');
  overlay.innerHTML = '';
  overlay.removeEventListener('mousedown', _backdropClose);
  if (_onClose) { _onClose(); _onClose = null; }
}

// Shorthand confirm dialog
export function confirmDialog(message, onConfirm, confirmLabel = 'Confirm', confirmCls = 'btn-danger') {
  openModal('Confirm Action', `<p class="confirm-msg">${message}</p>`, [
    { label: 'Cancel',       cls: 'btn-ghost',   action: 'cancel',  onClick: closeModal },
    { label: confirmLabel,   cls: confirmCls,     action: 'confirm', onClick: () => { closeModal(); onConfirm(); } },
  ]);
}
