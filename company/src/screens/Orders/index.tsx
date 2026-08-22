import { useCallback, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
} from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import Toast from "react-native-toast-message"
import { getPublicKey, nip19 } from "nostr-tools"
import {
  ActionButton,
  Order,
  OrderService,
  StorageService,
  StoredKey,
  canTransition,
} from "@odevlibertario/nostrlivery-common"

export const OrdersScreen = ({ navigation }: any) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [refreshing, setRefreshing] = useState(false)
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
    } catch (e) {
      console.log(e)
      Toast.show({ type: "error", text1: "Failed to load orders" })
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function advance(order: Order, next: Order["status"], patch?: Partial<Order>) {
    try {
      if (!canTransition(order.status, next)) {
        Toast.show({
          type: "error",
          text1: `Cannot go from ${order.status} to ${next}`,
        })
        return
      }
      if (next === "ACCEPTED" && order.status !== "PAID") {
        Toast.show({ type: "error", text1: "Order must be PAID first" })
        return
      }
      const updated = await orderService.updateStatus(order, next, patch)
      if (next === "ASSIGNED") {
        await orderService.notifyOrderUpdate(updated, "Order assigned to driver")
      }
      Toast.show({ type: "success", text1: `Order ${next}` })
      await load()
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.message || "Update failed" })
    }
  }

  function actionsFor(order: Order) {
    switch (order.status) {
      case "PAID":
        return (
          <ActionButton
            title="Accept"
            color="purple"
            onPress={() => advance(order, "ACCEPTED")}
          />
        )
      case "ACCEPTED":
        return (
          <ActionButton
            title="Mark ready"
            color="purple"
            onPress={() => advance(order, "READY")}
          />
        )
      case "READY":
        return (
          <View style={{ gap: 8 }}>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              placeholder="Driver npub"
              value={driverNpubByOrder[order.id] || ""}
              onChangeText={(t) =>
                setDriverNpubByOrder((m) => ({ ...m, [order.id]: t }))
              }
            />
            <ActionButton
              title="Assign driver"
              color="purple"
              onPress={() => {
                const driverNpub = (driverNpubByOrder[order.id] || "").trim()
                try {
                  if (nip19.decode(driverNpub).type !== "npub") {
                    throw new Error("bad")
                  }
                } catch {
                  Toast.show({ type: "error", text1: "Invalid driver npub" })
                  return
                }
                advance(order, "ASSIGNED", { driverNpub })
              }}
            />
          </View>
        )
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
            <Text style={styles.id}>Driver: {order.driverNpub.slice(0, 18)}…</Text>
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 8,
  },
})
