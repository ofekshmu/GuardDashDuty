// data.js — Data models, seed data, localStorage helpers

export const RANKS = [
  'Private', 'Corporal', 'Sergeant', 'Staff Sergeant',
  'Lieutenant', 'Captain', 'Colonel'
];

export const RANK_COLORS = {
  0: '#9E9E9E', 1: '#4CAF50', 2: '#2196F3',
  3: '#90A4AE', 4: '#FFC107', 5: '#FF9800', 6: '#C62828',
};

export const RANK_CSS = [
  'rank-private', 'rank-corporal', 'rank-sergeant',
  'rank-staff-sergeant', 'rank-lieutenant', 'rank-captain', 'rank-colonel'
];

const KEYS = {
  users:        'gdd_users',
  branches:     'gdd_branches',
  dutyTypes:    'gdd_duty_types',
  dutySlots:    'gdd_duty_slots',
  requests:     'gdd_requests',
  tradeOffers:  'gdd_trade_offers',
  restrictions: 'gdd_restrictions',
  coinHistory:  'gdd_coin_history',
  activityFeed: 'gdd_activity_feed',
  auditLog:     'gdd_audit_log',
};

export function getStore(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
export function setStore(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
export function getId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

export const Users        = { get: () => getStore(KEYS.users),        set: v => setStore(KEYS.users, v) };
export const Branches     = { get: () => getStore(KEYS.branches),     set: v => setStore(KEYS.branches, v) };
export const DutyTypes    = { get: () => getStore(KEYS.dutyTypes),    set: v => setStore(KEYS.dutyTypes, v) };
export const DutySlots    = { get: () => getStore(KEYS.dutySlots),    set: v => setStore(KEYS.dutySlots, v) };
export const Requests     = { get: () => getStore(KEYS.requests),     set: v => setStore(KEYS.requests, v) };
export const TradeOffers  = { get: () => getStore(KEYS.tradeOffers),  set: v => setStore(KEYS.tradeOffers, v) };
export const Restrictions = { get: () => getStore(KEYS.restrictions), set: v => setStore(KEYS.restrictions, v) };
export const CoinHistory  = { get: () => getStore(KEYS.coinHistory),  set: v => setStore(KEYS.coinHistory, v) };
export const ActivityFeed = { get: () => getStore(KEYS.activityFeed), set: v => setStore(KEYS.activityFeed, v) };
export const AuditLog     = { get: () => getStore(KEYS.auditLog),     set: v => setStore(KEYS.auditLog, v) };

export function addActivity(text, icon = 'fa-circle-info', type = 'info') {
  const feed = ActivityFeed.get();
  feed.unshift({ id: getId(), text, icon, type, ts: new Date().toISOString() });
  ActivityFeed.set(feed.slice(0, 50));
}

export function logAudit(actor, action, entityType, entityId, details = '') {
  const log = AuditLog.get();
  log.unshift({
    id: getId(),
    ts: new Date().toISOString(),
    actorId:   actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    entityType,
    entityId: entityId || '',
    details,
  });
  AuditLog.set(log.slice(0, 300));
}

export function seedData() {
  if (localStorage.getItem('gdd_seeded_v2')) return;

  // Clear v1 data
  ['gdd_users','gdd_duty_types','gdd_duty_slots','gdd_requests',
   'gdd_trade_offers','gdd_restrictions','gdd_coin_history','gdd_activity_feed']
    .forEach(k => localStorage.removeItem(k));
  localStorage.removeItem('gdd_seeded');

  Branches.set([
    { id: 'branch-a', name: 'Alpha Company',  description: 'Forward security unit' },
    { id: 'branch-b', name: 'Bravo Company',  description: 'Perimeter defense unit' },
  ]);

  const users = [
    { id:'u1', username:'commander', password:'cmd123',  name:'Col. Sarah Mitchell',
      role:'base_manager',   rank:'Colonel',        rankLevel:6, coins:0,
      branchId:null,       capabilities:[], lastLogin:null, status:'active', joinDate:'2021-01-10' },
    { id:'u2', username:'deputy',    password:'cmd123',  name:'Capt. David Turner',
      role:'base_manager',   rank:'Captain',        rankLevel:5, coins:0,
      branchId:null,       capabilities:[], lastLogin:null, status:'active', joinDate:'2021-06-01' },
    { id:'u3', username:'alpha_co',  password:'mgr123',  name:'Lt. James Kowalski',
      role:'branch_manager', rank:'Lieutenant',     rankLevel:4, coins:0,
      branchId:'branch-a', capabilities:[], lastLogin:null, status:'active', joinDate:'2022-03-15' },
    { id:'u4', username:'bravo_co',  password:'mgr123',  name:'Lt. Elena Rodriguez',
      role:'branch_manager', rank:'Lieutenant',     rankLevel:4, coins:0,
      branchId:'branch-b', capabilities:[], lastLogin:null, status:'active', joinDate:'2022-08-20' },
    { id:'u5', username:'alpha',     password:'user123', name:'Sgt. Tom Anderson',
      role:'soldier',        rank:'Sergeant',       rankLevel:2, coins:320,
      branchId:'branch-a', capabilities:[], lastLogin:null, status:'active', joinDate:'2023-01-15' },
    { id:'u6', username:'bravo',     password:'user123', name:'Cpl. Marcus Chen',
      role:'soldier',        rank:'Corporal',       rankLevel:1, coins:185,
      branchId:'branch-a', capabilities:[], lastLogin:null, status:'active', joinDate:'2023-06-01' },
    { id:'u7', username:'charlie',   password:'user123', name:'Pvt. Aisha Williams',
      role:'soldier',        rank:'Private',        rankLevel:0, coins:90,
      branchId:'branch-a', capabilities:[], lastLogin:null, status:'active', joinDate:'2024-01-20' },
    { id:'u8', username:'delta',     password:'user123', name:'SSgt. David Park',
      role:'soldier',        rank:'Staff Sergeant', rankLevel:3, coins:440,
      branchId:'branch-b', capabilities:[], lastLogin:null, status:'active', joinDate:'2021-08-05' },
    { id:'u9', username:'echo',      password:'user123', name:'Cpl. Nadia Osei',
      role:'soldier',        rank:'Corporal',       rankLevel:1, coins:210,
      branchId:'branch-b', capabilities:[], lastLogin:null, status:'active', joinDate:'2023-02-14' },
  ];
  Users.set(users);

  const dutyTypes = [
    { id:'dt1', name:'Gate Guard',       description:'Manning the main entrance gate',      coinValue:40,  requiredRankLevel:0, color:'#4CAF50', icon:'fa-door-open',         active:true },
    { id:'dt2', name:'Perimeter Patrol', description:'Walking the base perimeter',           coinValue:60,  requiredRankLevel:1, color:'#2196F3', icon:'fa-person-walking',    active:true },
    { id:'dt3', name:'Watchtower',       description:'Observation post surveillance',        coinValue:80,  requiredRankLevel:2, color:'#FF9800', icon:'fa-tower-observation', active:true },
    { id:'dt4', name:'Command Post',     description:'Command post communications duty',     coinValue:100, requiredRankLevel:3, color:'#9C27B0', icon:'fa-walkie-talkie',     active:true },
    { id:'dt5', name:'Night Patrol',     description:'Night-time tactical patrol',           coinValue:120, requiredRankLevel:2, color:'#00BCD4', icon:'fa-moon',              active:true },
  ];
  DutyTypes.set(dutyTypes);

  const timeWindows = [
    ['00:00','04:00'],['04:00','08:00'],['08:00','12:00'],
    ['12:00','16:00'],['16:00','20:00'],['20:00','00:00'],
  ];
  const branchASoldiers = ['u5','u6','u7'];
  const branchBSoldiers = ['u8','u9'];
  const slots = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const used  = new Set();
  let sn = 0;

  for (let i = 0; i < 35; i++) {
    const dayOffset = Math.floor(Math.random() * 40) - 7;
    const d = new Date(today); d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().slice(0,10);
    const dt    = dutyTypes[Math.floor(Math.random() * dutyTypes.length)];
    const twIdx = Math.floor(Math.random() * timeWindows.length);
    const [start, end] = timeWindows[twIdx];
    const key = `${dateStr}-${twIdx}-${dt.id}`;
    if (used.has(key)) { i--; continue; }
    used.add(key); sn++;

    const isPast = new Date(dateStr) < today;
    const rnd    = Math.random();
    let assignedUserId = null, branchManagerId = null, delegatedAt = null, lastBranchActionAt = null, status = 'vacant';

    if (rnd < 0.15) {
      status = 'vacant';
    } else if (rnd < 0.40) {
      branchManagerId = Math.random() < 0.5 ? 'u3' : 'u4';
      delegatedAt     = new Date(today.getTime() - Math.random() * 86400000 * 3).toISOString();
      status          = 'pending_branch';
    } else {
      const useA      = Math.random() < 0.5;
      branchManagerId = useA ? 'u3' : 'u4';
      const pool      = useA ? branchASoldiers : branchBSoldiers;
      const eligible  = pool.filter(uid => { const u = users.find(x => x.id === uid); return u && u.rankLevel >= dt.requiredRankLevel; });
      if (eligible.length) {
        assignedUserId     = eligible[Math.floor(Math.random() * eligible.length)];
        delegatedAt        = new Date(today.getTime() - Math.random() * 86400000 * 5).toISOString();
        lastBranchActionAt = new Date(today.getTime() - Math.random() * 86400000 * 2).toISOString();
        status = isPast ? 'completed' : 'assigned';
      } else {
        delegatedAt = new Date(today.getTime() - Math.random() * 86400000 * 3).toISOString();
        status      = 'pending_branch';
      }
    }

    slots.push({ id:`s${sn}`, typeId:dt.id, date:dateStr, startTime:start, endTime:end,
      assignedUserId, branchManagerId, delegatedAt, lastBranchActionAt,
      status, notes:'', createdAt: new Date(today.getTime() - Math.random() * 86400000 * 7).toISOString() });
  }
  DutySlots.set(slots);

  Restrictions.set([
    { id:'r1', name:'No Consecutive Weeks',  type:'consecutive_weeks', params:{ weeks:2 },           description:'Same duty type 2 weeks in a row not allowed',         active:true },
    { id:'r2', name:'Max 3 Duties Per Week', type:'max_per_period',    params:{ max:3, periodDays:7 }, description:'No soldier gets more than 3 duties in a 7-day window', active:true },
    { id:'r3', name:'Min 8h Rest',           type:'min_rest_hours',    params:{ hours:8 },            description:'Minimum 8 hours rest between duties',                  active:true },
  ]);

  ActivityFeed.set([
    { id:'a1', text:'Sentinel v2 — three-tier hierarchy active',        icon:'fa-rocket',       type:'info',    ts: new Date().toISOString() },
    { id:'a2', text:'Alpha Company: slots delegated to Lt. Kowalski',   icon:'fa-share-nodes',  type:'info',    ts: new Date(Date.now()-3600000).toISOString() },
    { id:'a3', text:'Sgt. Anderson completed Gate Guard (+40 coins)',   icon:'fa-check-circle', type:'success', ts: new Date(Date.now()-7200000).toISOString() },
  ]);

  CoinHistory.set([
    { id:'ch1', userId:'u5', amount:40,  reason:'Gate Guard completed',       dutySlotId:null, date: new Date(Date.now()-86400000*3).toISOString() },
    { id:'ch2', userId:'u5', amount:80,  reason:'Watchtower completed',       dutySlotId:null, date: new Date(Date.now()-86400000*10).toISOString() },
    { id:'ch3', userId:'u8', amount:100, reason:'Command Post completed',     dutySlotId:null, date: new Date(Date.now()-86400000*5).toISOString() },
    { id:'ch4', userId:'u6', amount:60,  reason:'Perimeter Patrol completed', dutySlotId:null, date: new Date(Date.now()-86400000*7).toISOString() },
  ]);

  Requests.set([
    { id:'req1', userId:'u7', type:'exemption',  title:'Medical Exemption — Night Patrol',
      description:'Medical condition preventing night duties.', dutySlotId:null,
      dutyTypeId:'dt5', expiryDate:'2026-12-31', status:'pending',
      createdAt: new Date(Date.now()-86400000*2).toISOString(), reviewedAt:null, reviewNotes:'' },
    { id:'req2', userId:'u6', type:'duty_change', title:'Duty Swap Request',
      description:'Family emergency on assigned date.', dutySlotId:null,
      dutyTypeId:null, expiryDate:null, status:'pending',
      createdAt: new Date(Date.now()-86400000).toISOString(), reviewedAt:null, reviewNotes:'' },
  ]);

  localStorage.setItem('gdd_seeded_v2', '1');
}
