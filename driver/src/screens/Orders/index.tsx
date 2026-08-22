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
  Order,
  OrderService,
  StorageService,
  StoredKey,
  canTransition,
} from "@odevlibertario/nostrlivery-common"

export const OrdersScreen = ({ navigation }: any) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [refreshing, setRefreshing] = useState(false)
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
      setOrders(
        list.filter((o) =>
          ["ASSIGNED", "PICKED_UP", "DELIVERED"].includes(o.status)
        )
      )
    } catch (e) {
      console.log(e)
      Toast.show({ type: "error", text1: "Failed to load jobs" })
    } finally {
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function advance(order: Order, next: Order["status"]) {
    try {
      if (!canTransition(order.status, next)) {
        Toast.show({
          type: "error",
          text1: `Cannot go from ${order.status} to ${next}`,
        })
        return
      }
      const updated = await orderService.updateStatus(order, next)
      await orderService.notifyOrderUpdate(updated, `Order ${next}`)
      Toast.show({ type: "success", text1: `Order ${next}` })
      await load()
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.message || "Update failed" })
    }
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
    >
      <Text style={styles.title}>Delivery jobs</Text>
      {!orders.length && (
        <Text style={styles.empty}>No assigned jobs yet.</Text>
      )}
      {orders.map((order) => (
        <View key={order.id} style={styles.card}>
          <Text style={styles.status}>{order.status}</Text>
          <Text style={styles.id}>{order.id}</Text>
          <Text>
            {order.total} {order.currency}
          </Text>
          {order.deliveryAddress && (
            <Text>Address: {order.deliveryAddress}</Text>
          )}
          <Text numberOfLines={2}>
            {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
          </Text>
          {order.status === "ASSIGNED" && (
            <ActionButton
              title="Picked up"
              color="purple"
              onPress={() => advance(order, "PICKED_UP")}
            />
          )}
          {order.status === "PICKED_UP" && (
            <ActionButton
              title="Delivered"
              color="purple"
              onPress={() => advance(order, "DELIVERED")}
            />
          )}
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
})
