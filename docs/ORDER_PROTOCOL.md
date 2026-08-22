# Nostrlivery Order Protocol

## Overview

Orders are published as parameterized replaceable Nostr events (NIP-33 style).

| Field | Value |
|-------|--------|
| Kind | `31200` |
| `d` tag | order id |
| `t` tag | `nostrlivery-order` |
| `p` tags | company pubkey, customer pubkey, optional driver pubkey |
| Content | JSON `Order` object |

Any participant may publish an update with the same `d` tag from their own key.
Clients query by `#t` + `#p` and merge by `order.id`, keeping the highest `updatedAt`.

## Status lifecycle

```
CREATED → PAID → ACCEPTED → READY → ASSIGNED → PICKED_UP → DELIVERED
                ↘ CANCELLED (from most non-terminal states)
```

Company accepts only after `PAID` (Lightning invoice paid; client-attested in MVP).

## Lightning payment

1. Company sets `lud16` (Lightning Address) on kind-0 profile.
2. Customer creates order (`CREATED`), then requests LNURL-pay invoice for `total`.
3. Customer pays BOLT11 in a wallet, then confirms → order becomes `PAID` with `bolt11` / `paymentHash`.
4. Amount conversion: `BTC` totals are BTC→msats; other currencies treat the numeric total as **sats** for MVP demos.

Server-side settlement verification is out of scope for this slice.

## Ephemeral notify

Optional kind `20000` content `{ type: "ORDER_UPDATE", orderId, status, order }` after assign/status changes.

## Smoke checklist

1. Company: set `lud16`, publish menu, associate a driver.
2. Customer: open company by npub → cart → checkout → pay invoice → mark paid.
3. Company Orders: accept → ready → assign driver.
4. Driver Orders: picked up → delivered.
5. Customer/company see `DELIVERED`.

## PIX

Deferred (Phase 7+). Lightning-first only.
