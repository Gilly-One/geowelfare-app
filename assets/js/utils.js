var GWF = window.GWF || (window.GWF = {});

GWF.settings = window.GWF_APP_SETTINGS || {
  organizationName: 'GMC Geology Department Welfare', appName: 'GMC Geology Department Welfare v1.0.3', shortName: 'GMC', monthlyDues: 50, currency: 'GHS', receiptPrefix: 'GWF', defaultAdminName: 'Admin'
};

GWF.months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
GWF.monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

GWF.uid = (prefix='id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
GWF.todayISO = () => new Date().toISOString().slice(0,10);
GWF.currentYear = () => new Date().getFullYear();
GWF.monthlyDuesForYear = (year=GWF.currentYear()) => Number(year) >= 2027 ? 100 : 50;
GWF.money = (value=0) => `${GWF.settings.currency} ${Number(value || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
GWF.escape = (v='') => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
GWF.normalize = v => String(v ?? '').trim().toLowerCase();
GWF.toDateInput = value => {
  if (!value) return '';
  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899,11,30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + value);
    return excelEpoch.toISOString().slice(0,10);
  }
  const d = new Date(value);
  return isNaN(d) ? String(value).slice(0,10) : d.toISOString().slice(0,10);
};
GWF.toast = (message, type='info') => {
  let box = document.querySelector('.toast');
  if (!box) { box = document.createElement('div'); box.className = 'toast'; document.body.appendChild(box); }
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.textContent = message;
  if (type === 'error') item.style.background = '#b42318';
  if (type === 'success') item.style.background = '#166534';
  box.appendChild(item);
  setTimeout(()=> item.remove(), 4200);
};
GWF.downloadText = (filename, content, mime='text/plain') => {
  const blob = new Blob([content], {type:mime});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
};
GWF.toCSV = rows => rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
GWF.getQuery = name => new URLSearchParams(location.search).get(name);
GWF.statusBadge = status => `<span class="badge ${GWF.escape(String(status||'').toLowerCase())}">${GWF.escape(status || 'Unknown')}</span>`;
GWF.parseAmount = value => Number(String(value ?? 0).replace(/[^0-9.-]/g,'')) || 0;
GWF.whatsAppUrl = (phone, text) => {
  const cleaned = String(phone || '').replace(/[^0-9]/g,'');
  const target = cleaned ? `/${cleaned}` : '';
  return `https://wa.me${target}?text=${encodeURIComponent(text)}`;
};
GWF.receiptText = receipt => [
  `${GWF.settings.organizationName}`,
  `Receipt: ${receipt.receiptNo}`,
  `Date: ${receipt.date || ''}`,
  `Member: ${receipt.memberName || ''}`,
  `Member ID: ${receipt.memberId || ''}`,
  `For: ${receipt.month || ''} ${receipt.year || ''}`,
  `Amount: ${GWF.money(receipt.amount)}`,
  `Mode: ${receipt.mode || ''}`,
  `Received by: ${receipt.adminName || ''}`,
  `Thank you.`
].join('\n');
GWF.renderReceiptHTML = receipt => `
  <div class="receipt" id="receiptPrintArea">
    <div class="receipt-head">
      <div style="font-weight:900;color:#14532d">${GWF.escape(GWF.settings.shortName)}</div>
      <h1>${GWF.escape(GWF.settings.organizationName)}</h1>
      <p>Official Welfare Payment Receipt</p>
    </div>
    <div class="receipt-meta">
      <div><strong>Receipt No:</strong> ${GWF.escape(receipt.receiptNo)}</div>
      <div><strong>Date:</strong> ${GWF.escape(receipt.date || '')}</div>
      <div><strong>Member:</strong> ${GWF.escape(receipt.memberName || '')}</div>
      <div><strong>Member ID:</strong> ${GWF.escape(receipt.memberId || '')}</div>
    </div>
    <div style="margin:18px 0">
      <div class="receipt-row"><span>Payment Month</span><strong>${GWF.escape(receipt.month || '')} ${GWF.escape(receipt.year || '')}</strong></div>
      <div class="receipt-row"><span>Payment Mode</span><strong>${GWF.escape(receipt.mode || '')}</strong></div>
      <div class="receipt-row"><span>Transaction Notes</span><strong>${GWF.escape(receipt.notes || '-')}</strong></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:24px">
      <div><span style="color:#667085">Amount received</span><div class="receipt-amount">${GWF.money(receipt.amount)}</div></div>
      <div style="text-align:center;min-width:180px;border-top:1px solid #111827;padding-top:8px">${GWF.escape(receipt.adminName || 'Admin')}<br><small>Received by</small></div>
    </div>
  </div>`;

