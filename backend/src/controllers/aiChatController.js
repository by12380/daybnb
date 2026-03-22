const OpenAI = require("openai");
const { supabaseAdmin } = require("../config/supabase");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const OPENAI_MODEL = process.env.AI_CHAT_MODEL || "gpt-4o-mini";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
const AI_PROVIDER = (process.env.AI_CHAT_PROVIDER || "auto").toLowerCase();
const MAX_HISTORY_MESSAGES = 20;
const MAX_CONTEXT_ROOMS = 10;

const SYSTEM_PROMPT = `You are Daybnb AI, a friendly and knowledgeable assistant for the Daybnb platform — a daytime room/space booking service (like Airbnb but for day-use only).

Your role:
- Help guests with questions about rooms, bookings, payments, check-in/out, cancellations, and platform policies.
- Provide accurate information based on the context provided to you (room details, booking data, etc.).
- Be concise, warm, and professional. Use short paragraphs.
- If you don't have enough information to answer a specific question, say so honestly and suggest the user contact support via the human chat feature.
- Never make up room details, prices, or policies that aren't in your context.

Platform policies:
- Bookings are for daytime use only (not overnight stays).
- Payment methods: online (Stripe) or pay-at-property.
- Booking flow: guest books → owner/admin approves → guest pays (if online) → confirmed → check-in → check-out.
- Cancellation: guests can cancel anytime before check-in. Cancelled bookings are soft-deleted (status changes to "cancelled").
- Check-in/out is managed by the property owner or admin on the day of booking.
- Reviews: one review per user per room (1-5 stars + comment).
- Offers/discounts may apply at room-level, owner-level, or site-wide.

If the user asks about a specific room, use the room context provided. If they ask about their bookings, use the booking context provided. If no context is available for their question, give general guidance.

Do NOT use markdown headers (# or ##). Use plain text with line breaks. You may use bullet points and bold (**text**) sparingly for clarity.`;

function getConfiguredProviders() {
  const providers = [];

  if (openai) providers.push("openai");
  if (GEMINI_API_KEY) providers.push("gemini");

  if (AI_PROVIDER === "gemini") {
    return ["gemini", "openai"].filter((provider) => providers.includes(provider));
  }

  if (AI_PROVIDER === "openai") {
    return ["openai", "gemini"].filter((provider) => providers.includes(provider));
  }

  return providers;
}

function getModelForProvider(provider) {
  return provider === "gemini" ? GEMINI_MODEL : OPENAI_MODEL;
}

function getAiConfigError() {
  return "AI chat is not configured. Set OPENAI_API_KEY or GEMINI_API_KEY in backend .env";
}

function shouldFallbackToNextProvider(err) {
  const status = Number(err?.status || err?.statusCode || 0);
  const message = String(
    err?.message || err?.error?.message || err?.cause?.message || ""
  ).toLowerCase();

  return (
    status === 429 ||
    status >= 500 ||
    /high demand|rate limit|quota|resource exhausted|overloaded|temporarily unavailable|timeout|timed out|network/i.test(
      message
    )
  );
}

function getUserFacingAiError(err) {
  if (err instanceof ApiError) return err;

  return ApiError.internal(
    shouldFallbackToNextProvider(err)
      ? "AI service is currently experiencing high demand. Please try again in a moment."
      : "Failed to generate AI response. Please try again."
  );
}

function buildGeminiContents(chatMessages) {
  return chatMessages
    .filter((message) => message.role !== "system" && String(message.content || "").trim())
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: String(message.content || "") }],
    }));
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part?.text || "").join("");
}

async function requestGemini(chatMessages, { stream = false } = {}) {
  const endpoint = stream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL
      )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(GEMINI_API_KEY)}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL
      )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: chatMessages[0]?.content || SYSTEM_PROMPT }],
      },
      contents: buildGeminiContents(chatMessages),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const err = new Error(
      `Gemini request failed (${response.status}): ${errorText || response.statusText}`
    );
    err.status = response.status;
    throw err;
  }

  return response;
}

async function generateWithOpenAI(chatMessages) {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: chatMessages,
    max_tokens: 1024,
    temperature: 0.7,
  });

  return {
    reply: completion.choices?.[0]?.message?.content || "",
    model: OPENAI_MODEL,
    provider: "openai",
    usage: completion.usage || null,
  };
}

async function generateWithGemini(chatMessages) {
  const response = await requestGemini(chatMessages);
  const payload = await response.json();

  return {
    reply: extractGeminiText(payload),
    model: GEMINI_MODEL,
    provider: "gemini",
    usage: payload.usageMetadata || null,
  };
}

