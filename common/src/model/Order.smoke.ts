/**
 * Quick sanity check for order transition helpers.
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' src/model/Order.smoke.ts
 * Or after build: node -e "require('./dist/model/Order')"
 */
import {
  canTransition,
  createOrder,
  transitionOrder,
} from "./Order"

const order = createOrder({
  companyNpub: "npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg3x5e0",
  customerNpub: "npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg3x5e0",
  items: [{ name: "Pizza", price: "10", qty: 1 }],
  currency: "BTC",
  total: "10",
})

if (order.status !== "CREATED") {
  throw new Error("expected CREATED")
}
if (!canTransition("CREATED", "PAID")) {
  throw new Error("CREATED→PAID should be allowed")
}
if (canTransition("CREATED", "DELIVERED")) {
  throw new Error("CREATED→DELIVERED should be blocked")
}

const paid = transitionOrder(order, "PAID")
const accepted = transitionOrder(paid, "ACCEPTED")
const ready = transitionOrder(accepted, "READY")
const assigned = transitionOrder({ ...ready, driverNpub: order.companyNpub }, "ASSIGNED")
const picked = transitionOrder(assigned, "PICKED_UP")
const delivered = transitionOrder(picked, "DELIVERED")

if (delivered.status !== "DELIVERED") {
  throw new Error("expected DELIVERED")
}

console.log("Order.smoke OK")
