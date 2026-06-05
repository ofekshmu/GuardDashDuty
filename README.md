# Sentinel — Guard Duty Management System

A client-side SPA for managing guard duty rosters inside an army base. No server required — all data is stored in the browser's `localStorage`.

---

## Quick Start

Open `index.html` directly in a browser, or serve locally:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

### Demo Accounts

| Username | Password | Role | Rank |
|---|---|---|---|
| `commander` | `cmd123` | Base Manager | Colonel |
| `deputy` | `cmd123` | Base Manager | Captain |
| `alpha_co` | `mgr123` | Branch Manager | Lieutenant |
| `bravo_co` | `mgr123` | Branch Manager | Lieutenant |
| `alpha` | `user123` | Soldier | Sergeant |
| `delta` | `user123` | Soldier | Staff Sgt |

---

## Role Overview

The system has three tiers:

```
Base Manager
    └── Branch Manager (Alpha Company)
    │       └── Soldiers: alpha, bravo, charlie
    └── Branch Manager (Bravo Company)
            └── Soldiers: delta, echo
```

- **Base Manager** — creates all duty types and slots, delegates slots to branch managers, oversees the whole base.
- **Branch Manager** — receives delegated slots, assigns soldiers from their own branch, approves trades and requests within their branch.
- **Soldier** — fulfills duties, earns coins, trades duties, and submits exemption or change requests.

---

## Soldier Guide

### Dashboard (Home)
After login you land on your personal dashboard showing:
- Duties completed this month and coins earned
- Pending requests you've submitted
- Open trade offers you've posted
- Your next 4 upcoming duties
- A live activity feed

### Calendar
View all base duties in **Month**, **Week**, or **Day** layout.

- Use the filter bar to narrow by duty type or status.
- Click any duty to open a detail card showing time, type, assigned soldier, and coin value.
- If a duty is assigned to you and you want a change, click **Request Change** inside the detail card.

### Duty Market
Trade assigned duties with other soldiers.

**Posting a trade:**
1. Go to **Duty Market → My Offers → Post Trade**.
2. Pick one or more of your assigned duties to offer.
3. Optionally target a specific soldier and select their duties you want in return. Leave untargeted for an open offer.
4. Add an optional message and submit.

**Accepting a trade:**
1. Browse **Open Market** for trades posted by others.
2. Compatibility badges show whether you meet the rank requirement, have no exemptions, and have no schedule conflicts.
3. Click **Accept** if all checks pass.
4. The trade enters **Pending Manager Approval** — you'll see it update once a manager reviews it.

**After approval** the duty slots swap automatically.

### Requests
Submit two types of requests:

**Duty Change Request**
1. Go to **Requests → Submit Request → Duty Change**.
2. Pick the assigned duty you want changed and write a reason.
3. A manager will review and respond.

**Exemption Request**
1. Go to **Requests → Submit Request → Exemption**.
2. Select the duty type you need exemption from (e.g. Night Patrol for a medical reason).
3. Set an expiry date — exemptions are temporary.
4. Once approved you are excluded from auto-matching for that duty type until the expiry date.

Track the status of all your submissions in **Requests → My Requests**.

### Coin Economy
Every completed duty earns coins based on the duty type's coin value. Higher-risk duties pay more. Your coin balance is shown in the side menu and on your dashboard. The auto-matcher uses coins to ensure fairness — soldiers with fewer coins are assigned first.

---

## Branch Manager Guide

Branch Managers handle all soldiers within their assigned company. The dedicated workspace is **Branch Command**.

### Branch Command — My Delegated Slots
This tab lists every slot the Base Manager has delegated to your branch.

**Assigning a soldier to a pending slot:**
1. Find a slot with status **Awaiting Assignment**.
2. Click **Assign**.
3. A modal shows eligible soldiers from your branch who meet the rank requirement and have no exemptions for this duty type. Pick one and save.
4. The slot moves to **Assigned** status.

**Reassigning:**
If a soldier can no longer cover a duty, click **Reassign** on an assigned slot and pick a replacement.

**Marking completed:**
Once a duty date has passed, click **Mark Completed** on an assigned slot. Coins are automatically awarded to the assigned soldier.

### Branch Command — Auto Match
Automatically fill all pending slots in your branch.

1. Click **Run Auto Match**.
2. The algorithm filters your branch soldiers by rank, exemptions, and active scheduling restrictions, then picks the soldier with the fewest coins for fairness.
3. A results table shows each slot, the proposed soldier, and any conflicts.
4. Tick the results you want to apply and click **Approve Selected** (or **Approve All**).

### Branch Command — My Personnel
A read-only overview of every soldier in your company: rank, coin balance, and upcoming duty count. Detailed editing is reserved for Base Managers.

