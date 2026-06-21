(async function(){
  const root = await GWF.components.initPage('Dashboard', {adminOnly:true});
  const [members, transactions, receipts, beneficiaries, coffers] = await Promise.all(['members','transactions','receipts','beneficiaries','coffers'].map(GWF.db.all));
  const year = GWF.currentYear();
  const active = members.filter(m => GWF.memberEffectiveStatus(m, transactions).toLowerCase()==='active').length;
  const inactive = members.filter(m => GWF.memberEffectiveStatus(m, transactions).toLowerCase()==='inactive').length;
  const suspended = members.filter(m => GWF.memberEffectiveStatus(m, transactions).toLowerCase()==='suspended').length;
  const yearPayments = transactions.filter(t => Number(t.year) === year);
  const totalDues = yearPayments.reduce((s,t)=>s+Number(t.amount||0),0);
  const totalWelfare = beneficiaries.filter(b => String(b.date||'').startsWith(String(year))).reduce((s,b)=>s+Number(b.amount||0),0);
  const totalCoffers = coffers.filter(c => String(c.date||'').startsWith(String(year))).reduce((s,c)=>s+Number(c.amount||0),0);
  const grandTotal = transactions.reduce((s,t)=>s+Number(t.amount||0),0) + coffers.reduce((s,c)=>s+Number(c.amount||0),0) - beneficiaries.reduce((s,b)=>s+Number(b.amount||0),0);
  const recent = receipts.sort((a,b)=>String(b.createdAt||b.date).localeCompare(String(a.createdAt||a.date))).slice(0,10);
  root.innerHTML = `
    <div class="grid grid-4">
      <div class="stat"><span>Grand total / balance at hand</span><strong>${GWF.money(grandTotal)}</strong><small>Dues + coffers - payouts</small></div>
      <div class="stat"><span>Total members</span><strong>${members.length}</strong><small>${active} active · ${inactive} inactive · ${suspended} suspended</small></div>
      <div class="stat"><span>${year} dues collected</span><strong>${GWF.money(totalDues)}</strong><small>${yearPayments.length} payments</small></div>
      <div class="stat"><span>${year} coffers / payouts</span><strong>${GWF.money(totalCoffers - totalWelfare)}</strong><small>${GWF.money(totalCoffers)} in · ${GWF.money(totalWelfare)} out</small></div>
    </div>
    <div class="grid grid-2" style="margin-top:18px">
      <div class="card"><div class="card-header"><div><h3>Monthly dues trend</h3><p class="sub">Current year payment totals</p></div></div><canvas id="monthlyChart" height="135"></canvas><div id="chartFallback"></div></div>
      <div class="card"><div class="card-header"><div><h3>Member lookup</h3><p class="sub">Quickly search names or preserved member IDs</p></div></div><input class="search" id="lookup" placeholder="Search member..." style="width:100%;margin-bottom:12px"><div id="lookupResults" class="table-wrap"></div></div>
    </div>
    <div class="card" style="margin-top:18px"><div class="card-header"><div><h3>Recent receipts</h3><p class="sub">Last 10 generated receipts</p></div><a class="btn small secondary" href="receipts.html">View all</a></div><div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Date</th><th>Member</th><th>For</th><th>Amount</th><th>Mode</th></tr></thead><tbody>${recent.map(r=>`<tr><td><a href="receipts.html?id=${encodeURIComponent(r.id)}"><strong>${GWF.escape(r.receiptNo)}</strong></a></td><td>${GWF.escape(r.date)}</td><td>${GWF.escape(r.memberName)}</td><td>${GWF.escape(r.month)} ${GWF.escape(r.year)}</td><td>${GWF.money(r.amount)}</td><td>${GWF.escape(r.mode)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty-state">No receipts yet.</td></tr>'}</tbody></table></div></div>`;
  const monthly = GWF.months.map(m => yearPayments.filter(t=>String(t.month||'').slice(0,3).toLowerCase()===m.slice(0,3).toLowerCase()).reduce((s,t)=>s+Number(t.amount||0),0));
  if (window.Chart) new Chart(document.getElementById('monthlyChart'), {type:'bar',data:{labels:GWF.monthShort,datasets:[{label:'Dues',data:monthly,backgroundColor:'#16a34a',borderRadius:8}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
  else { document.getElementById('monthlyChart').remove(); const max=Math.max(...monthly,1); chartFallback.innerHTML=`<div class="chart-fallback">${monthly.map((v,i)=>`<div><strong>${GWF.monthShort[i]}</strong> ${GWF.money(v)}<div class="bar"><span style="width:${(v/max)*100}%"></span></div></div>`).join('')}</div>`; }
  function renderLookup(q=''){
    const rows = members.filter(m => !q || `${m.name} ${m.memberId} ${m.contact}`.toLowerCase().includes(q.toLowerCase())).slice(0,8);
    lookupResults.innerHTML = `<table><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Contact</th></tr></thead><tbody>${rows.map(m=>`<tr><td>${GWF.escape(m.memberId)}</td><td>${GWF.escape(m.name)}</td><td>${GWF.statusBadge(GWF.memberEffectiveStatus(m, transactions))}</td><td>${GWF.escape(m.contact||'')}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">No match</td></tr>'}</tbody></table>`;
    GWF.addTopScroller(lookupResults);
  }
  renderLookup(); lookup.addEventListener('input',e=>renderLookup(e.target.value));
})();
