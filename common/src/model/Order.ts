export type OrderStatus =
  | "CREATED"
  | "PAID"
  | "ACCEPTED"
  | "READY"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED"

export type OrderItem = {
  name: string
  price: string
  qty: number
}

export type OrderPayment = {
  method: "lightning"
  lud16: string
  bolt11?: string
  paymentHash?: string
  amountMsats?: number
}

export type Order = {
  id: string
  status: OrderStatus
  companyNpub: string
  customerNpub: string
  driverNpub?: string
  items: OrderItem[]
  currency: string
  total: string
  deliveryAddress?: string
  payment?: OrderPayment
  updatedAt: number
}

export type OrderActorRole = "customer" | "company" | "driver" | "unknown"

export const ORDER_TAG = "nostrlivery-order"

/** Allowed status transitions for the vertical slice. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["PAID", "CANCELLED"],
  PAID: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["READY", "CANCELLED"],
  READY: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
}

/** Role-gated transitions (client-side). */
const ROLE_TRANSITIONS: Record<
  Exclude<OrderActorRole, "unknown">,
  Array<{ from: OrderStatus; to: OrderStatus }>
> = {
  customer: [
    { from: "CREATED", to: "PAID" },
    { from: "CREATED", to: "CANCELLED" },
    { from: "PAID", to: "CANCELLED" },
  ],
  company: [
    { from: "PAID", to: "ACCEPTED" },
    { from: "ACCEPTED", to: "READY" },
    { from: "READY", to: "ASSIGNED" },
    { from: "PAID", to: "CANCELLED" },
    { from: "ACCEPTED", to: "CANCELLED" },
    { from: "READY", to: "CANCELLED" },
    { from: "ASSIGNED", to: "CANCELLED" },
  ],
  driver: [
    { from: "ASSIGNED", to: "PICKED_UP" },
    { from: "PICKED_UP", to: "DELIVERED" },
  ],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false
}

export function resolveOrderActorRole(
  order: Order,
  actorNpub: string
): OrderActorRole {
  if (actorNpub === order.customerNpub) {
    return "customer"
  }
  if (actorNpub === order.companyNpub) {
    return "company"
  }
  if (order.driverNpub && actorNpub === order.driverNpub) {
    return "driver"
  }
  return "unknown"
}

export function canActorTransition(
  order: Order,
  next: OrderStatus,
  actorNpub: string
): boolean {
  if (!canTransition(order.status, next)) {
    return false
  }
  const role = resolveOrderActorRole(order, actorNpub)
  if (role === "unknown") {
    return false
  }
  return ROLE_TRANSITIONS[role].some(
    (t) => t.from === order.status && t.to === next
  )
}

export function assertActorCanTransition(
  order: Order,
  next: OrderStatus,
  actorNpub: string
): void {
  if (!canActorTransition(order, next, actorNpub)) {
    const role = resolveOrderActorRole(order, actorNpub)
    throw new Error(
      `Role ${role} cannot transition ${order.status} → ${next}`
    )
  }
}

export type CreateOrderInput = {
  id?: string
  companyNpub: string
  customerNpub: string
  items: OrderItem[]
  currency: string
  total: string
  deliveryAddress?: string
  payment?: OrderPayment
}

export function createOrder(input: CreateOrderInput): Order {
  const id =
    input.id ??
    `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

  return {
    id,
    status: "CREATED",
    companyNpub: input.companyNpub,
    customerNpub: input.customerNpub,
    items: input.items,
    currency: input.currency,
    total: input.total,
    deliveryAddress: input.deliveryAddress,
    payment: input.payment,
    updatedAt: Math.floor(Date.now() / 1000),
  }
}

export function transitionOrder(order: Order, next: OrderStatus): Order {
  if (!canTransition(order.status, next)) {
    throw new Error(`Invalid order transition: ${order.status} → ${next}`)
  }
  return {
    ...order,
    status: next,
    updatedAt: Math.floor(Date.now() / 1000),
  }
}

export function parseOrderContent(content: string | Order): Order | null {
  try {
    const raw = typeof content === "string" ? JSON.parse(content) : content
    if (!raw || typeof raw.id !== "string" || typeof raw.status !== "string") {
      return null
    }
    return raw as Order
  } catch {
    return null
  }
}

/** Keep the newest version of each order id. */
export function mergeOrdersById(orders: Order[]): Order[] {
  const map = new Map<string, Order>()
  for (const order of orders) {
    const existing = map.get(order.id)
    if (!existing || (order.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      map.set(order.id, order)
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  )
}

export function computeOrderTotal(items: OrderItem[]): string {
  const sum = items.reduce((acc, item) => {
    const price = parseFloat(String(item.price).replace(",", ".")) || 0
    return acc + price * (item.qty || 0)
  }, 0)
  return sum.toFixed(8).replace(/\.?0+$/, "") || "0"
}

export type AssociatedDriverRecord = {
  name: string
  npub: string
  profilePicture?: string
}
