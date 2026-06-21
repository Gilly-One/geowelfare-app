var GWF = window.GWF || (window.GWF = {});

GWF.components = (() => {
  const pages = [
    ['dashboard.html','📊','Dashboard'], ['members.html','👥','Members'], ['payments.html','💳','Payments'], ['receipts.html','🧾','Receipts'], ['messages.html','✉️','Messages'], ['reports.html','📅','Yearly Reports'], ['welfare.html','🤝','Beneficiaries'], ['coffers.html','🏦','Coffers'], ['settings.html','⚙️','Settings / Import']
  ];
  const memberPages = [['member-portal.html','👤','My Welfare Account']];
  async function initPage(title, opts={}){
    await GWF.db.init();
    const user = GWF.auth.requireAuth(opts.adminOnly || false);
    if (!user) return null;
    if (user.role === 'member' && !opts.memberPage) { location.href = 'member-portal.html'; return null; }
    GWF.auth.startInactivityTimer?.();
    document.body.insertAdjacentHTML('afterbegin', `<div class="sidebar-backdrop" id="sidebarBackdrop"></div><div class="layout"><aside class="sidebar" id="sidebar"></aside><main class="main"><header class="topbar"><div style="display:flex;align-items:center;gap:10px;min-width:0"><button class="btn secondary mobile-menu" id="menuBtn">☰</button><h2>${GWF.escape(title)}</h2></div><div class="top-actions"><span class="badge">${GWF.db.backendName()}</span><span class="badge ${user.role==='admin'?'active':'inactive'}">${GWF.escape(user.role)}</span><button class="btn secondary small" id="logoutBtn">Logout</button></div></header><section class="content" id="pageContent"></section></main></div>`);
    await renderSidebar();
    const closeMenu = () => { document.getElementById('sidebar').classList.remove('open'); document.body.classList.remove('sidebar-open'); };
    document.getElementById('logoutBtn').addEventListener('click', GWF.auth.logout);
    document.getElementById('menuBtn')?.addEventListener('click',()=>{ document.getElementById('sidebar').classList.toggle('open'); document.body.classList.toggle('sidebar-open'); });
    document.getElementById('sidebarBackdrop')?.addEventListener('click', closeMenu);
    document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click', closeMenu));
    return document.getElementById('pageContent');
  }
  async function renderSidebar(){
    const path = location.pathname.split('/').pop() || 'dashboard.html';
    let announcements = [];
    try { announcements = (await GWF.db.all('announcements')).filter(a=>a.active !== false).sort((a,b)=>String(b.date||b.createdAt||'').localeCompare(String(a.date||a.createdAt||''))).slice(0,3); } catch(e) {}
    const news = announcements.length ? announcements.map(a=>`<div class="bulletin-item"><strong>${GWF.escape(a.title||'Announcement')}</strong><br><span>${GWF.escape(a.body||'')}</span></div>`).join('') : '<div class="bulletin-item"><span>No announcements yet.</span></div>';
    const isMember = GWF.currentUser()?.role === 'member';
    const memberTools = isMember ? `<div class="member-section-nav"><strong>Page Sections</strong><a href="#profileSection">My Profile</a><a href="#receiptsSection">My Recent Receipts</a><a href="#yearlyReportSection">My Yearly Report</a><a href="#beneficiariesSection">Beneficiaries / Payouts</a><a href="#messagesSection">Messages to Admin</a><a href="#documentsSection">Media / Documents</a><a href="#passwordSection">Change Password</a><a href="#paymentsSection">My Payment History</a></div><div class="statement-widget"><label>Download Statement</label><select id="statementYearSelect">${[GWF.currentYear(),GWF.currentYear()-1,GWF.currentYear()-2,2026,2025,2024].filter((v,i,a)=>a.indexOf(v)===i).map(y=>`<option>${y}</option>`).join('')}</select><button class="btn secondary small" id="downloadStatementBtn" type="button">Download PDF</button></div>` : '';
    document.getElementById('sidebar').innerHTML = `<div class="brand"><div class="brand-mark">GMC</div><div><h1>${GWF.escape(GWF.settings.appName || GWF.settings.organizationName)}</h1><p>Welfare Manager</p></div></div><nav class="nav">${(isMember ? memberPages : pages).map(([href,icon,label]) => `<a href="${href}" class="${path===href?'active':''}"><span class="icon">${icon}</span>${label}</a>`).join('')}</nav>${memberTools}<div class="sidebar-footer"><strong>News / Announcement Bulletin</strong>${news}</div>`;
  }
  function modal(title, body, actions=''){
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal"><div class="modal-head"><h3>${GWF.escape(title)}</h3><button class="btn ghost small" data-close>✕</button></div><div>${body}</div>${actions ? `<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">${actions}</div>` : ''}</div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('[data-close]').onclick = () => wrap.remove();
    wrap.addEventListener('click', e => { if(e.target === wrap) wrap.remove(); });
    return wrap;
  }
  function memberOptions(members, selected=''){
    return members.map(m => `<option value="${GWF.escape(m.id)}" ${String(selected)===String(m.id)?'selected':''}>${GWF.escape(m.memberId)} — ${GWF.escape(m.name)}</option>`).join('');
  }
  return { initPage, modal, memberOptions, renderSidebar };
})();
