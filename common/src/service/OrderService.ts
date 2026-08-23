import { getPublicKey, nip19 } from "nostr-tools"
import { NodeService } from "./NodeService"
import { StorageService, StoredKey } from "./StorageService"
import { NostrService } from "./NostrService"
import { NostrEventKinds } from "../model/NostrEventKinds"
import {
  Order,
  ORDER_TAG,
  createOrder,
  CreateOrderInput,
  mergeOrdersById,
  parseOrderContent,
  transitionOrder,
  OrderStatus,
  assertActorCanTransition,
} from "../model/Order"

function npubToHex(npub: string): string {
  const decoded = nip19.decode(npub)
  if (decoded.type !== "npub") {
    throw new Error("Expected npub")
  }
  return decoded.data as string
}

function hexToNpub(hex: string): string {
  return nip19.npubEncode(hex)
}

export class OrderService {
  private nodeService = new NodeService()
  private storageService = new StorageService()
  private nostrService = new NostrService()

  async getCurrentNpub(): Promise<string | null> {
    const nsec = await this.storageService.get(StoredKey.NSEC)
    if (!nsec) {
      return null
    }
    const sk = nip19.decode(nsec)
    return hexToNpub(getPublicKey(sk.data as Uint8Array))
  }

  buildTags(order: Order): string[][] {
    const tags: string[][] = [
      ["d", order.id],
      ["t", ORDER_TAG],
      ["p", npubToHex(order.companyNpub)],
      ["p", npubToHex(order.customerNpub)],
    ]
    if (order.driverNpub) {
      tags.push(["p", npubToHex(order.driverNpub)])
    }
    return tags
  }

  async publishOrder(order: Order): Promise<Order> {
    const toPublish = {
      ...order,
      updatedAt: Math.floor(Date.now() / 1000),
    }
    await this.nodeService.postNostrliveryEvent(
      NostrEventKinds.ORDER,
      this.buildTags(toPublish),
      toPublish
    )
    return toPublish
  }

  async createAndPublish(input: CreateOrderInput): Promise<Order> {
    const order = createOrder(input)
    return this.publishOrder(order)
  }

  async updateStatus(
    order: Order,
    next: OrderStatus,
    patch?: Partial<Order>
  ): Promise<Order> {
    const actorNpub = await this.getCurrentNpub()
    if (!actorNpub) {
      throw new Error("Not logged in")
    }
    assertActorCanTransition(order, next, actorNpub)

    const transitioned = transitionOrder(order, next)
    const updated: Order = {
      ...transitioned,
      ...patch,
      status: transitioned.status,
      updatedAt: Math.floor(Date.now() / 1000),
    }
    const published = await this.publishOrder(updated)
    await this.notifyOrderUpdate(published, `Order ${next}`)
    return published
  }

  private parseEvents(events: any[]): Order[] {
    const orders: Order[] = []
    for (const event of events ?? []) {
      let content: string
      if (typeof event === "string") {
        content = event
      } else if (typeof event?.content === "string") {
        content = event.content
      } else if (event?.content != null) {
        content = JSON.stringify(event.content)
      } else {
        continue
      }
      const parsed = parseOrderContent(content)
      if (parsed) {
        orders.push(parsed)
      }
    }
    return mergeOrdersById(orders)
  }

  async queryOrdersForNpub(npub: string): Promise<Order[]> {
    const pubkey = npubToHex(npub)
    const events = await this.nodeService.queryEvents({
      kinds: [NostrEventKinds.ORDER],
      "#t": [ORDER_TAG],
      "#p": [pubkey],
      limit: 100,
    })
    return this.parseEvents(events as any[])
  }

  async queryOrdersForCurrentUser(): Promise<Order[]> {
    const npub = await this.getCurrentNpub()
    if (!npub) {
      return []
    }
    return this.queryOrdersForNpub(npub)
  }

  async notifyOrderUpdate(order: Order, message: string): Promise<void> {
    const nsec = await this.storageService.get(StoredKey.NSEC)
    if (!nsec) {
      return
    }
    const payload = JSON.stringify({
      type: "ORDER_UPDATE",
      orderId: order.id,
      status: order.status,
      message,
      order,
    })
    try {
      await this.nostrService.publishEphemeralEvent(
        NostrEventKinds.EPHEMERAL,
        payload,
        nsec
      )
    } catch (e) {
      console.log("notifyOrderUpdate failed", e)
    }
  }

  /**
   * Watch for ORDER_UPDATE + poll every pollMs while active.
   * Returns unsubscribe that stops both.
   */
  async watchOrders(
    onUpdate: (orders: Order[]) => void,
    pollMs: number = 15000
  ): Promise<() => void> {
    let stopped = false

    const refresh = async () => {
      if (stopped) {
        return
      }
      try {
        const orders = await this.queryOrdersForCurrentUser()
        if (!stopped) {
          onUpdate(orders)
        }
      } catch (e) {
        console.log("watchOrders refresh failed", e)
      }
    }

    await refresh()

    let unsubEphemeral: (() => void) | null = null
    try {
      unsubEphemeral = await this.nostrService.subscribeToOrderNotifications(
        () => {
          refresh()
        }
      )
    } catch (e) {
      console.log("ORDER_UPDATE subscribe failed; polling only", e)
    }

    const interval = setInterval(() => {
      refresh()
    }, pollMs)

    return () => {
      stopped = true
      clearInterval(interval)
      if (unsubEphemeral) {
        unsubEphemeral()
      }
    }
  }
}
