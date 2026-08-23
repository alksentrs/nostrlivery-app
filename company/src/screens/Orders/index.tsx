import { useCallback, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import Toast from "react-native-toast-message"
import { getPublicKey, nip19 } from "nostr-tools"
import {
  ActionButton,
  AssociatedDriverRecord,
  Order,
  OrderService,
  SelectInput,
  StorageService,
  StoredKey,
} from "@odevlibertario/nostrlivery-common"

export const OrdersScreen = ({ navigation }: any) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [drivers, setDrivers] = useState<AssociatedDriverRecord[]>([])
  const [driverNpubByOrder, setDriverNpubByOrder] = useState<
    Record<string, string>
  >({})
  const orderService = new OrderService()
  const storageService = new StorageService()

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const nsec = await storageService.get(StoredKey.NSEC)
      if (!nsec) {
        navigation.navigate("Login")
        return
      }
      const npub = nip19.npubEncode(
        getPublicKey(nip19.decode(nsec).data as unknown as Uint8Array)
      )
      const list = await orderService.queryOrdersForNpub(npub)
      setOrders(list)
      const stored = await storageService.get(StoredKey.ASSOCIATED_DRIVERS)
      setDrivers(Array.isArray(stored) ? stored : [])
    } catch (e) {
      console.log(e)
      Toast.show({ type: "error", text1: "Failed to load orders" })
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      let unsub: (() => void) | undefined
      load()
      orderService.watchOrders((list) => setOrders(list)).then((u) => {
        unsub = u
      })
      return () => {
        if (unsub) {
          unsub()
        }
      }
    }, [load])
  )

  async function advance(
    order: Order,
    next: Order["status"],
    patch?: Partial<Order>
  ) {
    try {
      await orderService.updateStatus(order, next, patch)
      Toast.show({ type: "success", text1: `Order ${next}` })
      await load()
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.message || "Update failed" })
    }
  }

  function cancelButton(order: Order) {
    if (
      !["PAID", "ACCEPTED", "READY", "ASSIGNED"].includes(order.status)
    ) {
      return null
    }
    return (
      <ActionButton
        title="Cancel order"
        color="red"
        onPress={() => advance(order, "CANCELLED")}
      />
    )
  }

  function actionsFor(order: Order) {
    switch (order.status) {
      case "PAID":
        return (
          <View style={{ gap: 8 }}>
            <ActionButton
              title="Accept"
              color="purple"
              onPress={() => advance(order, "ACCEPTED")}
            />
            {cancelButton(order)}
          </View>
        )
      case "ACCEPTED":
        return (
          <View style={{ gap: 8 }}>
            <ActionButton
              title="Mark ready"
              color="purple"
              onPress={() => advance(order, "READY")}
            />
            {cancelButton(order)}
          </View>
        )
      case "READY":
        return (
          <View style={{ gap: 8 }}>
            {!drivers.length ? (
              <Text style={styles.hint}>
                No associated drivers. Accept a driver in the Drivers tab first.
              </Text>
            ) : (
              <SelectInput
                data={drivers.map((d) => ({
                  label: `${d.name} (${d.npub.slice(0, 12)}…)`,
                  value: d.npub,
                }))}
                emptyMessage="Select driver"
                callback={(value) =>
                  setDriverNpubByOrder((m) => ({ ...m, [order.id]: value }))
                }
              />
            )}
            <ActionButton
              title="Assign driver"
              color="purple"
              disabled={!drivers.length || !driverNpubByOrder[order.id]}
              onPress={() => {
                const driverNpub = driverNpubByOrder[order.id]
                if (!driverNpub) {
                  Toast.show({ type: "error", text1: "Select a driver" })
                  return
                }
                advance(order, "ASSIGNED", { driverNpub })
              }}
            />
            {cancelButton(order)}
          </View>
        )
      case "ASSIGNED":
        return cancelButton(order)
      default:
        return null
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
    >
      <Text style={styles.title}>Orders</Text>
      {!orders.length && <Text style={styles.empty}>No orders yet.</Text>}
      {orders.map((order) => (
        <View key={order.id} style={styles.card}>
          <Text style={styles.status}>{order.status}</Text>
          <Text style={styles.id}>{order.id}</Text>
          <Text>
            {order.total} {order.currency}
          </Text>
          <Text numberOfLines={2}>
            {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
          </Text>
          {order.driverNpub && (
            <Text style={styles.id}>
              Driver: {order.driverNpub.slice(0, 18)}…
            </Text>
          )}
          {actionsFor(order)}
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { margin: "3%", marginTop: "8%" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  empty: { color: "#666" },
  hint: { color: "#a60", fontSize: 13 },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  status: { fontWeight: "bold", color: "#2f1650" },
  id: { fontSize: 11, color: "#888" },
})
