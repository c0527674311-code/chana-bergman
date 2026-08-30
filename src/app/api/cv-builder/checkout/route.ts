import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Pricing/payment configuration for the CV-builder download.
 *
 * The gate is provider-agnostic: `PAYMENT_LINK` is any hosted payment page
 * (Grow/Meshulam, Cardcom, PayPal.me — whatever Chana opens). When a price is
 * set but no link is configured yet, the download stays free and says so,
 * instead of dead-ending the candidate.
 *
 * NOTE: without a provider webhook this is an honor-system gate — the client
 * confirms payment manually. Real enforcement needs the provider's webhook to
 * issue a signed download token; see README.
 */
export async function GET() {
  const price = Number(process.env.CV_BUILDER_PRICE_ILS ?? 0);
  const url = process.env.PAYMENT_LINK ?? "";

  if (!price || price <= 0 || !url) {
    return NextResponse.json({ mode: "free" as const });
  }
  return NextResponse.json({ mode: "paid" as const, price, url });
}
