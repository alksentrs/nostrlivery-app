import {
  canTransition,
  createOrder,
  transitionOrder,
  canActorTransition,
} from "./Order"

const company = "npub1company"
const customer = "npub1customer"
const driver = "npub1driver"

const order = createOrder({
  companyNpub: company,
  customerNpub: customer,
  items: [{ name: "Pizza", price: "0.0001", qty: 1 }],
  currency: "BTC",
  total: "0.0001",
})

if (!canActorTransition(order, "PAID", customer)) {
  throw new Error("customer should PAID")
}
if (canActorTransition(order, "ACCEPTED", customer)) {
  throw new Error("customer should not ACCEPTED")
}
if (canActorTransition(order, "PAID", company)) {
  throw new Error("company should not PAID")
}

let x = transitionOrder(order, "PAID")
if (!canActorTransition(x, "ACCEPTED", company)) {
  throw new Error("company should ACCEPTED")
}
x = transitionOrder(x, "ACCEPTED")
x = transitionOrder(x, "READY")
x = { ...x, driverNpub: driver }
x = transitionOrder(x, "ASSIGNED")
if (!canActorTransition(x, "PICKED_UP", driver)) {
  throw new Error("driver should PICKED_UP")
}
if (!canTransition("CREATED", "CANCELLED")) {
  throw new Error("cancel allowed")
}

console.log("Order.smoke OK")
