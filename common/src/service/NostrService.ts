import { finalizeEvent, nip19, getPublicKey, nip05 } from "nostr-tools"

export class NostrService {

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
            
            // For now, we'll return a mock profile since we don't have a relay connection
            // In a real implementation, you would query relays for kind 0 events
            return {
                name: "Driver Name",
                about: "Professional delivery driver",
                picture: "https://via.placeholder.com/150",
                display_name: "Driver"
            }
        } catch (e) {
            console.log("Error getting profile:", e)
            throw e
        }
    }

    async publishEphemeralEvent(kind: number, content: string): Promise<void> {
        try {
            // For now, we'll just log the event since we don't have relay publishing set up
            // In a real implementation, you would publish to relays
            console.log("Publishing ephemeral event:", {
                kind,
                content,
                timestamp: new Date().toISOString()
            })
            
            // Simulate async operation
            await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (e) {
            console.log("Error publishing ephemeral event:", e)
            throw e
        }
    }
}