// theme.js — Theme management (Army Green / Black & White)
const THEME_KEY = 'gdd_theme';

export const THEMES = {
  green: {
    id:      'green',
    name:    'Army Green',
    icon:    'fa-leaf',
    swatches: ['#141f14', '#4CAF50', '#9CCC65'],
  },
  dark: {
    id:      'dark',
    name:    'Dark',
    icon:    'fa-moon',
    swatches: ['#161b22', '#58a6ff', '#8b949e'],
  },
  light: {
    id:      'light',
    name:    'Light',
    icon:    'fa-sun',
    swatches: ['#ffffff', '#1f6feb', '#424a53'],
  },
};

export function getTheme()      { return localStorage.getItem(THEME_KEY) || 'green'; }
export function initTheme()     { applyTheme(getTheme()); }
export function setTheme(name)  { localStorage.setItem(THEME_KEY, name); applyTheme(name); }

function applyTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
}
