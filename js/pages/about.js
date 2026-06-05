// about.js — About / Features overview page
import { RANKS, RANK_COLORS, RANK_CSS } from '../data.js';

export function renderAbout(container) {
  const features = [
    { icon: 'fa-calendar-days',   color: '#4CAF50', title: 'Duty Calendar',      desc: 'View all guard duties in an interactive month, week, or day calendar. Click any duty to see full details and manage assignments.' },
    { icon: 'fa-sliders',         color: '#2196F3', title: 'Duty Manager',        desc: 'Create duty types with custom coin values and rank requirements. Schedule duty slots and run the intelligent auto-matcher.' },
    { icon: 'fa-coins',           color: '#FFA726', title: 'Coin Economy',        desc: 'Soldiers earn coins by completing guard duties. Higher-risk duties award more coins. The auto-matcher prioritises soldiers with fewer coins to ensure fairness.' },
    { icon: 'fa-store',           color: '#9C27B0', title: 'Duty Market',         desc: 'Trade duties with fellow soldiers. Post offers, browse open trades, and negotiate swaps. All trades require manager approval.' },
    { icon: 'fa-inbox',           color: '#00BCD4', title: 'Request System',      desc: 'Submit duty-change requests or medical/personal exemptions. Exemptions have expiry dates and are approved by the commander.' },
    { icon: 'fa-users',           color: '#FF9800', title: 'Personnel Roster',    desc: 'Browse all active personnel with rank, coin balance, duty history, and exemption status. Commanders can edit profiles directly.' },
    { icon: 'fa-robot',           color: '#4CAF50', title: 'Auto-Matching',       desc: 'One-click intelligent auto-assignment respects rank requirements, scheduling restrictions, exemptions, and coin fairness.' },
    { icon: 'fa-file-pdf',        color: '#EF5350', title: 'PDF Reports',         desc: 'Generate professional assignment reports for printing and record-keeping. Reports include full matchup details and a commander signature line.' },
  ];

  const rankDescs = [
    'Entry-level soldiers. Eligible for basic gate guard duties.',
    'Qualified for perimeter patrol in addition to gate duties.',
    'Cleared for watchtower and night patrol assignments.',
    'Senior NCO with access to all tactical duties.',
    'Officer with command post responsibilities.',
    'Senior officer. Full access to all duty types.',
    'Base commander. Administrative role, does not perform guard duty.',
  ];

  container.innerHTML = `
    <div class="page-fade">
      <!-- Hero -->
      <div class="about-hero">
        <div class="about-hero-icon"><i class="fa-solid fa-shield-halved"></i></div>
        <h1><span>Sentinel</span></h1>
        <p>A modern guard duty management system designed to keep your army base secure and your roster fair.</p>
      </div>

      <!-- Features -->
      <div class="section">
        <div class="section-header">
          <div class="section-title"><i class="fa-solid fa-star"></i> Features</div>
        </div>
        <div class="features-grid">
          ${features.map(f => `
            <div class="feature-card">
              <div class="feature-icon"><i class="fa-solid ${f.icon}" style="color:${f.color}"></i></div>
              <h3>${f.title}</h3>
              <p>${f.desc}</p>
            </div>`).join('')}
        </div>
      </div>

      <!-- How it works -->
      <div class="section">
        <div class="section-header">
          <div class="section-title"><i class="fa-solid fa-circle-question"></i> How It Works</div>
        </div>
        <div class="grid-2">
          <div class="card card-body" style="padding:24px">
            <h3 style="margin-bottom:14px;display:flex;align-items:center;gap:8px"><i class="fa-solid fa-coins" style="color:var(--warning)"></i> Coin Economy</h3>
            <p style="font-size:.875rem;color:var(--text-muted);line-height:1.7">
              Every completed guard duty earns coins. The coin value is set per duty type by the commander — higher-risk duties pay more.
              The auto-matcher always prioritises soldiers with fewer coins so duties are distributed fairly over time.
              Coins never expire; they reflect total service contribution.
            </p>
          </div>
          <div class="card card-body" style="padding:24px">
            <h3 style="margin-bottom:14px;display:flex;align-items:center;gap:8px"><i class="fa-solid fa-rotate" style="color:var(--info)"></i> Trade Flow</h3>
            <p style="font-size:.875rem;color:var(--text-muted);line-height:1.7">
              1. Soldier A posts a duty they want to exchange in the Duty Market.<br>
              2. Soldier B accepts or makes a counter-offer, specifying duties they'll swap.<br>
              3. The system checks rank compatibility and schedule conflicts automatically.<br>
              4. The commander reviews and approves or rejects the trade.<br>
              5. On approval, duties are swapped instantly.
            </p>
          </div>
          <div class="card card-body" style="padding:24px">
            <h3 style="margin-bottom:14px;display:flex;align-items:center;gap:8px"><i class="fa-solid fa-robot" style="color:var(--primary)"></i> Auto-Matching</h3>
            <p style="font-size:.875rem;color:var(--text-muted);line-height:1.7">
              Click <strong>Run Auto Match</strong> in Duty Manager to fill all vacant slots. The algorithm:<br>
              · Filters by rank and active exemptions<br>
              · Checks for schedule conflicts<br>
              · Applies commander-defined restrictions (e.g. no same duty two weeks in a row)<br>
              · Picks the soldier with the fewest coins for fairness<br>
              · Presents results for commander approval before committing.
            </p>
          </div>
          <div class="card card-body" style="padding:24px">
            <h3 style="margin-bottom:14px;display:flex;align-items:center;gap:8px"><i class="fa-solid fa-inbox" style="color:var(--info)"></i> Exemptions</h3>
            <p style="font-size:.875rem;color:var(--text-muted);line-height:1.7">
              Soldiers can submit exemption requests for specific duty types (e.g. medical night-duty exemption).
              Each request includes an expiry date. Once approved, the soldier is excluded from auto-matching for that duty type until the exemption expires.
              The commander can revoke an exemption at any time via Personnel.
            </p>
          </div>
        </div>
      </div>

      <!-- Rank table -->
      <div class="section">
        <div class="section-header">
          <div class="section-title"><i class="fa-solid fa-medal"></i> Rank Structure</div>
        </div>
        <div class="card">
          <div class="card-body" style="padding:0">
            <div class="rank-table" style="padding:16px;gap:8px">
              ${RANKS.map((r, i) => `
                <div class="rank-row">
                  <div class="rank-color-swatch" style="background:${RANK_COLORS[i]}"></div>
                  <div class="rank-row-name">
                    <span class="badge badge-rank ${RANK_CSS[i]}">${r}</span>
                  </div>
                  <div class="rank-row-level">Level ${i}</div>
                  <div class="rank-row-desc">${rankDescs[i]}</div>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Demo credentials -->
      <div class="card section">
        <div class="card-header">
          <span class="card-title"><i class="fa-solid fa-key"></i> Demo Accounts</span>
        </div>
        <div class="card-body" style="padding:0">
          <table class="table">
            <thead><tr><th>Username</th><th>Password</th><th>Role</th><th>Rank</th></tr></thead>
            <tbody>
              <tr><td><code>commander</code></td><td><code>cmd123</code></td>  <td><span class="badge badge-base-manager">Base Commander</span></td>  <td>Colonel</td></tr>
              <tr><td><code>deputy</code></td>   <td><code>cmd123</code></td>  <td><span class="badge badge-base-manager">Base Commander</span></td>  <td>Captain</td></tr>
              <tr><td><code>alpha_co</code></td> <td><code>mgr123</code></td>  <td><span class="badge badge-branch-manager">Branch Commander</span></td><td>Lieutenant</td></tr>
              <tr><td><code>bravo_co</code></td> <td><code>mgr123</code></td>  <td><span class="badge badge-branch-manager">Branch Commander</span></td><td>Lieutenant</td></tr>
              <tr><td><code>alpha</code></td>    <td><code>user123</code></td> <td><span class="badge badge-soldier">Soldier</span></td>               <td>Sergeant</td></tr>
              <tr><td><code>delta</code></td>    <td><code>user123</code></td> <td><span class="badge badge-soldier">Soldier</span></td>               <td>Staff Sgt</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}
