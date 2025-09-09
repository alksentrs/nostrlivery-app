import React, { useState, useEffect } from "react"
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Alert,
    TouchableOpacity,
} from "react-native"
import { TextInput, Button, Card, Title, Paragraph } from "react-native-paper"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { NostrService, StorageService, StoredKey } from "@odevlibertario/nostrlivery-common"
import { QRScanner } from "../../components/QRScanner"

interface AssociatedDriver {
    id: string
    name: string
    npub: string
    profilePicture?: string
}

export const AssociatedDriversScreen = ({ navigation }: any) => {
    const [driverNpub, setDriverNpub] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [associatedDrivers] = useState<AssociatedDriver[]>([]) // Always empty for now
    const [showQRScanner, setShowQRScanner] = useState(false)
    const [driverResponses, setDriverResponses] = useState<any[]>([])
    const [isListening, setIsListening] = useState(false)
    const [unsubscribeFunction, setUnsubscribeFunction] = useState<(() => void) | null>(null)

    const nostrService = new NostrService()
    const storageService = new StorageService()

    useEffect(() => {
        console.log("🔄 Company useEffect called - isListening:", isListening, "unsubscribeFunction:", !!unsubscribeFunction)
        
        if (!isListening && !unsubscribeFunction) {
            console.log("✅ Starting to listen for driver responses...")
            startListeningForResponses()
        }
        
        return () => {
            console.log("🧹 Company useEffect cleanup called")
            if (unsubscribeFunction) {
                stopListeningForResponses()
            }
        }
    }, [])

    const startListeningForResponses = async () => {
        try {
            console.log("🚀 Company startListeningForResponses called")
            
            if (isListening || unsubscribeFunction) {
                console.log("⚠️ Already listening or has unsubscribe function, skipping...")
                return
            }
            
            setIsListening(true)
            console.log("Starting to listen for driver responses...")
            
            const unsubscribe = await nostrService.subscribeToEphemeralEvents(
                (event) => {
                    console.log("Company screen received event:", {
                        id: event.id,
                        kind: event.kind,
                        pubkey: event.pubkey,
                        content: event.content,
                        created_at: event.created_at
                    })
                    
                    try {
                        // Handle double-encoded JSON content
                        let contentString = event.content
                        if (contentString.startsWith('"') && contentString.endsWith('"')) {
                            contentString = JSON.parse(contentString)
                        }
                        
                        const content = JSON.parse(contentString)
                        console.log("Parsed content:", content)
                        console.log("Content type:", content.type)
                        
                        if (content.type === "DRIVER_ASSOCIATION_ACCEPTED" || content.type === "DRIVER_ASSOCIATION_REJECTED") {
                            console.log("✅ Received driver response:", content)
                            setDriverResponses(prev => [...prev, {
                                id: event.id,
                                driverPubkey: event.pubkey,
                                driverNpub: content.driverNpub,
                                companyPubkey: content.companyPubkey,
                                responseType: content.type,
                                originalRequestId: content.originalRequestId,
                                timestamp: new Date(event.created_at * 1000),
                                event: event
                            }])
                            
                            // Show alert to user
                            const message = content.type === "DRIVER_ASSOCIATION_ACCEPTED" 
                                ? "Driver accepted your association request!" 
                                : "Driver rejected your association request."
                            Alert.alert("Driver Response", message)
                        } else {
                            console.log("Event is not a driver response, type:", content.type)
                        }
                    } catch (error) {
                        console.error("Error parsing event content:", error)
                        console.log("Raw content that failed to parse:", event.content)
                    }
                },
                () => {
                    console.log("End of stored events - listening for new events...")
                }
            )
            
            // Store unsubscribe function for cleanup
            setUnsubscribeFunction(() => unsubscribe)
            
        } catch (error) {
            console.error("Error starting driver response listener:", error)
            setIsListening(false)
        }
    }

    const stopListeningForResponses = () => {
        try {
            if (unsubscribeFunction) {
                unsubscribeFunction()
                setUnsubscribeFunction(null)
            }
            setIsListening(false)
            console.log("Stopped listening for driver responses")
        } catch (error) {
            console.error("Error stopping driver response listener:", error)
        }
    }

    const handleSearchDriver = async () => {
        if (!driverNpub.trim()) {
            Alert.alert("Error", "Please enter a driver npub")
            return
        }

        setIsLoading(true)
        try {
            const nostrService = new NostrService()
            const profile = await nostrService.getProfile(driverNpub.trim())
            
            if (profile) {
                navigation.navigate("DriverPreview", {
                    driverNpub: driverNpub.trim(),
                    profile: profile
                })
            } else {
                Alert.alert("Error", "Driver profile not found")
            }
        } catch (error) {
            console.error("Error fetching driver profile:", error)
            Alert.alert("Error", "Failed to fetch driver profile")
        } finally {
            setIsLoading(false)
        }
    }

    const handleQRScan = (scannedNpub: string) => {
        setDriverNpub(scannedNpub)
        setShowQRScanner(false)
        // Automatically search for the driver after scanning
        handleSearchDriverWithNpub(scannedNpub)
    }

    const handleSearchDriverWithNpub = async (npub: string) => {
        if (!npub.trim()) {
            Alert.alert("Error", "Please enter a driver npub")
            return
        }

        setIsLoading(true)
        try {
            const nostrService = new NostrService()
            const profile = await nostrService.getProfile(npub.trim())
            
            if (profile) {
                navigation.navigate("DriverPreview", {
                    driverNpub: npub.trim(),
                    profile: profile
                })
            } else {
                Alert.alert("Error", "Driver profile not found")
            }
        } catch (error) {
            console.error("Error fetching driver profile:", error)
            Alert.alert("Error", "Failed to fetch driver profile")
        } finally {
            setIsLoading(false)
        }
    }

    const renderDriverItem = ({ item }: { item: AssociatedDriver }) => (
        <Card style={styles.driverCard}>
            <Card.Content>
                <Title>{item.name}</Title>
                <Paragraph>{item.npub}</Paragraph>
            </Card.Content>
        </Card>
    )

    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No associated drivers yet</Text>
            <Text style={styles.emptySubtext}>Add a driver using the form above</Text>
        </View>
    )

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Title style={styles.title}>Associated Drivers</Title>
            </View>

            {/* Driver Responses Section */}
            <Card style={styles.responsesCard}>
                <Card.Content>
                    <Title style={styles.responsesTitle}>Driver Responses</Title>
                    <Text style={styles.responsesSubtitle}>
                        {isListening ? "Listening for responses..." : "Not listening"}
                    </Text>
                    <Text style={styles.responsesCount}>
                        Responses: {driverResponses.length}
                    </Text>
                    {driverResponses.length > 0 && (
                        <View style={styles.responsesList}>
                            {driverResponses.slice(-3).map((response, index) => (
                                <View key={response.id} style={styles.responseItem}>
                                    <Text style={styles.responseText}>
                                        {response.responseType === "DRIVER_ASSOCIATION_ACCEPTED" ? "✅" : "❌"} 
                                        Driver {response.responseType === "DRIVER_ASSOCIATION_ACCEPTED" ? "accepted" : "rejected"} 
                                        your request
                                    </Text>
                                    <Text style={styles.responseTime}>
                                        {response.timestamp.toLocaleString()}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Card.Content>
            </Card>

            <View style={styles.searchContainer}>
                <TextInput
                    label="Driver NPUB"
                    value={driverNpub}
                    onChangeText={setDriverNpub}
                    style={styles.input}
                    placeholder="npub1..."
                    mode="outlined"
                />
                <View style={styles.buttonContainer}>
                    <Button
                        mode="contained"
                        onPress={handleSearchDriver}
                        loading={isLoading}
                        disabled={isLoading}
                        style={[styles.searchButton, styles.searchButtonLeft]}
                    >
                        Search Driver
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => setShowQRScanner(true)}
                        disabled={isLoading}
                        style={[styles.searchButton, styles.searchButtonRight]}
                        icon={() => <MaterialCommunityIcons name="qrcode-scan" color="#2f1650" size={20} />}
                    >
                        Scan QR
                    </Button>
                </View>
            </View>

            <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Current Drivers</Text>
                <FlatList
                    data={associatedDrivers}
                    renderItem={renderDriverItem}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={renderEmptyList}
                    style={styles.driversList}
                />
            </View>

            {/* QR Scanner Modal */}
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
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#2f1650",
        flex: 1,
    },
    searchContainer: {
        backgroundColor: "white",
        padding: 16,
        borderRadius: 8,
        marginBottom: 20,
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
        flexDirection: 'row',
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
    listContainer: {
        flex: 1,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333",
        marginBottom: 12,
    },
    driversList: {
        flex: 1,
    },
    driverCard: {
        marginBottom: 8,
        elevation: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: "#999",
    },
    responsesCard: {
        marginBottom: 16,
        backgroundColor: "#f8f9fa",
    },
    responsesTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2f1650",
        marginBottom: 8,
    },
    responsesSubtitle: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4,
    },
    responsesCount: {
        fontSize: 12,
        color: "#999",
        marginBottom: 8,
    },
    responsesList: {
        marginTop: 8,
    },
    responseItem: {
        backgroundColor: "white",
        padding: 8,
        borderRadius: 4,
        marginBottom: 4,
        borderLeftWidth: 3,
        borderLeftColor: "#4CAF50",
    },
    responseText: {
        fontSize: 14,
        color: "#333",
        marginBottom: 2,
    },
    responseTime: {
        fontSize: 12,
        color: "#666",
    },
})