async function generateAiResponse(chatMessages) {
  const providers = getConfiguredProviders();
  if (!providers.length) {
    throw ApiError.internal(getAiConfigError());
  }

  let lastError = null;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    const hasFallback = index < providers.length - 1;

    try {
      if (provider === "gemini") {
        return await generateWithGemini(chatMessages);
      }

      return await generateWithOpenAI(chatMessages);
    } catch (err) {
      lastError = err;
      console.error(
        `[AI Chat] ${provider} (${getModelForProvider(provider)}) error:`,
        err.message || err
      );

      if (!hasFallback || !shouldFallbackToNextProvider(err)) {
        throw err;
      }
    }
  }

  throw lastError || ApiError.internal("Failed to generate AI response. Please try again.");
}

async function streamWithOpenAI(chatMessages, res) {
  const stream = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: chatMessages,
    max_tokens: 1024,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  return { model: OPENAI_MODEL, provider: "openai" };
}

async function streamWithGemini(chatMessages, res) {
  const response = await requestGemini(chatMessages, { stream: true });
  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const lines = event.split("\n");

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith("data:")) continue;

        const jsonText = trimmedLine.slice(5).trim();
        if (!jsonText || jsonText === "[DONE]") continue;

        const payload = JSON.parse(jsonText);
        const content = extractGeminiText(payload);

        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    const lines = buffer.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith("data:")) continue;

      const jsonText = trimmedLine.slice(5).trim();
      if (!jsonText || jsonText === "[DONE]") continue;

      const payload = JSON.parse(jsonText);
      const content = extractGeminiText(payload);

      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
  }

  return { model: GEMINI_MODEL, provider: "gemini" };
}

async function streamAiResponse(chatMessages, res) {
  const providers = getConfiguredProviders();
  if (!providers.length) {
    throw ApiError.internal(getAiConfigError());
  }

  let lastError = null;

  for (let index = 0; index < providers.length; index += 1) {
    const provider = providers[index];
    const hasFallback = index < providers.length - 1;

    try {
      if (provider === "gemini") {
        return await streamWithGemini(chatMessages, res);
      }

      return await streamWithOpenAI(chatMessages, res);
    } catch (err) {
      lastError = err;
      console.error(
        `[AI Chat] ${provider} (${getModelForProvider(provider)}) stream error:`,
        err.message || err
      );

      if (!hasFallback || !shouldFallbackToNextProvider(err)) {
        throw err;
      }
    }
  }

  throw lastError || ApiError.internal("Failed to generate AI response. Please try again.");
}

async function fetchRoomContext() {
  if (!supabaseAdmin) return "";

  const { data: rooms } = await supabaseAdmin
    .from("rooms")
    .select(
      "id, title, location, type, guests, price_per_day, property_type, place_type, bedrooms, beds, bathrooms, amenities, instant_book, allows_pets, self_checkin"
    )
    .limit(MAX_CONTEXT_ROOMS)
    .order("created_at", { ascending: false });

  if (!rooms?.length) return "";

  const lines = rooms.map(
    (r) =>
      `- "${r.title}" in ${r.location || "N/A"} | ${r.type} | $${r.price_per_day}/day | ${r.guests} guests | ${r.bedrooms}BR/${r.beds}Beds/${r.bathrooms}BA | Amenities: ${(r.amenities || []).join(", ") || "N/A"} | Instant book: ${r.instant_book ? "Yes" : "No"} | Pets: ${r.allows_pets ? "Yes" : "No"} | Self check-in: ${r.self_checkin ? "Yes" : "No"}`
  );

  return `\n\nAvailable rooms on the platform:\n${lines.join("\n")}`;
}

async function fetchBookingContext(userId) {
  if (!supabaseAdmin || !userId) return "";

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, room_id, booking_date, total_price, status, payment_method, payment_status, created_at"
    )
    .eq("user_id", userId)
    .order("booking_date", { ascending: false })
    .limit(10);

  if (!bookings?.length) return "";

  const roomIds = [...new Set(bookings.map((b) => b.room_id).filter(Boolean))];
  let roomMap = {};
  if (roomIds.length) {
    const { data: rooms } = await supabaseAdmin
      .from("rooms")
      .select("id, title, location")
      .in("id", roomIds);
    if (rooms) {
      roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]));
    }
  }

  const lines = bookings.map((b) => {
    const room = roomMap[b.room_id];
    return `- Booking on ${b.booking_date} | Room: "${room?.title || b.room_id}" in ${room?.location || "N/A"} | Status: ${b.status} | Total: $${b.total_price} | Payment: ${b.payment_method} (${b.payment_status})`;
  });

  return `\n\nUser's bookings:\n${lines.join("\n")}`;
}

