import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const ADMIN_CONTACT_EMAIL = (Deno.env.get("ADMIN_CONTACT_EMAIL") || "").trim();
const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY") || "").trim();
const EMAIL_FROM = (Deno.env.get("CONTACT_EMAIL_FROM") || "Daybnb <no-reply@daybnb.local>").trim();

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRequestIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return null;
  // x-forwarded-for can be "client, proxy1, proxy2"
  return xff.split(",")[0]?.trim() || null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function sendEmailViaResend(params: {
  to: string;
  from: string;
  subject: string;
  text: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Resend error (${res.status}): ${txt}`);
  }

  return res.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" });
  }

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return json(500, {
        success: false,
        error: "Supabase server credentials not configured for this function",
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const ip = getRequestIp(req);

    const body = await req.json();
    const name = String(body?.name || "").trim();
    const mobile = String(body?.mobile || "").trim();
    const email = String(body?.email || "").trim();
    const city = String(body?.city || "").trim();
    const message = String(body?.message || "").trim();
    const source = String(body?.source || "web").trim();
    const userAgent = String(body?.userAgent || "").trim();
    const pageUrl = String(body?.pageUrl || "").trim();
    const submittedAt = String(body?.submittedAt || "").trim();
    const meta = typeof body?.meta === "object" ? body.meta : null;

    const userId = body?.userId ? String(body.userId) : null;

    if (!name || !mobile || !email || !city || !message) {
      return json(400, { success: false, error: "Missing required fields" });
    }
    if (!isValidEmail(email)) {
      return json(400, { success: false, error: "Invalid email address" });
    }
    if (message.length > 2000) {
      return json(400, { success: false, error: "Message is too long" });
    }

    // Basic rate-limit: max 5 submissions per IP per minute
    if (ip) {
      const since = new Date(Date.now() - 60_000).toISOString();
      const { count, error: countError } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", since);

      if (countError) {
        // don't hard-fail on rate-limit query; just proceed
        console.warn("Rate-limit query failed:", countError);
      } else if ((count || 0) >= 5) {
        return json(429, {
          success: false,
          error: "Too many requests. Please wait a minute and try again.",
        });
      }
    }

    const insertPayload = {
      user_id: userId,
      name,
      mobile,
      email,
      city,
      message,
      status: "new",
      source,
      page_url: pageUrl || null,
      user_agent: userAgent || null,
      ip,
      meta: meta || (submittedAt ? { submittedAt } : null),
    };

    const { data: inserted, error: insertError } = await supabase
      .from("contact_messages")
      .insert(insertPayload)
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("Failed to insert contact message:", insertError);
      return json(500, { success: false, error: insertError.message || "Failed to store message" });
    }

    // Optional email delivery to admin
    let emailed = false;
    let emailResult: unknown = null;
    let emailWarning: string | null = null;

    if (ADMIN_CONTACT_EMAIL && RESEND_API_KEY) {
      const subject = `Daybnb Contact: ${name} (${city})`;
      const text = [
        `New Contact Message`,
        ``,
        `Name: ${name}`,
        `Mobile: ${mobile}`,
        `Email: ${email}`,
        `City: ${city}`,
        ``,
        message,
        ``,
        `Message ID: ${inserted?.id || "N/A"}`,
        pageUrl ? `Page: ${pageUrl}` : "",
        ip ? `IP: ${ip}` : "",
        userAgent ? `UA: ${userAgent}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        emailResult = await sendEmailViaResend({
          to: ADMIN_CONTACT_EMAIL,
          from: EMAIL_FROM,
          subject,
          text,
        });
        emailed = true;
      } catch (e) {
        console.error("Failed to send admin email:", e);
        emailWarning = "Stored message but failed to send email.";
      }
    } else {
      emailWarning =
        "Stored message, but email delivery is not configured (set ADMIN_CONTACT_EMAIL and RESEND_API_KEY).";
    }

    return json(200, {
      success: true,
      stored: true,
      messageId: inserted?.id,
      createdAt: inserted?.created_at,
      emailed,
      emailResult,
      warning: emailWarning,
    });
  } catch (error) {
    console.error("contact-admin error:", error);
    return json(500, {
      success: false,
      error: error?.message || "Failed to send message",
    });
  }
});

