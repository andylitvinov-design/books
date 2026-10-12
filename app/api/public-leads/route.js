import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAppConfig, requireSameOrigin } from "@/lib/app/config";
import { consumeRate, transaction } from "@/lib/app/database";
import { seal } from "@/lib/app/crypto";
import { readBody, safeError } from "@/lib/app/http";
import { AppError, onlyKeys } from "@/lib/assessments/contracts";
import { normalizePublicLeadReceipt, publicLeadAttribution } from "@/lib/public-lead-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PUBLIC_LEAD_SCOPE_ID = "44c2b298-0f30-4d7d-9ab9-64455e9d6d01";
const RECEIPT_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(request) {
  try {
    const config = getAppConfig();
    requireSameOrigin(request, config);
    const body = await readBody(request, 4096);
    onlyKeys(body, ["email", "preferredContact", "topic", "locale", "consentToContact"]);
    const receipt = normalizePublicLeadReceipt(body);
    if (!receipt) throw new AppError("PUBLIC_LEAD_INVALID", 400);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    await consumeRate(config, { op: "public-lead", ip }, 5, 600);
    const id = randomUUID();
    const attribution = publicLeadAttribution(new URL(request.url).searchParams);
    const emailCiphertext = seal(receipt.email, { accountId: PUBLIC_LEAD_SCOPE_ID, recordId: id, field: "contact_email" }, config);
    await transaction(config, null, (db) => db.query(
      `insert into app.public_lead_receipts
        (id, contact_email_ciphertext, preferred_contact, topic, locale, utm_source, utm_medium, utm_campaign, utm_content, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'received')`,
      [id, emailCiphertext, receipt.preferredContact, receipt.topic, receipt.locale, attribution.source || null, attribution.medium || null, attribution.campaign || null, attribution.content || null],
    ), { server: true });
    return NextResponse.json({ status: "PUBLIC_LEAD_RECEIVED", receiptId: id }, { status: 201, headers: RECEIPT_HEADERS });
  } catch (error) {
    const safe = safeError(error);
    return NextResponse.json({ error: safe.code === "APP_UNAVAILABLE" ? "PUBLIC_LEAD_RECEIPT_UNAVAILABLE" : safe.code }, { status: safe.status, headers: RECEIPT_HEADERS });
  }
}
