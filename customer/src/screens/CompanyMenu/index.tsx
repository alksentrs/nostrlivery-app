import { useCallback, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import Toast from "react-native-toast-message"
import { nip19 } from "nostr-tools"
import {
  ActionButton,
  NodeService,
  NostrService,
  normalizeMenu,
  MenuItem,
  StorageService,
  StoredKey,
} from "@odevlibertario/nostrlivery-common"

type CartLine = MenuItem & { qty: number }

export const CompanyMenuScreen = ({ navigation, route }: any) => {
  const companyNpub: string = route.params?.companyNpub
  const [profile, setProfile] = useState<any>(null)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [cart, setCart] = useState<CartLine[]>([])
  const [loading, setLoading] = useState(true)
  const nodeService = new NodeService()
  const nostrService = new NostrService()
  const storageService = new StorageService()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: pubkey } = nip19.decode(companyNpub)
      const profileData = await nostrService.getProfile(companyNpub)
      let kind0: any = {}
      try {
        kind0 = await nodeService.queryEvent({
          kinds: [0],
          authors: [pubkey as string],
        })
        if (typeof kind0 === "string") {
          kind0 = JSON.parse(kind0)
        }
      } catch {
        kind0 = {}
      }
      const mergedProfile = {
        ...profileData,
        ...kind0,
        lud16: kind0?.lud16 || profileData?.lud16 || "",
        currency: kind0?.currency || profileData?.currency || "BTC",
      }
      const rawMenu = await nodeService.queryEvent({
        kinds: [30000],
        authors: [pubkey as string],
      })
      const menuData =
        typeof rawMenu === "string" ? JSON.parse(rawMenu) : rawMenu
      setProfile(mergedProfile)
      setMenu(normalizeMenu(menuData))
      try {
        const storedCart = await storageService.get(StoredKey.CART)
        if (storedCart?.companyNpub === companyNpub) {
          setCart(storedCart.items || [])
        } else {
          setCart([])
        }
      } catch {
        setCart([])
      }
    } catch (e) {
      console.log(e)
      Toast.show({ type: "error", text1: "Failed to load company menu" })
    } finally {
      setLoading(false)
    }
  }, [companyNpub])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function persistCart(next: CartLine[]) {
    setCart(next)
    await storageService.set(StoredKey.CART, {
      companyNpub,
      companyProfile: profile,
      items: next,
      currency: profile?.currency || "BTC",
    })
  }

  function addItem(item: MenuItem) {
    const existing = cart.find((c) => c.name === item.name)
    let next: CartLine[]
    if (existing) {
      next = cart.map((c) =>
        c.name === item.name ? { ...c, qty: c.qty + 1 } : c
      )
    } else {
      next = [...cart, { ...item, qty: 1 }]
    }
    persistCart(next)
    Toast.show({ type: "success", text1: `Added ${item.name}` })
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2f1650" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>
        {profile?.display_name || profile?.name || "Company"}
      </Text>
      <Text style={styles.sub}>{companyNpub.slice(0, 16)}…</Text>
      {menu.map((item, idx) => (
        <TouchableOpacity
          key={`${item.name}-${idx}`}
          style={styles.row}
          onPress={() => addItem(item)}
        >
          {!!item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>
              {item.name} — {item.price}
            </Text>
            <Text style={styles.desc}>{item.description}</Text>
          </View>
          <Text style={styles.add}>+</Text>
        </TouchableOpacity>
      ))}
      {!menu.length && (
        <Text style={styles.sub}>This company has no menu items yet.</Text>
      )}
      <ActionButton
        title={`View cart (${cart.reduce((a, c) => a + c.qty, 0)})`}
        color="purple"
        onPress={() => navigation.navigate("Cart")}
        disabled={!cart.length}
      />
      <ActionButton
        title="Back"
        color="#666"
        onPress={() => navigation.navigate("Home")}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { margin: "3%" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginTop: 24 },
  sub: { color: "#666", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  thumb: { width: 56, height: 56, borderRadius: 6 },
  itemName: { fontWeight: "600" },
  desc: { color: "#555", fontSize: 13 },
  add: { fontSize: 28, color: "#2f1650", paddingHorizontal: 8 },
})
