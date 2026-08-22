import { useEffect, useState } from "react"
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from "react-native"
import Toast from "react-native-toast-message"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import {
  ActionButton,
  NodeService,
  StorageService,
  StoredKey,
} from "@odevlibertario/nostrlivery-common"

export const ProfileScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<any>({})
  const [nodeUrl, setNodeUrl] = useState("")
  const [disabledNodeUrlBtn, setDisabledNodeUrlBtn] = useState(true)
  const storageService = new StorageService()
  const nodeService = new NodeService()

  useEffect(() => {
    storageService.get(StoredKey.NODE_URL).then((data) => {
      if (!data) {
        navigation.navigate("NodeSelection")
      }
      setNodeUrl(data)
    })
    storageService.get(StoredKey.PROFILE).then((data) => {
      if (!data) {
        navigation.navigate("Login")
      }
      setProfile(data)
    })
  }, [])

  useEffect(() => {
    storageService.get(StoredKey.NODE_URL).then((data) => {
      setDisabledNodeUrlBtn(!(nodeUrl !== data && nodeUrl !== ""))
    })
  }, [nodeUrl])

  function handleSaveNodeUrl() {
    nodeService
      .getNodeIdentity(nodeUrl)
      .then(() => {
        setDisabledNodeUrlBtn(true)
        Toast.show({ type: "success", text1: "Node url saved" })
      })
      .catch((e) => Toast.show({ type: "error", text1: String(e) }))
  }

  function handleLogout() {
    storageService.remove(StoredKey.PROFILE).then()
    storageService.remove(StoredKey.NSEC).then()
    navigation.navigate("Login")
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => navigation.navigate("Home")}
      >
        <MaterialCommunityIcons name="close" color={"#000"} size={35} />
      </TouchableOpacity>
      <Text style={styles.name}>{profile.display_name || profile.name}</Text>
      <Text style={styles.handle}>@{profile.name}</Text>
      <Text style={styles.label}>Node Url</Text>
      <TextInput style={styles.input} value={nodeUrl} onChangeText={setNodeUrl} />
      <ActionButton
        disabled={disabledNodeUrlBtn}
        title="Save"
        color="purple"
        onPress={handleSaveNodeUrl}
      />
      <ActionButton title="Logout" color="red" onPress={handleLogout} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, gap: 10 },
  closeBtn: { position: "absolute", top: 8, right: 10 },
  name: { fontWeight: "500", fontSize: 28 },
  handle: { fontSize: 15, marginBottom: 10 },
  label: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
})
