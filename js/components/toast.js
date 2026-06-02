// toast.js — Slide-in toast notifications
let _seq = 0;

export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const id = `toast-${++_seq}`;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const icon  = icons[type] || icons.info;

  const el = document.createElement('div');
  el.id        = id;
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fa-solid ${icon} toast-icon"></i><span class="toast-msg">${message}</span><button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>`;

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));

  const remove = () => {
    el.classList.remove('visible');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  };

  el.querySelector('.toast-close').addEventListener('click', remove);
  setTimeout(remove, duration);
}
