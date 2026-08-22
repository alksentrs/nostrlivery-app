import { useEffect, useState } from "react"
import {
  StyleSheet,
  Text,
  View,
} from "react-native"
import { TextInput, Button } from "react-native-paper"
import Toast from "react-native-toast-message"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import {
  StorageService,
  StoredKey,
  NostrService,
} from "@odevlibertario/nostrlivery-common"
import { QRScanner } from "@components/QRScanner"

export const HomeScreen = ({ navigation }: any) => {
  const [companyNpub, setCompanyNpub] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [npubError, setNpubError] = useState("")
  const storageService = new StorageService()

  useEffect(() => {
    storageService.get(StoredKey.PROFILE).then((data) => {
      if (!data) {
        navigation.navigate("Login")
      }
    })
  }, [])

  const handleNpubChange = (text: string) => {
    setCompanyNpub(text)
    if (npubError) {
      setNpubError("")
    }
  }

  const searchCompany = async (npub: string) => {
    const trimmed = npub.trim()
    if (!trimmed) {
      setNpubError("Please enter a company npub")
      return
    }

    if (!trimmed.startsWith("npub1")) {
      setNpubError("Invalid npub format. Must start with 'npub1'")
      return
    }

    setIsLoading(true)
    setNpubError("")

    try {
      const nostrService = new NostrService()
      const profile = await nostrService.getProfile(trimmed)

      if (
        profile &&
        profile.name !== "Unknown Driver" &&
        profile.display_name !== "Unknown"
      ) {
        navigation.navigate("CompanyMenu", { companyNpub: trimmed })
      } else {
        setNpubError("Company profile not found")
      }
    } catch (error) {
      console.error("Error fetching company profile:", error)
      setNpubError("Invalid npub format or failed to fetch profile")
      Toast.show({ type: "error", text1: "Failed to find company" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchCompany = () => {
    searchCompany(companyNpub)
  }

  const handleQRScan = (scannedNpub: string) => {
    setCompanyNpub(scannedNpub)
    setNpubError("")
    setShowQRScanner(false)
    searchCompany(scannedNpub)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a company</Text>
      <Text style={styles.hint}>
        Paste a company npub or scan their QR code to browse their menu and place
        an order.
      </Text>

      <View style={styles.searchContainer}>
        <TextInput
          label="Company NPUB"
          value={companyNpub}
          onChangeText={handleNpubChange}
          style={styles.input}
          placeholder="npub1..."
          mode="outlined"
          autoCapitalize="none"
          error={!!npubError}
        />
        {npubError ? <Text style={styles.errorText}>{npubError}</Text> : null}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSearchCompany}
            loading={isLoading}
            disabled={isLoading}
            style={[styles.searchButton, styles.searchButtonLeft]}
          >
            Search Company
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowQRScanner(true)}
            disabled={isLoading}
            style={[styles.searchButton, styles.searchButtonRight]}
            icon={() => (
              <MaterialCommunityIcons
                name="qrcode-scan"
                color="#2f1650"
                size={20}
              />
            )}
          >
            Scan QR
          </Button>
        </View>
      </View>

      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
    paddingTop: "12%",
  },
  title: {
    fontWeight: "bold",
    fontSize: 22,
    color: "#2f1650",
    marginBottom: 8,
  },
  hint: {
    color: "#555",
    marginBottom: 16,
  },
  searchContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  input: {
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },
  searchButton: {
    flex: 1,
    marginTop: 8,
  },
  searchButtonLeft: {
    marginRight: 4,
  },
  searchButtonRight: {
    marginLeft: 4,
  },
  errorText: {
    color: "#d32f2f",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
})
