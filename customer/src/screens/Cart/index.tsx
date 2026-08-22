import { useCallback, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import {
  ActionButton,
  computeOrderTotal,
  StorageService,
  StoredKey,
} from "@odevlibertario/nostrlivery-common"

export const CartScreen = ({ navigation }: any) => {
  const [cart, setCart] = useState<any>(null)
  const storageService = new StorageService()

  useFocusEffect(
    useCallback(() => {
      storageService.get(StoredKey.CART).then(setCart)
    }, [])
  )

  if (!cart?.items?.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Cart is empty</Text>
        <ActionButton
          title="Browse"
          color="purple"
          onPress={() => navigation.navigate("Home")}
        />
      </View>
    )
  }

  const total = computeOrderTotal(cart.items)

  async function changeQty(name: string, delta: number) {
    const items = cart.items
      .map((i: any) =>
        i.name === name ? { ...i, qty: i.qty + delta } : i
      )
      .filter((i: any) => i.qty > 0)
    const next = { ...cart, items }
    await storageService.set(StoredKey.CART, next)
    setCart(next)
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Your cart</Text>
      {cart.items.map((item: any) => (
        <View key={item.name} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {item.name} × {item.qty}
            </Text>
            <Text>
              {item.price} {cart.currency || ""}
            </Text>
          </View>
          <TouchableOpacity onPress={() => changeQty(item.name, -1)}>
            <Text style={styles.qtyBtn}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeQty(item.name, 1)}>
            <Text style={styles.qtyBtn}>+</Text>
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.total}>
        Total: {total} {cart.currency || ""}
      </Text>
      <ActionButton
        title="Checkout"
        color="purple"
        onPress={() => navigation.navigate("Checkout")}
      />
      <ActionButton
        title="Back to menu"
        color="#666"
        onPress={() =>
          navigation.navigate("CompanyMenu", {
            companyNpub: cart.companyNpub,
          })
        }
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { margin: "4%", marginTop: "10%" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 8,
  },
  name: { fontWeight: "600" },
  qtyBtn: { fontSize: 24, paddingHorizontal: 10, color: "#2f1650" },
  total: { fontSize: 18, fontWeight: "bold", marginVertical: 16 },
})