### Requests
Go to **Requests** to review your branch soldiers' pending requests.

- The **Branch Requests** tab lists all requests from soldiers in your branch.
- For each pending request you can read the reason, optionally add review notes, then click **Approve** or **Reject**.
- Approving an exemption request immediately blocks that soldier from being auto-matched for the requested duty type until the expiry date.

### Duty Market — Pending Approval
When soldiers in your branch complete a trade acceptance, it appears in **Duty Market → Pending Approval**.

- Review the trade details: who is offering, what they're exchanging, and the branch affiliation of each party.
- Click **Approve** to swap the duty assignments, or **Reject** to cancel.

---

## Base Manager Guide

Base Managers have full system access. The primary workspace is **Duty Manager** (labeled **Base Command** in the nav).

### Duty Manager — Duty Types
Define what kinds of guard duties exist.

1. Click **New Type**.
2. Fill in name, description, coin reward, minimum rank required, and a color for calendar display.
3. Save. Types can be edited or toggled active/inactive at any time.
4. Inactive types are hidden from new slot creation and auto-matching.

### Duty Manager — Duty Slots
Create, edit, and manage individual duty slots.

**Single slot:**
1. Click **Add Slot**.
2. Pick a date, start/end times, duty type, and optionally assign a soldier directly. Add notes if needed.

**Bulk add:**
1. Click **Bulk Add**.
2. Set a date range and pick the duty types and time windows to generate. The system creates one slot per day per selected combination.

**Delegating a slot to a Branch Manager:**
1. Find a vacant slot in the table.
2. Click **Delegate**.
3. Pick a branch manager from the list. The slot status changes to **Awaiting Assignment** and it appears in that branch manager's workspace.

**Override rule:** If a slot is already assigned by a branch manager, you can edit or reassign it only if that branch manager has not logged in for 2 or more days. A lock icon on the edit button indicates the slot is currently protected.

**Marking completed:**
Click **Mark Completed** on any assigned past-date slot. Coins are awarded to the assigned soldier automatically.

### Duty Manager — Auto Match
Fill all vacant (un-delegated) slots across the whole base in one operation.

1. Set a date range and select which duty types to include.
2. Click **Run Match**.
3. Results show each slot, the proposed soldier, and any conflict reasons.
4. Select the assignments you want to apply and click **Approve Selected** or **Approve All**.
5. Click **Generate PDF** to download a formatted assignment report with a commander signature line.

### Duty Manager — Restrictions
Define scheduling rules that the auto-matcher enforces globally.

| Type | What it does |
|---|---|
| **Consecutive Weeks** | Prevents the same soldier from doing the same duty type in back-to-back weeks (configurable N weeks) |
| **Max Per Period** | Caps how many duties a soldier can have within a rolling window (e.g. max 3 in 7 days) |
| **Min Rest Hours** | Enforces a minimum gap (in hours) between any two duties for the same soldier |

- Toggle individual restrictions on or off without deleting them.
- Click **Add Restriction** to create a new rule, selecting the type and configuring its parameters.

### Duty Manager — Audit Log
Every significant action is recorded here:

- Who performed it (name + role)
- What they did (delegate slot, assign slot, approve match, complete duty, etc.)
- When (timestamp)
- Any extra details

Use this tab to review accountability across multiple base managers or to investigate discrepancies.

### Personnel (User Management)
Manage the full roster.

**Viewing:**
- Search by name or username, filter by role or status, sort by name / rank / coins.
- Click any card to open a detail modal with rank, role, coin history, upcoming duties, and active exemptions.

**Adding a soldier:**
1. Click **Add User**.
2. Fill in name, username, password, rank, role, and status.
3. Save. The new user can log in immediately.

**Editing:**
- Adjust a soldier's rank, role, or active status.
- Manually add or subtract coins (an adjustment reason is logged in coin history).
- Grant or revoke exemptions by ticking/unticking duty type checkboxes.

### Requests
Base Managers see every pending request across all branches in **Requests → All Requests**. Review, approve, or reject the same way as a branch manager.

### Calendar
Base Managers have full edit access inside the calendar detail modal: edit slot details, delete slots, or mark duties completed directly from the calendar view.

---

## Themes

Open the **Settings** panel (gear icon in the side menu) to switch between three themes:

| Theme | Description |
|---|---|
| Army Green | Default dark military palette |
| Dark | Slate/blue dark theme |
| Light | Clean white/blue theme |

Your preference is saved across sessions.

---

## Data & Privacy

All data is stored in your browser's `localStorage` under the key prefix `gdd_`. No data leaves your device. Clearing site data or `localStorage` resets the app to its seed state.