GWF.monthsBetween = (fromDate, toDate=new Date()) => {
  const from = fromDate ? new Date(fromDate) : null;
  const to = new Date(toDate);
  if (!from || isNaN(from)) return Infinity;
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + ((to.getDate() < from.getDate()) ? -1 : 0);
};
GWF.lastPaymentDateForMember = (member, transactions=[]) => {
  const ids = [String(member?.id || ''), String(member?.memberId || '')];
  const dates = transactions
    .filter(t => ids.includes(String(t.memberDocId || '')) || ids.includes(String(t.memberId || '')))
    .map(t => t.date || (t.year && t.month ? `${t.year}-${String(GWF.months.indexOf(t.month)+1).padStart(2,'0')}-01` : ''))
    .filter(Boolean)
    .map(d => new Date(d))
    .filter(d => !isNaN(d));
  if (!dates.length) return '';
  return new Date(Math.max(...dates.map(d=>d.getTime()))).toISOString().slice(0,10);
};
GWF.memberEffectiveStatus = (member, transactions=[], asOf=new Date()) => {
  if (String(member?.status || '').toLowerCase() === 'retired') return 'Retired';
  const last = GWF.lastPaymentDateForMember(member, transactions) || member?.dateJoined;
  const months = GWF.monthsBetween(last, asOf);
  if (months > 6) return 'Suspended';
  if (months > 3) return 'Inactive';
  return 'Active';
};
GWF.mailtoReceiptUrl = receipt => {
  const subject = `${GWF.settings.organizationName} Receipt ${receipt.receiptNo}`;
  const body = GWF.receiptText(receipt);
  return `mailto:${encodeURIComponent(receipt.email || '')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
GWF.downloadElementImage = async (elementId, filename='export.png', type='png') => {
  const el = document.getElementById(elementId);
  if (!el) return GWF.toast('Nothing to export.', 'error');
  if (!window.html2canvas) return GWF.toast('Image export library not loaded. Check internet connection.', 'error');
  const canvas = await html2canvas(el, {scale:2, backgroundColor:'#ffffff', scrollX:0, scrollY:0});
  const mime = type === 'jpeg' || type === 'jpg' ? 'image/jpeg' : 'image/png';
  const a = document.createElement('a');
  a.href = canvas.toDataURL(mime, 0.95);
  a.download = filename;
  a.click();
};
GWF.printReceiptOnly = () => {
  const el = document.getElementById('receiptPrintArea');
  if (!el) return GWF.toast('No receipt is visible.', 'error');
  const w = window.open('', '_blank', 'width=850,height=900');
  const css = Array.from(document.styleSheets).map(ss => {
    try { return Array.from(ss.cssRules || []).map(r => r.cssText).join('\n'); } catch(e) { return ''; }
  }).join('\n');
  w.document.write(`<!doctype html><html><head><title>Receipt</title><style>${css} body{background:#fff;padding:24px}.receipt{box-shadow:none}</style></head><body>${el.outerHTML}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}<\/script></body></html>`);
  w.document.close();
};
GWF.fileToDataUrl = file => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
GWF.formatBytes = bytes => {
  const n = Number(bytes || 0);
  if (n < 1024) return `${n}B`;
  if (n < 1024*1024) return `${(n/1024).toFixed(1)}KB`;
  return `${(n/1024/1024).toFixed(1)}MB`;
};
GWF.allowedUploadExtensions = ['jpg','jpeg','png','pdf','doc','docx'];
GWF.validateUploadFiles = (files, opts={}) => {
  const list = Array.from(files || []);
  const maxFiles = opts.maxFiles || 1;
  const maxMB = opts.maxMB || 5;
  const totalMaxMB = opts.totalMaxMB || maxFiles * maxMB;
  if (list.length > maxFiles) throw new Error(`Maximum ${maxFiles} file(s) allowed.`);
  const total = list.reduce((s,f)=>s+f.size,0);
  if (total > totalMaxMB * 1024 * 1024) throw new Error(`Total upload size cannot exceed ${totalMaxMB}MB.`);
  list.forEach(file => {
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    if (!GWF.allowedUploadExtensions.includes(ext)) throw new Error(`${file.name} is not allowed. Allowed: JPG, PNG, PDF, DOC, DOCX.`);
    if (file.size > maxMB * 1024 * 1024) throw new Error(`${file.name} exceeds ${maxMB}MB per-file limit.`);
  });
  return list;
};
GWF.compressImageIfNeeded = async (file, thresholdMB=2) => {
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  if (!['jpg','jpeg','png'].includes(ext) || file.size <= thresholdMB * 1024 * 1024) return file;
  const dataUrl = await GWF.fileToDataUrl(file);
  const img = await new Promise((resolve, reject) => { const im = new Image(); im.onload=()=>resolve(im); im.onerror=reject; im.src=dataUrl; });
  const maxSide = 1600;
  let {width, height} = img;
  if (Math.max(width,height) > maxSide) {
    const ratio = maxSide / Math.max(width,height);
    width = Math.round(width * ratio); height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, ext === 'png' ? 0.85 : 0.78));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name, {type:mime, lastModified:Date.now()});
};
GWF.setUploadProgress = (el, text, pct=0) => {
  if (!el) return;
  el.innerHTML = `<div class="upload-progress"><div style="width:${Math.max(0,Math.min(100,pct))}%"></div></div><small>${GWF.escape(text)}</small>`;
};
GWF.safeFileName = name => String(name || 'file').replace(/[^a-z0-9._-]+/gi,'-').replace(/-+/g,'-');
GWF.openStoredFile = async (file) => {
  try {
    if (file?.storageBucket && file?.storagePath && GWF.db?.isSupabaseReady?.()) {
      const {data, error} = await GWF.db.supabaseClient().storage.from(file.storageBucket).createSignedUrl(file.storagePath, 60 * 10);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
      return;
    }
    if (file?.url) { window.open(file.url, '_blank'); return; }
    GWF.toast('File is not available.', 'error');
  } catch(err) { GWF.toast(err.message || 'Could not open file.', 'error'); }
};
GWF.openDocumentFile = async (doc) => {
  try {
    return GWF.openStoredFile(doc);
  } catch(err) { GWF.toast(err.message || 'Could not open document.', 'error'); }
};
GWF.addTopScroller = (wrap) => {
  if (!wrap || wrap.previousElementSibling?.classList?.contains('top-scroll')) return;
  const top = document.createElement('div');
  top.className = 'top-scroll no-print';
  top.innerHTML = `<div style="height:1px;width:${wrap.scrollWidth}px"></div>`;
  wrap.parentNode.insertBefore(top, wrap);
  const syncWidth = () => { top.firstElementChild.style.width = `${wrap.scrollWidth}px`; };
  top.addEventListener('scroll', () => wrap.scrollLeft = top.scrollLeft);
  wrap.addEventListener('scroll', () => top.scrollLeft = wrap.scrollLeft);
  setTimeout(syncWidth, 50);
  window.addEventListener('resize', syncWidth);
};

GWF.printElement = id => window.print();
GWF.downloadReceiptPDF = async (filename='receipt.pdf') => {
  const el = document.getElementById('receiptPrintArea');
  if (!el) return GWF.toast('No receipt is visible.', 'error');
  if (window.jspdf && window.html2canvas) {
    const canvas = await html2canvas(el, {scale:2, backgroundColor:'#ffffff'});
    const img = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p','mm','a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 20;
    const imgH = canvas.height * imgW / canvas.width;
    pdf.addImage(img, 'PNG', 10, 10, imgW, Math.min(imgH, pageH - 20));
    pdf.save(filename);
  } else {
    GWF.toast('PDF libraries not loaded; opening browser print instead.', 'error');
    window.print();
  }
};
