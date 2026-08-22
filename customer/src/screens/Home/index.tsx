import { useEffect, useState } from "react"
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native"
import Toast from "react-native-toast-message"
import { nip19 } from "nostr-tools"
import {
  ActionButton,
  StorageService,
  StoredKey,
} from "@odevlibertario/nostrlivery-common"

export const HomeScreen = ({ navigation }: any) => {
  const [companyNpub, setCompanyNpub] = useState("")
  const storageService = new StorageService()

  useEffect(() => {
    storageService.get(StoredKey.PROFILE).then((data) => {
      if (!data) {
        navigation.navigate("Login")
      }
    })
  }, [])

  function openCompany() {
    const trimmed = companyNpub.trim()
    try {
      const decoded = nip19.decode(trimmed)
      if (decoded.type !== "npub") {
        throw new Error("not npub")
      }
    } catch {
      Toast.show({ type: "error", text1: "Enter a valid company npub" })
      return
    }
    navigation.navigate("CompanyMenu", { companyNpub: trimmed })
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Find a company</Text>
      <Text style={styles.hint}>
        Paste a company npub to browse their menu and place an order.
      </Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        placeholder="npub1..."
        value={companyNpub}
        onChangeText={setCompanyNpub}
      />
      <ActionButton title="Browse menu" color="purple" onPress={openCompany} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { margin: "4%", marginTop: "12%", gap: 12 },
  title: { fontWeight: "bold", fontSize: 22 },
  hint: { color: "#555", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 12,
    fontSize: 14,
  },
})
