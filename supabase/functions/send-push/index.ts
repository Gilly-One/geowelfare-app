import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const payload = await req.json();
    const { targetRole, targetMemberId, targetUserId, title, body, url, tag } = payload;
    const { data: rows, error } = await supabase.from("push_subscriptions").select("id,data");
    if (error) throw error;
    const targets = (rows || []).filter((row: any) => {
      const d = row.data || {};
      if (targetUserId && d.userId === targetUserId) return true;
      if (targetMemberId && d.memberId === targetMemberId) return true;
      if (targetRole && d.role === targetRole) return true;
      return false;
    });
    const notification = JSON.stringify({ title: title || "GMC Welfare", body: body || "New update", url: url || "/index.html", tag: tag || "gmc-welfare" });
    const results = [];
    for (const row of targets) {
      try {
        await webpush.sendNotification(row.data.subscription, notification);
        results.push({ id: row.id, ok: true });
      } catch (err) {
        results.push({ id: row.id, ok: false, error: String(err) });
        if ((err as any)?.statusCode === 404 || (err as any)?.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", row.id);
        }
      }
    }
    return new Response(JSON.stringify({ ok: true, sent: results.filter(r => r.ok).length, attempted: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
