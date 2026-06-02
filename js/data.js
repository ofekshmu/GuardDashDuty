// ============================================================
// data.js — Data models, seed data, localStorage helpers
// ============================================================

export const RANKS = [
  'Private', 'Corporal', 'Sergeant', 'Staff Sergeant',
  'Lieutenant', 'Captain', 'Colonel'
];

export const RANK_COLORS = {
  0: '#9E9E9E', // Private — gray
  1: '#4CAF50', // Corporal — green
  2: '#2196F3', // Sergeant — blue
  3: '#90A4AE', // Staff Sergeant — silver
  4: '#FFC107', // Lieutenant — gold
  5: '#FF9800', // Captain — orange
  6: '#C62828', // Colonel — crimson
};

export const RANK_CSS = [
  'rank-private', 'rank-corporal', 'rank-sergeant',
  'rank-staff-sergeant', 'rank-lieutenant', 'rank-captain', 'rank-colonel'
];

// ── Keys ────────────────────────────────────────────────────
const KEYS = {
  users:        'gdd_users',
  dutyTypes:    'gdd_duty_types',
  dutySlots:    'gdd_duty_slots',
  requests:     'gdd_requests',
  tradeOffers:  'gdd_trade_offers',
  restrictions: 'gdd_restrictions',
  coinHistory:  'gdd_coin_history',
  activityFeed: 'gdd_activity_feed',
};

// ── Generic helpers ─────────────────────────────────────────
export function getStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch { return []; }
}

