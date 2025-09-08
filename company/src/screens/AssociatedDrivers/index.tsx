import React, { useState } from "react"
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Alert,
} from "react-native"
import { TextInput, Button, Card, Title, Paragraph } from "react-native-paper"
import { NostrService } from "@odevlibertario/nostrlivery-common"

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

            <View style={styles.searchContainer}>
                <TextInput
                    label="Driver NPUB"
                    value={driverNpub}
                    onChangeText={setDriverNpub}
                    style={styles.input}
                    placeholder="npub1..."
                    mode="outlined"
                />
                <Button
                    mode="contained"
                    onPress={handleSearchDriver}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.searchButton}
                >
                    Search Driver
                </Button>
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
    searchButton: {
        marginTop: 8,
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
})
