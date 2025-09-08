import React, { useState } from "react"
import {
    View,
    Text,
    StyleSheet,
    Image,
    Alert,
} from "react-native"
import { Button, Card, Title, Paragraph, ActivityIndicator } from "react-native-paper"
import { NostrService } from "@odevlibertario/nostrlivery-common"

interface DriverProfile {
    name?: string
    about?: string
    picture?: string
    display_name?: string
}

export const DriverPreviewScreen = ({ navigation, route }: any) => {
    const { driverNpub, profile } = route.params
    const [isAssociating, setIsAssociating] = useState(false)

    const handleAssociateDriver = async () => {
        setIsAssociating(true)
        try {
            const nostrService = new NostrService()
            
            // Create ephemeral event of kind 20000
            const associationRequest = {
                type: "DRIVER_ASSOCIATION_REQUEST",
                driverNpub: driverNpub
            }

            await nostrService.publishEphemeralEvent(20000, JSON.stringify(associationRequest))
            
            Alert.alert(
                "Success", 
                "Driver association request sent successfully!",
                [
                    {
                        text: "OK",
                        onPress: () => navigation.goBack()
                    }
                ]
            )
        } catch (error) {
            console.error("Error sending association request:", error)
            Alert.alert("Error", "Failed to send association request")
        } finally {
            setIsAssociating(false)
        }
    }

    const displayName = profile?.display_name || profile?.name || "Unknown Driver"
    const about = profile?.about || "No description available"
    const picture = profile?.picture

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Title style={styles.title}>Driver Preview</Title>
            </View>

            <Card style={styles.profileCard}>
                <Card.Content style={styles.profileContent}>
                    {picture ? (
                        <Image source={{ uri: picture }} style={styles.profileImage} />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Text style={styles.placeholderText}>
                                {displayName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    
                    <View style={styles.profileInfo}>
                        <Title style={styles.driverName}>{displayName}</Title>
                        <Paragraph style={styles.driverAbout}>{about}</Paragraph>
                        <Text style={styles.driverNpub}>NPUB: {driverNpub}</Text>
                    </View>
                </Card.Content>
            </Card>

            <View style={styles.actionContainer}>
                <Button
                    mode="contained"
                    onPress={handleAssociateDriver}
                    loading={isAssociating}
                    disabled={isAssociating}
                    style={styles.associateButton}
                    contentStyle={styles.buttonContent}
                >
                    {isAssociating ? "Sending Request..." : "Associate Driver"}
                </Button>
                
                <Button
                    mode="outlined"
                    onPress={() => navigation.goBack()}
                    style={styles.cancelButton}
                    contentStyle={styles.buttonContent}
                >
                    Cancel
                </Button>
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
    profileCard: {
        marginBottom: 30,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    profileContent: {
        flexDirection: "row",
        alignItems: "flex-start",
        padding: 20,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 16,
    },
    placeholderImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#2f1650",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    placeholderText: {
        color: "white",
        fontSize: 32,
        fontWeight: "bold",
    },
    profileInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#2f1650",
        marginBottom: 8,
    },
    driverAbout: {
        fontSize: 14,
        color: "#666",
        marginBottom: 12,
        lineHeight: 20,
    },
    driverNpub: {
        fontSize: 12,
        color: "#999",
        fontFamily: "monospace",
    },
    actionContainer: {
        flex: 1,
        justifyContent: "flex-end",
        paddingBottom: 20,
    },
    associateButton: {
        marginBottom: 12,
        backgroundColor: "#2f1650",
    },
    cancelButton: {
        borderColor: "#2f1650",
    },
    buttonContent: {
        paddingVertical: 8,
    },
})
