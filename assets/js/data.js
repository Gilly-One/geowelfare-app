var GWF = window.GWF || (window.GWF = {});

GWF.db = (() => {
  const collections = ['members','transactions','receipts','beneficiaries','coffers','users','settings','announcements','documents','messages','push_subscriptions'];
  const prefix = 'gwf_';
  let firebaseReady = false;
  let supabaseReady = false;
  let firestore = null;
  let firebaseAuthObj = null;
  let supabaseClientObj = null;

  function hasSupabaseConfig(){
    const cfg = window.GWF_SUPABASE_CONFIG || {};
    return !!(cfg.url && cfg.anonKey && window.supabase);
  }
  function hasFirebaseConfig(){
    const cfg = window.GWF_FIREBASE_CONFIG || {};
    return !!(cfg.apiKey && cfg.projectId && window.firebase);
  }

  async function init(){
    if (hasSupabaseConfig()) {
      try {
        supabaseClientObj = window.supabase.createClient(window.GWF_SUPABASE_CONFIG.url, window.GWF_SUPABASE_CONFIG.anonKey);
        supabaseReady = true;
      } catch (e) { console.warn('Supabase init failed.', e); }
    }
    if (!supabaseReady && hasFirebaseConfig()) {
      try {
        if (!firebase.apps.length) firebase.initializeApp(window.GWF_FIREBASE_CONFIG);
        firestore = firebase.firestore();
        firebaseAuthObj = firebase.auth();
        firebaseReady = true;
      } catch (e) { console.warn('Firebase init failed; using localStorage demo mode.', e); }
    }
    ensureLocalSeeds();
    return { firebaseReady, supabaseReady };
  }

  function ensureLocalSeeds(){
    collections.forEach(c => { if (!localStorage.getItem(prefix+c)) localStorage.setItem(prefix+c, JSON.stringify([])); });
    if (!localStorage.getItem(prefix+'session')) localStorage.setItem(prefix+'session', JSON.stringify(null));
  }
  function localGet(col){ return JSON.parse(localStorage.getItem(prefix+col) || '[]'); }
  function localSet(col, rows){ localStorage.setItem(prefix+col, JSON.stringify(rows)); }
  function cleanDoc(doc){ return {id: doc.id, ...doc.data()}; }
  function fromDataRow(row){ return { id: row.id, ...(row.data || {}) }; }
  function toDataRow(payload){ const {id, ...data} = payload; return {id, data}; }

  async function all(col){
    if (supabaseReady) {
      // Supabase/PostgREST returns 1,000 rows by default. Page through all rows
      // so large imports, e.g. 1,139+ transactions, fully populate dashboards/reports.
      const pageSize = 1000;
      let start = 0;
      let output = [];
      while (true) {
        const {data, error} = await supabaseClientObj
          .from(col)
          .select('id,data')
          .range(start, start + pageSize - 1);
        if (error) throw error;
        const chunk = data || [];
        output = output.concat(chunk.map(fromDataRow));
        if (chunk.length < pageSize) break;
        start += pageSize;
      }
      return output;
    }
    if (firebaseReady) {
      const snap = await firestore.collection(col).get();
      return snap.docs.map(cleanDoc);
    }
    return localGet(col);
  }
  async function get(col, id){
    if (!id) return null;
    if (supabaseReady) {
      const {data, error} = await supabaseClientObj.from(col).select('id,data').eq('id', String(id)).maybeSingle();
      if (error) throw error;
      return data ? fromDataRow(data) : null;
    }
    if (firebaseReady) {
      const doc = await firestore.collection(col).doc(String(id)).get();
      return doc.exists ? cleanDoc(doc) : null;
    }
    return localGet(col).find(x => String(x.id) === String(id)) || null;
  }
  async function add(col, data){
    const now = new Date().toISOString();
    const payload = {...data, id: data.id || GWF.uid(col.slice(0,3)), createdAt: data.createdAt || now, updatedAt: now};
    if (supabaseReady) {
      const {error} = await supabaseClientObj.from(col).upsert(toDataRow(payload));
      if (error) throw error;
      return payload;
    }
    if (firebaseReady) {
      const ref = payload.id ? firestore.collection(col).doc(String(payload.id)) : firestore.collection(col).doc();
      payload.id = ref.id;
      await ref.set(payload, {merge:true});
      return payload;
    }
    const rows = localGet(col); rows.push(payload); localSet(col, rows); return payload;
  }
  async function update(col, id, data){
    const existing = await get(col, id) || {id};
    const payload = {...existing, ...data, id, updatedAt:new Date().toISOString()};
    if (supabaseReady) {
      const {error} = await supabaseClientObj.from(col).upsert(toDataRow(payload));
      if (error) throw error;
      return payload;
    }
    if (firebaseReady) {
      await firestore.collection(col).doc(String(id)).set(payload, {merge:true});
      return payload;
    }
    const rows = localGet(col); const i = rows.findIndex(x => String(x.id) === String(id));
    if (i >= 0) rows[i] = payload;
    localSet(col, rows); return payload;
  }
  async function remove(col, id){
    if (supabaseReady) {
      const {error} = await supabaseClientObj.from(col).delete().eq('id', String(id));
      if (error) throw error;
      return;
    }
    if (firebaseReady) return firestore.collection(col).doc(String(id)).delete();
    localSet(col, localGet(col).filter(x => String(x.id) !== String(id)));
  }
  async function bulkPut(col, rows){
    const normalized = rows.map(r => ({...r, id: r.id || GWF.uid(col.slice(0,3)), updatedAt:new Date().toISOString()}));
    if (supabaseReady) {
      for (let i = 0; i < normalized.length; i += 500) {
        const {error} = await supabaseClientObj.from(col).upsert(normalized.slice(i, i+500).map(toDataRow));
        if (error) throw error;
      }
      return normalized;
    }
    if (firebaseReady) {
      for (let i = 0; i < normalized.length; i += 450) {
        const batch = firestore.batch();
        normalized.slice(i, i+450).forEach(row => batch.set(firestore.collection(col).doc(String(row.id)), row, {merge:true}));
        await batch.commit();
      }
      return normalized;
    }
    const existing = localGet(col); existing.push(...normalized); localSet(col, existing); return normalized;
  }
  async function clear(col){
    if (supabaseReady) {
      const rows = await all(col);
      for (let i=0;i<rows.length;i+=500) {
        const ids = rows.slice(i,i+500).map(r=>r.id);
        if (ids.length) {
          const {error} = await supabaseClientObj.from(col).delete().in('id', ids);
          if (error) throw error;
        }
      }
      return;
    }
    if (firebaseReady) {
      const snap = await firestore.collection(col).get();
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const batch = firestore.batch(); docs.slice(i, i + 450).forEach(doc => batch.delete(doc.ref)); await batch.commit();
      }
      return;
    }
    localSet(col, []);
  }
  async function clearOperationalData(){ for (const col of ['members','transactions','receipts','beneficiaries','coffers']) await clear(col); }

  async function nextReceiptNo(year){
    const receipts = await all('receipts');
    const nums = receipts.map(r => String(r.receiptNo || '').match(/(\d+)$/)).filter(Boolean).map(m => Number(m[1]));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${GWF.settings.receiptPrefix}-${year}-${String(next).padStart(3,'0')}`;
  }

  async function createPayment(input){
    const members = await all('members');
    const member = members.find(m => String(m.id) === String(input.memberDocId) || String(m.memberId) === String(input.memberId));
    if (!member) throw new Error('Member not found.');
    if (String(member.status || '').toLowerCase() === 'retired') throw new Error('Retired members cannot receive new dues payments unless their saved status is changed by an admin.');
    const year = Number(input.year);
    const amount = GWF.parseAmount(input.amount || GWF.monthlyDuesForYear(year));
    const receiptNo = await nextReceiptNo(year);
    const transaction = await add('transactions', { memberDocId: member.id, memberId: member.memberId, memberName: member.name, date: input.date || GWF.todayISO(), month: input.month, year, amount, mode: input.mode || 'Cash', adminName: input.adminName || GWF.currentUser()?.displayName || GWF.settings.defaultAdminName, notes: input.notes || '', receiptNo });
    const receipt = await add('receipts', { receiptNo, transactionId: transaction.id, memberDocId: member.id, memberId: member.memberId, memberName: member.name, contact: member.contact || '', email: member.email || '', date: transaction.date, month: transaction.month, year: transaction.year, amount: transaction.amount, mode: transaction.mode, adminName: transaction.adminName, notes: transaction.notes });
    return {transaction, receipt};
  }

  function isFirebaseReady(){ return firebaseReady; }
  function isSupabaseReady(){ return supabaseReady; }
  function firebaseAuth(){ return firebaseAuthObj; }
  function supabaseClient(){ return supabaseClientObj; }
  function backendName(){ return supabaseReady ? 'Supabase' : firebaseReady ? 'Firebase' : 'Demo Local'; }
  return { init, all, get, add, update, remove, bulkPut, clear, clearOperationalData, createPayment, nextReceiptNo, isFirebaseReady, isSupabaseReady, firebaseAuth, supabaseClient, backendName };
})();
