# Nostrlivery Customer

Expo app for customers: browse a company menu by npub, cart, Lightning checkout (LNURL-pay via company `lud16`), and order status.

## Setup

```bash
# from nostrlivery-app/
cd common && npm run build && npm pack
cd ../customer
npm i --legacy-peer-deps --ignore-scripts
npm start
```

Requires the Nostrlivery node (`:3000`) and local relay (`ws://127.0.0.1:7000`).

See [docs/ORDER_PROTOCOL.md](../docs/ORDER_PROTOCOL.md) for the order + Lightning flow.
