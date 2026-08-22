import { useCallback, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import Toast from "react-native-toast-message"
import {
  ActionButton,
  LightningService,
  Order,
  OrderService,
  StorageService,
  StoredKey,
} from "@odevlibertario/nostrlivery-common"
import * as Clipboard from "expo-clipboard"
import QRCode from "react-native-qrcode-svg"

export const OrdersScreen = ({ navigation }: any) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [paying, setPaying] = useState<Order | null>(null)
  const orderService = new OrderService()
  const lightningService = new LightningService()
  const storageService = new StorageService()

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const profile = await storageService.get(StoredKey.PROFILE)
      if (!profile) {
        navigation.navigate("Login")
        return
      }
      const list = await orderService.queryOrdersForCurrentUser()
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

  async function refreshInvoice(order: Order) {
    try {
      const lud16 = order.payment?.lud16
      if (!lud16) {
        Toast.show({ type: "error", text1: "No Lightning Address on order" })
        return
      }
      const invoice = await lightningService.invoiceForOrderTotal(
        lud16,
        order.total,
        order.currency,
        `Nostrlivery ${order.id}`
      )
      const updated = await orderService.publishOrder({
        ...order,
        payment: {
          method: "lightning",
          lud16,
          bolt11: invoice.bolt11,
          paymentHash: invoice.paymentHash,
          amountMsats: invoice.amountMsats,
        },
      })
      setPaying(updated)
      await load()
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.message || "Invoice failed" })
    }
  }

  async function confirmPaid(order: Order) {
    try {
      await orderService.updateStatus(order, "PAID", { payment: order.payment })
      setPaying(null)
      Toast.show({ type: "success", text1: "Marked paid" })
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
      <Text style={styles.title}>My orders</Text>
      {!orders.length && (
        <Text style={styles.empty}>No orders yet. Browse a company menu.</Text>
      )}
      {orders.map((order) => (
        <View key={order.id} style={styles.card}>
          <Text style={styles.status}>{order.status}</Text>
          <Text style={styles.id}>{order.id}</Text>
          <Text>
            Total: {order.total} {order.currency}
          </Text>
          <Text numberOfLines={2}>
            {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
          </Text>
          {order.status === "CREATED" && (
            <ActionButton
              title="Pay with Lightning"
              color="purple"
              onPress={() =>
                order.payment?.bolt11
                  ? setPaying(order)
                  : refreshInvoice(order)
              }
            />
          )}
        </View>
      ))}

      {paying?.payment?.bolt11 && (
        <View style={styles.payBox}>
          <Text style={styles.title}>Pay order</Text>
          <QRCode value={paying.payment.bolt11} size={180} />
          <TouchableOpacity
            onPress={async () => {
              await Clipboard.setStringAsync(paying.payment!.bolt11!)
              Toast.show({ type: "success", text1: "Copied BOLT11" })
            }}
          >
            <Text style={styles.bolt11}>{paying.payment.bolt11}</Text>
          </TouchableOpacity>
          <ActionButton
            title="I paid"
            color="purple"
            onPress={() => confirmPaid(paying)}
          />
          <ActionButton
            title="Close"
            color="#666"
            onPress={() => setPaying(null)}
          />
        </View>
      )}
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
    gap: 4,
  },
  status: { fontWeight: "bold", color: "#2f1650" },
  id: { fontSize: 11, color: "#888" },
  payBox: { alignItems: "center", gap: 10, marginVertical: 20 },
  bolt11: { fontSize: 10, marginVertical: 8 },
})
