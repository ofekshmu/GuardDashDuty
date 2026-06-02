// theme.js — Theme management (Army Green / Black & White)
const THEME_KEY = 'gdd_theme';

export const THEMES = {
  green: {
    id:      'green',
    name:    'Army Green',
    icon:    'fa-leaf',
    swatches: ['#141f14', '#4CAF50', '#9CCC65'],
  },
  bw: {
    id:      'bw',
    name:    'Black & White',
    icon:    'fa-circle-half-stroke',
    swatches: ['#111111', '#e0e0e0', '#666666'],
  },
};

export function getTheme()      { return localStorage.getItem(THEME_KEY) || 'green'; }
export function initTheme()     { applyTheme(getTheme()); }
export function setTheme(name)  { localStorage.setItem(THEME_KEY, name); applyTheme(name); }

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
}
