// supabase/functions/check-subscription/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Shyiramo config yawe
const supabase = createClient(
  "https://cnmvsuaysgjbpklwycuk.supabase.co", // SUPABASE_URL yawe
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!  // SUPABASE_SERVICE_ROLE_KEY (secret)
);

// ✅ Channel ID ya GrooveKits
const CHANNEL_ID = "UCqP-UB1AiYf0JlerYEKxnaA";

serve(async (req) => {
  try {
    const { access_token, referrer_id, subscriber_email } = await req.json();

    if (!access_token || !referrer_id || !subscriber_email) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Reba niba email yarakoreshejwe (anti-fraud)
    const { data: existing } = await supabase
      .from("referrals")
      .select("*")
      .eq("subscriber_email", subscriber_email)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Email already used for referral." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 2. Reba kuri YouTube API niba uwo muntu ari subscriber
    const ytRes = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${CHANNEL_ID}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const ytData = await ytRes.json();

    if (ytData.items && ytData.items.length > 0) {
      // 3. Andika muri referrals
      await supabase.from("referrals").insert([
        {
          referrer_id,
          subscriber_email,
          rewarded: true,
        },
      ]);

      // 4. Ongeraho 1 GrooveCoin muri earnings
      await supabase.from("earnings").insert([
        {
          user_id: referrer_id,
          coins: 1,
          reason: "youtube_subscribe",
        },
      ]);

      return new Response(JSON.stringify({ success: true, message: "Referral rewarded with 1 GrooveCoin." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ error: "User is not subscribed to channel." }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
