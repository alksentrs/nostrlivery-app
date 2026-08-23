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
Client-side **role checks** restrict who may perform which transition (see below).

## Status lifecycle

```
CREATED → PAID → ACCEPTED → READY → ASSIGNED → PICKED_UP → DELIVERED
                ↘ CANCELLED (role-gated)
```

## Role matrix

| Actor | Allowed transitions |
|-------|---------------------|
| Customer | `CREATED→PAID`, `CREATED\|PAID→CANCELLED` |
| Company | `PAID→ACCEPTED→READY→ASSIGNED`, cancel from `PAID\|ACCEPTED\|READY\|ASSIGNED` |
| Driver | `ASSIGNED→PICKED_UP→DELIVERED` |

Enforced in `canActorTransition` / `OrderService.updateStatus`.

## Driver assignment

Company assigns from **persisted associated drivers** (stored when `DRIVER_ASSOCIATION_ACCEPTED` is received on the Drivers tab). Free-text npub assign is not used.

## Live updates

After status changes, peers publish ephemeral kind `20000` `{ type: "ORDER_UPDATE", ... }`.
Orders screens subscribe to those notifications and poll every 15s while focused.

## Lightning payment

1. Company sets `lud16` (Lightning Address) and **currency = BTC** on kind-0 profile.
2. Customer creates order (`CREATED`), then requests LNURL-pay invoice for `total` (BTC → msats).
3. UI shows sats / msats preview. Non-BTC currency is rejected at checkout.
4. Customer pays BOLT11, then confirms → order becomes `PAID` (client-attested MVP).

Server-side settlement verification is Phase B+.

## Smoke checklist

1. Company: set `lud16` + currency BTC, publish menu, associate a driver (accept persists to list).
2. Customer: open company by npub → cart → checkout (see sats preview) → pay invoice → mark paid.
3. Company Orders: accept → ready → assign from associated drivers dropdown.
4. Driver Orders: picked up → delivered (tabs refresh via notify/poll).
5. Customer can cancel while `CREATED`/`PAID`; company can cancel until assigned/picked path allows.

## PIX

Deferred (Phase 7+). Lightning-first only; BTC required for LN checkout.
