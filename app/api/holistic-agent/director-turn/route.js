import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/assessments/contracts";
import { getAppConfig } from "@/lib/app/config";
import { consumeRate } from "@/lib/app/database";
import { PRIVATE_HEADERS } from "@/lib/app/http";
import { detectConversationLocale } from "@/lib/holistic-support/conversation-locale.mjs";
import { planJudgmentTurn } from "@/lib/holistic-support/judgment-mind.mjs";
import { ruleConversationReply } from "@/lib/holistic-support/rule-conversation.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCALES = new Set(["ru", "en", "es"]);
const SERVICE_AUDIENCE = "holistic-house-ai-advisor";

function unauthorized() {
  return NextResponse.json({ error: "DIRECTOR_AUTH_REQUIRED" }, { status: 401, headers: PRIVATE_HEADERS });
}
function equalHex(a, b) {
  if (!/^[a-f0-9]{64}$/i.test(a) || !/^[a-f0-9]{64}$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
function safeHistory(value) {
  if (!Array.isArray(value) || value.length > 6) throw new AppError("INVALID_ADVISOR_HISTORY", 400);
  return value.map(row => {
    if (!row || !["user", "assistant"].includes(row.role) || typeof row.text !== "string" || row.text.length > 800)
      throw new AppError("INVALID_ADVISOR_HISTORY", 400);
    return { role: row.role, text: row.text.trim() };
  });
}
function handoff(locale) {
  return ({
    ru: "Похоже, здесь нужна поддержка живого специалиста. Я не буду делать предположений или давать рискованные рекомендации. При непосредственной опасности обратитесь в местную экстренную службу.",
    en: "This may need support from a qualified person. I won't guess or offer risky recommendations. If there is immediate danger, contact local emergency services.",
    es: "Puede ser importante hablar con un profesional cualificado. No haré suposiciones ni daré recomendaciones arriesgadas. Si existe peligro inmediato, contacta con los servicios de emergencia locales.",
  })[locale];
}

export async function POST(request) {
  try {
    if (process.env.HH_AGENT_DIRECTOR_BRIDGE_ENABLED !== "true") throw new AppError("DIRECTOR_BRIDGE_DISABLED", 503);
    const secret = process.env.HH_AGENT_DIRECTOR_BRIDGE_SECRET || "";
    if (secret.length < 32) throw new AppError("DIRECTOR_BRIDGE_NOT_CONFIGURED", 503);

    const timestamp = request.headers.get("x-hh-director-timestamp") || "";
    const requestId = request.headers.get("x-hh-director-request-id") || "";
    const signature = request.headers.get("x-hh-director-signature") || "";
    if (!/^\d{10}$/.test(timestamp) || !UUID.test(requestId)) return unauthorized();
    const seconds = Math.floor(Date.now() / 1000);
    if (Math.abs(seconds - Number(timestamp)) > 90) return unauthorized();

    const raw = await request.text();
    if (raw.length > 12000) throw new AppError("PAYLOAD_TOO_LARGE", 413);
    const expected = createHmac("sha256", secret)
      .update(timestamp + "." + requestId + "." + SERVICE_AUDIENCE + "." + raw)
      .digest("hex");
    if (!equalHex(signature, expected)) return unauthorized();

    let body;
    try { body = JSON.parse(raw); } catch { throw new AppError("INVALID_JSON", 400); }
    if (!body || body.schemaVersion !== 1 || body.audience !== SERVICE_AUDIENCE ||
        body.actor !== "verified-director-owner" || body.requestId !== requestId ||
        typeof body.message !== "string" || body.message.trim().length < 2 ||
        body.message.length > 1200 || !LOCALES.has(body.locale)) {
      throw new AppError("INVALID_ADVISOR_INPUT", 400);
    }
    const history = safeHistory(body.history || []);
    const config = getAppConfig();
    await consumeRate(config, { op: "director-advisor-minute", actorId: "verified-director-owner" }, 10, 60);
    await consumeRate(config, { op: "director-advisor-daily", actorId: "verified-director-owner" }, 100, 86400);

    const locale = detectConversationLocale(body.message, body.locale);
    const riskyCue = /(?:боль в груди|не могу дышать|трудно дышать|меня бьют|физическое насилие|не хочу жить|хочу умереть|суицид|самоубийств|chest pain|cannot breathe|can't breathe|trouble breathing|domestic violence|i want to die|kill myself|suicide|dolor en el pecho|no puedo respirar|violencia domestica|quiero morir|suicidarme)/iu;
    const recentUnsafe = history.some(turn => turn.role === "user" && riskyCue.test(turn.text));
    if (riskyCue.test(body.message) || recentUnsafe) {
      return NextResponse.json({
        schemaVersion: 1, requestId, status: "safety_handoff", reply: handoff(locale),
        source: "holistic-house-safety-gate", modelUsed: false, reportType: "ADVISORY_ONLY",
      }, { headers: PRIVATE_HEADERS });
    }

    const judgment = planJudgmentTurn({
      message: body.message, locale, history, safety: { status: "clear" },
    });
    const reviewed = judgment.status !== "abstain"
      ? { reply: judgment.reply, source: "judgment-rules", status: judgment.status }
      : null;
    const conversational = reviewed || ruleConversationReply({
      message: body.message, locale,
      history: history.map(turn => ({ role: turn.role, text: turn.text })),
    });
    if (!conversational || typeof conversational.reply !== "string" || !conversational.reply.trim()) {
      throw new AppError("ADVISOR_NO_RESPONSE", 503);
    }
    return NextResponse.json({
      schemaVersion: 1, requestId, status: conversational.status || "answered",
      reply: conversational.reply.slice(0, 3000),
      source: conversational.source || "holistic-house-reviewed-rules",
      modelUsed: false, reportType: "ADVISORY_ONLY",
    }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 503;
    const code = /^[A-Z0-9_]{2,80}$/.test(error?.code || error?.message || "") ? (error.code || error.message) : "ADVISOR_UNAVAILABLE";
    return NextResponse.json({ error: code }, { status, headers: PRIVATE_HEADERS });
  }
}
