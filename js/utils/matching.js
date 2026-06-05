// matching.js — Auto-match algorithm
import { timeToMinutes } from './helpers.js';

/**
 * Run auto-match for a set of vacant slots.
 * Returns array of { slot, userId, eligible, conflicts[] }
 */
export function runAutoMatch(vacantSlots, users, dutyTypes, restrictions, allSlots) {
  const tentative = []; // { slot (with assignedUserId set), userId }
  const results   = [];

  // Sort by date+time ascending
  const sorted = [...vacantSlots].sort((a, b) => {
    const ta = new Date(`${a.date}T${a.startTime || '00:00'}`);
    const tb = new Date(`${b.date}T${b.startTime || '00:00'}`);
    return ta - tb;
  });

  for (const slot of sorted) {
    const dt = dutyTypes.find(t => t.id === slot.typeId);
    if (!dt) {
      results.push({ slot, userId: null, eligible: false, conflicts: ['Unknown duty type'] });
      continue;
    }

    const conflicts = [];

    // Step 1: base eligibility
    let eligible = users.filter(u => {
      if (u.role !== 'soldier') return false;
      if (u.status !== 'active') return false;
      if (u.rankLevel < dt.requiredRankLevel) return false;
      if (Array.isArray(u.capabilities) && u.capabilities.includes(slot.typeId)) return false;
      return true;
    });

    if (eligible.length === 0) {
      results.push({ slot, userId: null, eligible: false, conflicts: ['No users meet rank / exemption requirements'] });
      continue;
    }

    // Step 2: time-overlap check (existing committed slots + tentative)
    const allWithTentative = [
      ...allSlots.filter(s => s.status !== 'vacant'),
      ...tentative.map(t => t.slot),
    ];

    const sStart = slot.startTime === '00:00' && slot.endTime === '00:00' ? 0 : timeToMinutes(slot.startTime);
    const sEnd   = slot.endTime   === '00:00' ? 24 * 60 : timeToMinutes(slot.endTime);

    eligible = eligible.filter(u => {
      const sameDay = allWithTentative.filter(s => s.date === slot.date && s.assignedUserId === u.id && s.id !== slot.id);
      return !sameDay.some(s => {
        const eS = timeToMinutes(s.startTime);
        const eE = s.endTime === '00:00' ? 24 * 60 : timeToMinutes(s.endTime);
        return sStart < eE && sEnd > eS; // overlap
      });
    });

    if (eligible.length === 0) {
      results.push({ slot, userId: null, eligible: false, conflicts: ['All eligible users have a conflicting duty at the same time'] });
      continue;
    }

    // Step 3: apply each active restriction
    for (const r of restrictions.filter(r => r.active)) {
      if (r.type === 'consecutive_weeks') {
        const weeks = r.params.weeks || 2;
        eligible = eligible.filter(u => {
          const slotDate = new Date(slot.date + 'T00:00:00');
          for (let w = 1; w <= weeks; w++) {
            const weekStart = new Date(slotDate);
            weekStart.setDate(weekStart.getDate() - w * 7 - 3);
            const weekEnd = new Date(slotDate);
            weekEnd.setDate(weekEnd.getDate() - (w - 1) * 7 + 3);
            const had = allWithTentative.some(s =>
              s.assignedUserId === u.id &&
              s.typeId === slot.typeId &&
              new Date(s.date + 'T00:00:00') >= weekStart &&
              new Date(s.date + 'T00:00:00') <= weekEnd
            );
            if (had) return false;
          }
          return true;
        });
        if (eligible.length === 0) {
          conflicts.push(`Restriction: ${r.name}`);
          break;
        }
      } else if (r.type === 'max_per_period') {
        const max        = r.params.max || 3;
        const periodDays = r.params.periodDays || 7;
        const slotDate   = new Date(slot.date + 'T00:00:00');
        const periodStart = new Date(slotDate);
        periodStart.setDate(periodStart.getDate() - periodDays);
        const periodEnd = new Date(slotDate);
        periodEnd.setDate(periodEnd.getDate() + periodDays);

        eligible = eligible.filter(u => {
          const count = allWithTentative.filter(s => {
            if (s.assignedUserId !== u.id) return false;
            const d = new Date(s.date + 'T00:00:00');
            return d >= periodStart && d <= periodEnd;
          }).length;
          return count < max;
        });
        if (eligible.length === 0) {
          conflicts.push(`Restriction: ${r.name}`);
          break;
        }
      } else if (r.type === 'min_rest_hours') {
        const minHours = r.params.hours || 8;
        const slotStartMs = new Date(`${slot.date}T${slot.startTime || '00:00'}:00`).getTime();
        const slotEndMs   = slot.endTime === '00:00'
          ? new Date(`${slot.date}T23:59:59`).getTime()
          : new Date(`${slot.date}T${slot.endTime}:00`).getTime();

        eligible = eligible.filter(u => {
          const userSlots = allWithTentative.filter(s => s.assignedUserId === u.id && s.date !== slot.date);
          return !userSlots.some(s => {
            const otherStart = new Date(`${s.date}T${s.startTime || '00:00'}:00`).getTime();
            const otherEnd   = s.endTime === '00:00'
              ? new Date(`${s.date}T23:59:59`).getTime()
              : new Date(`${s.date}T${s.endTime}:00`).getTime();
            const gap = Math.min(
              Math.abs(slotStartMs - otherEnd),
              Math.abs(otherStart - slotEndMs)
            );
            return gap < minHours * 3600000;
          });
        });
        if (eligible.length === 0) {
          conflicts.push(`Restriction: ${r.name}`);
          break;
        }
      }
    }

    if (eligible.length === 0) {
      results.push({ slot, userId: null, eligible: false, conflicts: conflicts.length ? conflicts : ['No users pass scheduling restrictions'] });
      continue;
    }

    // Step 4: sort by (tentative count in this run, then total coins) ascending — fairness
    eligible.sort((a, b) => {
      const aTent = tentative.filter(t => t.userId === a.id).length;
      const bTent = tentative.filter(t => t.userId === b.id).length;
      if (aTent !== bTent) return aTent - bTent;
      return a.coins - b.coins;
    });

    const chosen = eligible[0];
    const assignedSlot = { ...slot, assignedUserId: chosen.id };
    tentative.push({ slot: assignedSlot, userId: chosen.id });
    results.push({ slot, userId: chosen.id, eligible: true, conflicts: [] });
  }

  return results;
}
