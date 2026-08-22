/**
 * LNURL-pay / Lightning Address helpers.
 * Resolves user@domain → invoice (BOLT11).
 */

export type LnurlPayRequest = {
  callback: string
  minSendable: number
  maxSendable: number
  metadata: string
  commentAllowed?: number
}

export type LightningInvoice = {
  bolt11: string
  paymentHash?: string
  amountMsats: number
  lud16: string
}

function isLightningAddress(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

function lnurlpUrlFromAddress(lud16: string): string {
  const [user, domain] = lud16.trim().split("@")
  if (!user || !domain) {
    throw new Error("Invalid Lightning Address")
  }
  return `https://${domain}/.well-known/lnurlp/${encodeURIComponent(user)}`
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })
  if (!response.ok) {
    throw new Error(`LNURL request failed (${response.status})`)
  }
  return response.json()
}

/**
 * Convert order total + currency into millisatoshis for LNURL-pay.
 * - BTC: total is BTC amount
 * - otherwise: total is treated as sats (MVP; use BTC currency for precise amounts)
 */
export function totalToMsats(total: string, currency: string): number {
  const value = parseFloat(String(total).replace(",", "."))
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Invalid payment amount")
  }
  if (currency.toUpperCase() === "BTC") {
    return Math.round(value * 100_000_000_000)
  }
  // Treat non-BTC totals as sats for Lightning MVP demos
  return Math.round(value * 1000)
}

export class LightningService {
  async resolveLnurlPay(lud16: string): Promise<LnurlPayRequest> {
    if (!isLightningAddress(lud16)) {
      throw new Error("Company has no valid Lightning Address (lud16)")
    }
    const url = lnurlpUrlFromAddress(lud16)
    const data = await fetchJson(url)
    if (data.status === "ERROR") {
      throw new Error(data.reason || "LNURL-pay error")
    }
    if (!data.callback || data.tag !== "payRequest") {
      throw new Error("Invalid LNURL-pay response")
    }
    return {
      callback: data.callback,
      minSendable: data.minSendable,
      maxSendable: data.maxSendable,
      metadata: data.metadata,
      commentAllowed: data.commentAllowed,
    }
  }

  async requestInvoice(
    lud16: string,
    amountMsats: number,
    comment?: string
  ): Promise<LightningInvoice> {
    const pay = await this.resolveLnurlPay(lud16)
    if (amountMsats < pay.minSendable || amountMsats > pay.maxSendable) {
      throw new Error(
        `Amount ${amountMsats} msats outside LNURL range ${pay.minSendable}-${pay.maxSendable}`
      )
    }

    const callbackUrl = new URL(pay.callback)
    callbackUrl.searchParams.set("amount", String(amountMsats))
    if (comment && pay.commentAllowed && pay.commentAllowed > 0) {
      callbackUrl.searchParams.set(
        "comment",
        comment.slice(0, pay.commentAllowed)
      )
    }

    const invoice = await fetchJson(callbackUrl.toString())
    if (invoice.status === "ERROR") {
      throw new Error(invoice.reason || "Failed to create Lightning invoice")
    }
    if (!invoice.pr) {
      throw new Error("LNURL response missing bolt11 invoice (pr)")
    }

    return {
      bolt11: invoice.pr,
      paymentHash: invoice.payment_hash || invoice.paymentHash,
      amountMsats,
      lud16: lud16.trim(),
    }
  }

  async invoiceForOrderTotal(
    lud16: string,
    total: string,
    currency: string,
    comment?: string
  ): Promise<LightningInvoice> {
    const amountMsats = totalToMsats(total, currency)
    return this.requestInvoice(lud16, amountMsats, comment)
  }
}
