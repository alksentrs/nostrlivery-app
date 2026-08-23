import { useCallback, useState } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import Toast from "react-native-toast-message"
import * as Clipboard from "expo-clipboard"
import QRCode from "react-native-qrcode-svg"
import { getPublicKey, nip19 } from "nostr-tools"
import {
  ActionButton,
  computeOrderTotal,
  formatLightningAmountPreview,
  LightningService,
  NodeService,
  OrderService,
  StorageService,
  StoredKey,
  Order,
} from "@odevlibertario/nostrlivery-common"

export const CheckoutScreen = ({ navigation }: any) => {
  const [cart, setCart] = useState<any>(null)
  const [address, setAddress] = useState("")
  const [order, setOrder] = useState<Order | null>(null)
  const [bolt11, setBolt11] = useState<string>("")
  const [busy, setBusy] = useState(false)
  const storageService = new StorageService()
  const orderService = new OrderService()
  const lightningService = new LightningService()
  const nodeService = new NodeService()

  useFocusEffect(
    useCallback(() => {
      storageService.get(StoredKey.CART).then(setCart).catch(() => setCart(null))
    }, [])
  )

  async function placeOrder() {
    if (!cart?.items?.length) {
      return
    }
    setBusy(true)
    try {
      const nsec = await storageService.get(StoredKey.NSEC)
      const customerNpub = nip19.npubEncode(
        getPublicKey(nip19.decode(nsec).data as unknown as Uint8Array)
      )
      const companyPubkey = nip19.decode(cart.companyNpub)
        .data as unknown as string
      const kind0Raw = await nodeService.queryEvent({
        kinds: [0],
        authors: [companyPubkey],
      })
      const kind0 =
        typeof kind0Raw === "string" ? JSON.parse(kind0Raw) : kind0Raw
      const lud16 = kind0?.lud16 || ""
      const currency = (kind0?.currency || cart.currency || "BTC").toUpperCase()

      if (currency !== "BTC") {
        Toast.show({
          type: "error",
          text1: "Company currency must be BTC for Lightning",
          text2: "Ask the merchant to set currency to BTC on their profile",
        })
        return
      }

      if (!lud16) {
        Toast.show({
          type: "error",
          text1: "Company has no Lightning Address (lud16)",
        })
        return
      }

      const total = computeOrderTotal(cart.items)
      const created = await orderService.createAndPublish({
        companyNpub: cart.companyNpub,
        customerNpub,
        items: cart.items.map((i: any) => ({
          name: i.name,
          price: i.price,
          qty: i.qty,
        })),
        currency,
        total,
        deliveryAddress: address || undefined,
        payment: { method: "lightning", lud16 },
      })

      const invoice = await lightningService.invoiceForOrderTotal(
        lud16,
        total,
        currency,
        `Nostrlivery ${created.id}`
      )

      const withInvoice = await orderService.publishOrder({
        ...created,
        payment: {
          method: "lightning",
          lud16,
          bolt11: invoice.bolt11,
          paymentHash: invoice.paymentHash,
          amountMsats: invoice.amountMsats,
        },
      })

      setOrder(withInvoice)
      setBolt11(invoice.bolt11)
      Toast.show({ type: "success", text1: "Order created — pay invoice" })
    } catch (e: any) {
      console.log(e)
      Toast.show({
        type: "error",
        text1: e?.message || "Checkout failed",
      })
    } finally {
      setBusy(false)
    }
  }

  async function markPaid() {
    if (!order) {
      return
    }
    setBusy(true)
    try {
      const paid = await orderService.updateStatus(order, "PAID", {
        payment: order.payment,
      })
      setOrder(paid)
      try {
        await storageService.remove(StoredKey.CART)
      } catch {
        /* ignore */
      }
      Toast.show({ type: "success", text1: "Marked as paid" })
      navigation.navigate("Orders")
    } catch (e: any) {
      Toast.show({ type: "error", text1: e?.message || "Failed to mark paid" })
    } finally {
      setBusy(false)
    }
  }

  if (!cart?.items?.length && !order) {
    return (
      <View style={styles.container}>
        <Text>Nothing to checkout</Text>
      </View>
    )
  }

  const total = cart ? computeOrderTotal(cart.items) : order?.total
  const currency = (cart?.currency || order?.currency || "BTC").toUpperCase()
  let lightningLabel: string | null = null
  try {
    if (total && currency === "BTC") {
      lightningLabel = formatLightningAmountPreview(String(total), "BTC").label
    }
  } catch {
    lightningLabel = null
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Checkout</Text>
      {!order && (
        <>
          <Text style={styles.label}>Delivery address (optional)</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Street, number, city"
          />
          <Text style={styles.total}>
            Total: {total} {currency}
          </Text>
          {lightningLabel ? (
            <Text style={styles.sats}>{lightningLabel}</Text>
          ) : (
            <Text style={styles.warn}>
              Lightning requires BTC currency on the company profile.
            </Text>
          )}
          {busy ? (
            <ActivityIndicator color="#2f1650" />
          ) : (
            <ActionButton
              title="Place order & get Lightning invoice"
              color="purple"
              onPress={placeOrder}
              disabled={currency !== "BTC"}
            />
          )}
        </>
      )}
      {!!bolt11 && (
        <View style={styles.invoiceBox}>
          <Text style={styles.label}>Pay this invoice</Text>
          {lightningLabel && (
            <Text style={styles.sats}>{lightningLabel}</Text>
          )}
          <View style={styles.qr}>
            <QRCode value={bolt11} size={200} />
          </View>
          <Text selectable style={styles.bolt11}>
            {bolt11}
          </Text>
          <ActionButton
            title="Copy BOLT11"
            color="#444"
            onPress={async () => {
              await Clipboard.setStringAsync(bolt11)
              Toast.show({ type: "success", text1: "Copied" })
            }}
          />
          <ActionButton
            title="I paid — confirm"
            color="purple"
            onPress={markPaid}
            disabled={busy || order?.status === "PAID"}
          />
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { margin: "4%", marginTop: "10%", paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 12,
  },
  total: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  sats: { fontSize: 14, color: "#2f1650", marginBottom: 12 },
  warn: { color: "#a60", marginBottom: 12, fontSize: 13 },
  invoiceBox: { marginTop: 16, gap: 10, alignItems: "center" },
  qr: { padding: 12, backgroundColor: "#fff" },
  bolt11: { fontSize: 11, color: "#333", width: "100%" },
})
