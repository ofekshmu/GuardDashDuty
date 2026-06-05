// auth.js — Authentication helpers and login modal
import { Users, addActivity } from './data.js';
import { showToast } from './components/toast.js';

const SESSION_KEY = 'gdd_session';

export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { userId } = JSON.parse(raw);
    return Users.get().find(u => u.id === userId) || null;
  } catch { return null; }
}

export function setCurrentUser(user) {
  if (!user) { sessionStorage.removeItem(SESSION_KEY); return; }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  const users = Users.get();
  const idx   = users.findIndex(u => u.id === user.id);
  if (idx !== -1) { users[idx].lastLogin = new Date().toISOString(); Users.set(users); }
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

export function isBaseManager()   { return getCurrentUser()?.role === 'base_manager'; }
export function isBranchManager() { return getCurrentUser()?.role === 'branch_manager'; }
export function isSoldier()       { return getCurrentUser()?.role === 'soldier'; }

// True for any management role (base or branch)
export function isManager() {
  const u = getCurrentUser();
  return u && (u.role === 'base_manager' || u.role === 'branch_manager');
}

export function requireBaseManager() {
  if (!isBaseManager()) { window.location.hash = '#home'; return false; }
  return true;
}

export function requireManager() {
  if (!isManager()) { window.location.hash = '#home'; return false; }
  return true;
}

// Base manager may only override a branch manager's slot assignment when that
// branch manager has been inactive (not logged in) for more than 2 days.
export function canOverrideBranch(slot) {
  if (!slot.branchManagerId) return true;
  const bm = Users.get().find(u => u.id === slot.branchManagerId);
  if (!bm?.lastLogin) return true;
  return (Date.now() - new Date(bm.lastLogin).getTime()) > 2 * 24 * 60 * 60 * 1000;
}

export function showLoginModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal login-modal" id="login-modal">
      <div class="login-brand">
        <div class="login-icon"><i class="fa-solid fa-shield-halved"></i></div>
        <h1><span>Sentinel</span></h1>
        <p>Army Base Guard Management System</p>
      </div>
      <form id="login-form" novalidate>
        <div class="form-group">
          <label class="form-label" for="login-username">Username</label>
          <div class="input-icon-wrap">
            <i class="fa-solid fa-user input-icon"></i>
            <input id="login-username" class="form-input" type="text" placeholder="Enter username" autocomplete="username" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="login-password">Password</label>
          <div class="input-icon-wrap">
            <i class="fa-solid fa-lock input-icon"></i>
            <input id="login-password" class="form-input" type="password" placeholder="Enter password" autocomplete="current-password" />
          </div>
        </div>
        <div id="login-error" class="form-error" style="display:none"></div>
        <button type="submit" class="btn btn-primary btn-full" id="login-btn">
          <i class="fa-solid fa-right-to-bracket"></i> Sign In
        </button>
      </form>
      <div class="login-hint">
        <p><strong>Base Commanders:</strong> commander / cmd123 &nbsp;|&nbsp; deputy / cmd123</p>
        <p><strong>Branch Commanders:</strong> alpha_co / mgr123 &nbsp;|&nbsp; bravo_co / mgr123</p>
        <p><strong>Soldiers:</strong> alpha / user123 &nbsp;|&nbsp; delta / user123</p>
      </div>
    </div>`;
  overlay.classList.add('active', 'login-mode');
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('login-username').focus();
}

function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  if (!username || !password) {
    errEl.textContent = 'Please enter both username and password.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing in…';

  setTimeout(() => {
    const user = Users.get().find(u => u.username === username && u.password === password);
    if (!user) {
      errEl.textContent = 'Invalid username or password.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
      return;
    }
    if (user.status === 'inactive') {
      errEl.textContent = 'Account is inactive. Contact your manager.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Sign In';
      return;
    }

    setCurrentUser(user);
    addActivity(`${user.name} signed in`, 'fa-right-to-bracket', 'info');
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active', 'login-mode');
    overlay.innerHTML = '';
    window.dispatchEvent(new CustomEvent('user-logged-in', { detail: user }));
    showToast(`Welcome back, ${user.name.split(' ').pop()}!`, 'success');
  }, 400);
}
