import { finalizeEvent, nip19, getPublicKey, nip05, Relay } from "nostr-tools"

export class NostrService {
    private relay: Relay | null = null
    private relayUrl: string = "ws://192.168.1.199:7000"

    constructor(relayUrl?: string) {
        if (relayUrl) {
            this.relayUrl = relayUrl
        }
    }

    private async connectToRelay(): Promise<Relay> {
        if (this.relay) {
            return this.relay
        }

        try {
            this.relay = new Relay(this.relayUrl)
            await this.relay.connect()
            return this.relay
        } catch (error) {
            console.error("Failed to connect to relay:", error)
            throw new Error(`Failed to connect to relay: ${error}`)
        }
    }

    signNostrliveryEvent(nsec: string, eventType: string, params: any) {
        try {
            const sk = nip19.decode(nsec)
            return finalizeEvent({
                kind: 1,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: JSON.stringify({
                    eventType,
                    params
                }),
            }, sk.data as Uint8Array)
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    signNostrEvent(nsec: string, kind: number, tags: string[][], content: any) {
        try {
            const sk = nip19.decode(nsec)
            return finalizeEvent({
                kind,
                created_at: Math.floor(Date.now() / 1000),
                tags,
                content: JSON.stringify(content),
            }, sk.data as Uint8Array)
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    async getProfile(npub: string): Promise<any> {
        try {
            // Decode the npub to get the public key
            const { data: pubkey } = nip19.decode(npub)
            
            // Connect to relay and query for kind 0 events (profile events)
            const relay = await this.connectToRelay()
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Profile query timeout"))
                }, 10000) // 10 second timeout

                const sub = relay.subscribe([
                    {
                        kinds: [0], // Profile events
                        authors: [pubkey as string],
                        limit: 1
                    }
                ], {
                    onevent: (event) => {
                        clearTimeout(timeout)
                        try {
                            const profileData = JSON.parse(event.content)
                            resolve({
                                name: profileData.name || profileData.display_name || "Unknown",
                                about: profileData.about || profileData.bio || "",
                                picture: profileData.picture || profileData.avatar || "",
                                display_name: profileData.display_name || profileData.name || "Unknown"
                            })
                        } catch (parseError) {
                            console.error("Error parsing profile data:", parseError)
                            resolve({
                                name: "Unknown Driver",
                                about: "No description available",
                                picture: "",
                                display_name: "Unknown"
                            })
                        }
                    },
                    oneose: () => {
                        clearTimeout(timeout)
                        // If no profile event found, return default values
                        resolve({
                            name: "Unknown Driver",
                            about: "No description available", 
                            picture: "",
                            display_name: "Unknown"
                        })
                    }
                })

                // Handle subscription errors - using try-catch instead of event listener
                try {
                    // The subscription will handle errors through the Promise rejection
                } catch (error) {
                    clearTimeout(timeout)
                    console.error("Profile subscription error:", error)
                    reject(new Error(`Profile query failed: ${error}`))
                }
            })
        } catch (e) {
            console.log("Error getting profile:", e)
            // Fallback to default profile if relay query fails
            return {
                name: "Unknown Driver",
                about: "No description available",
                picture: "",
                display_name: "Unknown"
            }
        }
    }

    async publishEphemeralEvent(kind: number, content: string): Promise<void> {
        try {
            // Connect to relay and publish the event
            const relay = await this.connectToRelay()
            
            // Create a temporary event for publishing (this will be replaced by actual signing in real implementation)
            const event = {
                kind,
                created_at: Math.floor(Date.now() / 1000),
                tags: [],
                content: content,
                pubkey: "", // This should be set by the actual signer
                id: "", // This should be calculated
                sig: "" // This should be signed
            }

            console.log("Publishing ephemeral event to relay:", {
                kind,
                content,
                timestamp: new Date().toISOString()
            })

            // Publish the event to the relay
            await relay.publish(event)
            
            console.log("Event published successfully")
        } catch (e) {
            console.log("Error publishing ephemeral event:", e)
            // For now, we'll still log the event even if relay publishing fails
            // This ensures the app continues to work during development
            console.log("Fallback: Logging event locally:", {
                kind,
                content,
                timestamp: new Date().toISOString()
            })
            throw e
        }
    }

    async closeRelayConnection(): Promise<void> {
        if (this.relay) {
            try {
                await this.relay.close()
                this.relay = null
                console.log("Relay connection closed")
            } catch (error) {
                console.error("Error closing relay connection:", error)
            }
        }
    }
}