export function setStore(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function getId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Typed accessors ─────────────────────────────────────────
export const Users        = { get: () => getStore(KEYS.users),        set: v => setStore(KEYS.users, v) };
export const DutyTypes    = { get: () => getStore(KEYS.dutyTypes),    set: v => setStore(KEYS.dutyTypes, v) };
export const DutySlots    = { get: () => getStore(KEYS.dutySlots),    set: v => setStore(KEYS.dutySlots, v) };
export const Requests     = { get: () => getStore(KEYS.requests),     set: v => setStore(KEYS.requests, v) };
export const TradeOffers  = { get: () => getStore(KEYS.tradeOffers),  set: v => setStore(KEYS.tradeOffers, v) };
export const Restrictions = { get: () => getStore(KEYS.restrictions), set: v => setStore(KEYS.restrictions, v) };
export const CoinHistory  = { get: () => getStore(KEYS.coinHistory),  set: v => setStore(KEYS.coinHistory, v) };
export const ActivityFeed = { get: () => getStore(KEYS.activityFeed), set: v => setStore(KEYS.activityFeed, v) };

export function addActivity(text, icon = 'fa-circle-info', type = 'info') {
  const feed = ActivityFeed.get();
  feed.unshift({ id: getId(), text, icon, type, ts: new Date().toISOString() });
  ActivityFeed.set(feed.slice(0, 50));
}

// ── Seed ────────────────────────────────────────────────────
export function seedData() {
  if (localStorage.getItem('gdd_seeded')) return;

  // Users
  const users = [
    { id: 'u1', username: 'manager', password: 'manager123', name: 'Col. Sarah Mitchell',
      role: 'manager', rank: 'Colonel', rankLevel: 6, coins: 0,
      capabilities: [], lastLogin: null, status: 'active', joinDate: '2021-01-10' },
    { id: 'u2', username: 'alpha', password: 'user123', name: 'Sgt. James Kowalski',
      role: 'user', rank: 'Sergeant', rankLevel: 2, coins: 320,
      capabilities: [], lastLogin: null, status: 'active', joinDate: '2022-03-15' },
    { id: 'u3', username: 'bravo', password: 'user123', name: 'Cpl. Elena Rodriguez',
      role: 'user', rank: 'Corporal', rankLevel: 1, coins: 185,
      capabilities: [], lastLogin: null, status: 'active', joinDate: '2023-06-01' },
    { id: 'u4', username: 'charlie', password: 'user123', name: 'Pvt. Tom Anderson',
      role: 'user', rank: 'Private', rankLevel: 0, coins: 90,
      capabilities: [], lastLogin: null, status: 'active', joinDate: '2024-01-20' },
    { id: 'u5', username: 'delta', password: 'user123', name: 'SSgt. Marcus Chen',
      role: 'user', rank: 'Staff Sergeant', rankLevel: 3, coins: 440,
      capabilities: [], lastLogin: null, status: 'active', joinDate: '2021-08-05' },
    { id: 'u6', username: 'echo', password: 'user123', name: 'Cpl. Aisha Williams',
      role: 'user', rank: 'Corporal', rankLevel: 1, coins: 210,
      capabilities: [], lastLogin: null, status: 'active', joinDate: '2023-02-14' },
  ];
  Users.set(users);

  // Duty Types
  const dutyTypes = [
    { id: 'dt1', name: 'Gate Guard',       description: 'Manning the main entrance gate',      coinValue: 40,  requiredRankLevel: 0, color: '#4CAF50', icon: 'fa-door-open',    active: true },
    { id: 'dt2', name: 'Perimeter Patrol', description: 'Walking the base perimeter',           coinValue: 60,  requiredRankLevel: 1, color: '#2196F3', icon: 'fa-person-walking', active: true },
    { id: 'dt3', name: 'Watchtower',       description: 'Observation post surveillance',        coinValue: 80,  requiredRankLevel: 2, color: '#FF9800', icon: 'fa-tower-observation', active: true },
    { id: 'dt4', name: 'Command Post',     description: 'Command post communications duty',     coinValue: 100, requiredRankLevel: 3, color: '#9C27B0', icon: 'fa-walkie-talkie', active: true },
    { id: 'dt5', name: 'Night Patrol',     description: 'Night-time tactical patrol',           coinValue: 120, requiredRankLevel: 2, color: '#00BCD4', icon: 'fa-moon',          active: true },
  ];
  DutyTypes.set(dutyTypes);

  // Generate 30 duty slots: -7 to +30 days
  const timeWindows = [
    ['00:00','04:00'], ['04:00','08:00'], ['08:00','12:00'],
    ['12:00','16:00'], ['16:00','20:00'], ['20:00','00:00'],
  ];
  const assignableUsers = ['u2','u3','u4','u5','u6'];
  const slots = [];
  const today = new Date();
  today.setHours(0,0,0,0);

  const usedCombos = new Set();

  for (let i = 0; i < 30; i++) {
    const dayOffset = Math.floor(Math.random() * 38) - 7;
    const d = new Date(today);
    d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().slice(0,10);

    const dtIdx = Math.floor(Math.random() * dutyTypes.length);
    const dt = dutyTypes[dtIdx];
    const twIdx = Math.floor(Math.random() * timeWindows.length);
    const [start, end] = timeWindows[twIdx];

    const key = `${dateStr}-${twIdx}-${dt.id}`;
    if (usedCombos.has(key)) { i--; continue; }
    usedCombos.add(key);

    const assign = Math.random() < 0.60;
    let assignedUserId = null;
    let status = 'vacant';

    if (assign) {
      // pick eligible user
      const eligible = assignableUsers.filter(uid => {
        const u = users.find(x => x.id === uid);
        return u && u.rankLevel >= dt.requiredRankLevel;
      });
      if (eligible.length > 0) {
        assignedUserId = eligible[Math.floor(Math.random() * eligible.length)];
        const slotDate = new Date(dateStr);
        slotDate.setHours(0,0,0,0);
        if (slotDate < today) {
          status = 'completed';
        } else {
          status = 'assigned';
        }
      }
    }

    slots.push({
      id: `s${i+1}`,
      typeId: dt.id,
      date: dateStr,
      startTime: start,
      endTime: end,
      assignedUserId,
      status,
      notes: '',
      createdAt: new Date().toISOString(),
    });
  }
  DutySlots.set(slots);

  // Restrictions
  const restrictions = [
    { id: 'r1', name: 'No Consecutive Weeks', description: 'Same duty type cannot be assigned to same user 2 weeks in a row',
      type: 'consecutive_weeks', params: { weeks: 2 }, active: true },
    { id: 'r2', name: 'Max 3 Duties Per Week', description: 'No user can have more than 3 duties in a 7-day window',
      type: 'max_per_period', params: { max: 3, periodDays: 7 }, active: true },
    { id: 'r3', name: 'Min 8h Rest', description: 'Minimum 8 hours rest between any two duties for the same user',
      type: 'min_rest_hours', params: { hours: 8 }, active: true },
  ];
  Restrictions.set(restrictions);

  // Seed some activity
  const activities = [
    { id: 'a1', text: 'System initialized with seed data', icon: 'fa-rocket', type: 'info', ts: new Date().toISOString() },
    { id: 'a2', text: 'Sgt. Kowalski completed Gate Guard duty', icon: 'fa-check-circle', type: 'success', ts: new Date(Date.now()-3600000).toISOString() },
    { id: 'a3', text: 'New duty slots generated for next month', icon: 'fa-calendar-plus', type: 'info', ts: new Date(Date.now()-7200000).toISOString() },
  ];
  ActivityFeed.set(activities);

  // Seed some coin history
  const coinHistory = [
    { id: 'ch1', userId: 'u2', amount: 40,  reason: 'Gate Guard completed', dutySlotId: null, date: new Date(Date.now()-86400000*3).toISOString() },
    { id: 'ch2', userId: 'u2', amount: 80,  reason: 'Watchtower completed', dutySlotId: null, date: new Date(Date.now()-86400000*10).toISOString() },
    { id: 'ch3', userId: 'u5', amount: 100, reason: 'Command Post completed', dutySlotId: null, date: new Date(Date.now()-86400000*5).toISOString() },
    { id: 'ch4', userId: 'u3', amount: 60,  reason: 'Perimeter Patrol completed', dutySlotId: null, date: new Date(Date.now()-86400000*7).toISOString() },
  ];
  CoinHistory.set(coinHistory);

  // Seed some requests
  const requests = [
    { id: 'req1', userId: 'u4', type: 'exemption', title: 'Medical Exemption - Night Patrol',
      description: 'I have a medical condition preventing night duties.', dutySlotId: null,
      dutyTypeId: 'dt5', expiryDate: '2026-12-31', status: 'pending',
      createdAt: new Date(Date.now()-86400000*2).toISOString(), reviewedAt: null, reviewNotes: '' },
    { id: 'req2', userId: 'u3', type: 'duty_change', title: 'Duty Swap Request',
      description: 'Need to swap my upcoming duty due to family emergency.', dutySlotId: null,
      dutyTypeId: null, expiryDate: null, status: 'pending',
      createdAt: new Date(Date.now()-86400000).toISOString(), reviewedAt: null, reviewNotes: '' },
  ];
  Requests.set(requests);

  localStorage.setItem('gdd_seeded', '1');
}
