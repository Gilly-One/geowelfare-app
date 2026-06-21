var GWF = window.GWF || (window.GWF = {});

GWF.auth = (() => {
  const sessionKey = 'gwf_session';
  let inactivityTimer = null;
  let inactivityStarted = false;
  const inactivityMs = 5 * 60 * 1000;
  function localSession(){ return JSON.parse(localStorage.getItem(sessionKey) || 'null'); }
  function setLocalSession(user){ user ? localStorage.setItem(sessionKey, JSON.stringify(user)) : localStorage.removeItem(sessionKey); }
  function clearAuthStorage(){
    localStorage.removeItem(sessionKey);
    sessionStorage.clear();
    // Remove Supabase auth cache keys so reopening tab requires login.
    Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-') || k.includes('supabase.auth')) localStorage.removeItem(k); });
  }
  GWF.currentUser = () => localSession();

  async function login(email, password){
    await GWF.db.init();
    email = String(email || '').trim();
    if (!email || !password) throw new Error('Email and password are required.');
    if (!email.includes('@')) throw new Error('Please enter a valid email address.');
    if (GWF.db.isSupabaseReady()) {
      const {data, error} = await GWF.db.supabaseClient().auth.signInWithPassword({email, password});
      if (error) throw error;
      const roleDoc = await GWF.db.get('users', data.user.id);
      const user = { id: data.user.id, email: data.user.email, displayName: roleDoc?.displayName || data.user.email, role: roleDoc?.role || 'member', memberDocId: roleDoc?.memberDocId || '', memberId: roleDoc?.memberId || '' };
      setLocalSession(user); return user;
    }
    if (GWF.db.isFirebaseReady()) {
      const cred = await GWF.db.firebaseAuth().signInWithEmailAndPassword(email, password);
      const roleDoc = await GWF.db.get('users', cred.user.uid);
      const user = { id: cred.user.uid, email: cred.user.email, displayName: roleDoc?.displayName || cred.user.email, role: roleDoc?.role || 'admin', memberDocId: roleDoc?.memberDocId || '', memberId: roleDoc?.memberId || '' };
      setLocalSession(user); return user;
    }
    const user = { id:'demo-user', email, displayName: email.split('@')[0] || 'Admin', role: email.includes('member') ? 'member' : 'admin' };
    setLocalSession(user); return user;
  }
  async function resetPassword(email){
    await GWF.db.init();
    email = String(email || '').trim();
    if (!email.includes('@')) throw new Error('Enter your registered email address.');
    if (GWF.db.isSupabaseReady()) {
      const redirectTo = location.origin + location.pathname.replace(/index\.html$/,'') + 'index.html';
      const {error} = await GWF.db.supabaseClient().auth.resetPasswordForEmail(email, {redirectTo});
      if (error) throw error;
      return;
    }
    if (GWF.db.isFirebaseReady()) return GWF.db.firebaseAuth().sendPasswordResetEmail(email);
    throw new Error('Password reset requires Supabase or Firebase mode.');
  }
  async function changePassword(newPassword){
    await GWF.db.init();
    if (GWF.db.isSupabaseReady()) {
      const {error} = await GWF.db.supabaseClient().auth.updateUser({password:newPassword});
      if (error) throw error;
      return;
    }
    if (GWF.db.isFirebaseReady()) {
      const user = GWF.db.firebaseAuth().currentUser;
      if (!user) throw new Error('Please log out and log in again before changing your password.');
      await user.updatePassword(newPassword); return;
    }
    throw new Error('Password change requires Supabase or Firebase mode.');
  }
  async function logout(reason=''){
    try { if (GWF.db.isSupabaseReady()) await GWF.db.supabaseClient().auth.signOut(); } catch(e) {}
    try { if (GWF.db.isFirebaseReady() && GWF.db.firebaseAuth()) await GWF.db.firebaseAuth().signOut(); } catch(e) {}
    clearAuthStorage();
    if (reason) localStorage.setItem('gwf_logout_reason', reason);
    location.href = 'index.html';
  }
  function resetInactivity(){
    if (!localSession()) return;
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(()=>logout('You were logged out after 5 minutes of inactivity.'), inactivityMs);
  }
  function startInactivityTimer(){
    if (inactivityStarted) return;
    inactivityStarted = true;
    ['mousemove','mousedown','keydown','touchstart','touchmove','scroll','click'].forEach(evt => window.addEventListener(evt, resetInactivity, {passive:true}));
    resetInactivity();
  }
  function requireAuth(adminOnly=false){
    const user = localSession();
    if (!user) { location.href = 'index.html'; return null; }
    if (adminOnly && user.role !== 'admin') { location.href = 'member-portal.html'; return null; }
    return user;
  }
  return { login, logout, requireAuth, resetPassword, changePassword, startInactivityTimer, clearAuthStorage };
})();
