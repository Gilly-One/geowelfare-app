var GWF = window.GWF || (window.GWF = {});
GWF.pwa = (() => {
  async function register(){
    if (!('serviceWorker' in navigator)) return null;
    try { return await navigator.serviceWorker.register('/service-worker.js'); }
    catch(e){ console.warn('Service worker registration failed', e); return null; }
  }
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }
  async function enablePush(){
    if (!GWF.db?.isSupabaseReady?.()) throw new Error('Push notifications require Supabase mode.');
    if (!('Notification' in window) || !('PushManager' in window)) throw new Error('This browser does not support web push notifications.');
    const vapid = window.GWF_PUSH_CONFIG?.vapidPublicKey || '';
    if (!vapid) throw new Error('VAPID public key is not configured yet.');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted.');
    const reg = await register();
    if (!reg) throw new Error('Service worker is not available.');
    const subscription = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array(vapid)});
    const user = GWF.currentUser();
    await GWF.db.add('push_subscriptions', {userId:user.id, role:user.role, memberId:user.memberId||'', subscription:subscription.toJSON(), userAgent:navigator.userAgent});
    return subscription;
  }
  async function sendPush(payload){
    if (!GWF.db?.isSupabaseReady?.()) return;
    if (!window.GWF_PUSH_CONFIG?.vapidPublicKey) return; // In-app notifications are used when Web Push is not configured.
    try {
      await GWF.db.supabaseClient().functions.invoke('send-push', { body: payload });
    } catch(e) { console.warn('Push send failed', e); }
  }
  return { register, enablePush, sendPush };
})();
GWF.pwa.register();