async function fetchActiveOffers() {
  if (!supabaseAdmin) return "";

  const today = new Date().toISOString().split("T")[0];
  const { data: offers } = await supabaseAdmin
    .from("offers")
    .select("title, description, discount_type, discount_value, start_date, end_date")
    .eq("is_active", true)
    .lte("start_date", today)
    .gte("end_date", today)
    .limit(5);

  if (!offers?.length) return "";

  const lines = offers.map(
    (o) =>
      `- "${o.title}": ${o.discount_value}${o.discount_type === "percentage" ? "%" : "$"} off${o.description ? ` — ${o.description}` : ""} (valid ${o.start_date} to ${o.end_date})`
  );

  return `\n\nCurrent active offers/discounts:\n${lines.join("\n")}`;
}

// ── Main chat endpoint ──────────────────────────────────────
const chat = asyncHandler(async (req, res) => {
  if (!getConfiguredProviders().length) {
    throw ApiError.internal(getAiConfigError());
  }

  const { messages, sessionId, guestEmail } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw ApiError.badRequest("messages array is required");
  }

  const userId = req.user?.id || null;

  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.text || m.content || "",
  }));

  const [roomContext, bookingContext, offerContext] = await Promise.all([
    fetchRoomContext(),
    fetchBookingContext(userId),
    fetchActiveOffers(),
  ]);

  const fullSystemPrompt =
    SYSTEM_PROMPT + roomContext + bookingContext + offerContext;

  const chatMessages = [
    { role: "system", content: fullSystemPrompt },
    ...recentMessages,
  ];

  if (sessionId && supabaseAdmin) {
    await supabaseAdmin.from("ai_chat_sessions").upsert(
      {
        id: sessionId,
        user_id: userId,
        guest_email: guestEmail || null,
        last_active_at: new Date().toISOString(),
        message_count: messages.length,
      },
      { onConflict: "id" }
    );
  }

  try {
    const response = await generateAiResponse(chatMessages);
    res.json(response);
  } catch (err) {
    throw getUserFacingAiError(err);
  }
});

// ── Streaming chat endpoint ─────────────────────────────────
const chatStream = asyncHandler(async (req, res) => {
  if (!getConfiguredProviders().length) {
    throw ApiError.internal(getAiConfigError());
  }

  const { messages, sessionId, guestEmail } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw ApiError.badRequest("messages array is required");
  }

  const userId = req.user?.id || null;

  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.text || m.content || "",
  }));

  const [roomContext, bookingContext, offerContext] = await Promise.all([
    fetchRoomContext(),
    fetchBookingContext(userId),
    fetchActiveOffers(),
  ]);

  const fullSystemPrompt =
    SYSTEM_PROMPT + roomContext + bookingContext + offerContext;

  const chatMessages = [
    { role: "system", content: fullSystemPrompt },
    ...recentMessages,
  ];

  if (sessionId && supabaseAdmin) {
    supabaseAdmin
      .from("ai_chat_sessions")
      .upsert(
        {
          id: sessionId,
          user_id: userId,
          guest_email: guestEmail || null,
          last_active_at: new Date().toISOString(),
          message_count: messages.length,
        },
        { onConflict: "id" }
      )
      .then(() => {})
      .catch((err) =>
        console.error("[AI Chat] session upsert error:", err.message)
      );
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    await streamAiResponse(chatMessages, res);
    res.write("data: [DONE]\n\n");
  } catch (err) {
    const userMessage = shouldFallbackToNextProvider(err)
      ? "I'm currently experiencing high demand. Please try again in a moment."
      : "Sorry, something went wrong generating a response. Please try again.";
    res.write(`data: ${JSON.stringify({ error: userMessage })}\n\n`);
    res.write("data: [DONE]\n\n");
  }

  res.end();
});

// ── Quick prompts endpoint (returns suggested prompts) ──────
const getQuickPrompts = asyncHandler(async (req, res) => {
  const prompts = [
    { label: "How to book?", text: "How do I book a room on Daybnb?" },
    {
      label: "Cancellation policy",
      text: "What is the cancellation policy?",
    },
    {
      label: "Payment methods",
      text: "What payment methods do you accept?",
    },
    {
      label: "Check-in process",
      text: "How does the check-in process work?",
    },
    {
      label: "Available rooms",
      text: "What rooms are currently available?",
    },
    {
      label: "My bookings",
      text: "Can you show me my booking details?",
    },
  ];

  res.json({ prompts });
});

module.exports = {
  chat,
  chatStream,
  getQuickPrompts,
};
