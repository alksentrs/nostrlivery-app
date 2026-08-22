import { getPublicKey, nip19 } from "nostr-tools"
import {
    MenuItem,
    NodeService,
    NostrService,
    StorageService,
    StoredKey,
    normalizeMenu,
} from "@odevlibertario/nostrlivery-common"

const storageService = new StorageService()
const nostrService = new NostrService()
const nodeService = new NodeService()

const MENU_TAGS = [
    ["d", "menu"],
    ["n", "menu"],
]

function parseMenuPayload(raw: unknown): MenuItem[] {
    if (raw == null || raw === "") {
        return []
    }
    let data = raw
    if (typeof data === "string") {
        try {
            data = JSON.parse(data)
        } catch {
            return []
        }
    }
    return normalizeMenu(data)
}

export async function fetchMenu(): Promise<MenuItem[]> {
    const nsec = await storageService.get(StoredKey.NSEC)
    let raw: unknown
    try {
        raw = await nodeService.queryEvent({
            kinds: [30000],
            authors: [getPublicKey(nip19.decode(nsec).data as Uint8Array)],
        })
    } catch (error) {
        if (error instanceof TypeError || error instanceof SyntaxError) {
            return []
        }
        throw error
    }
    return parseMenuPayload(raw)
}

export async function fetchMenuOrCache(): Promise<MenuItem[]> {
    const cached = parseMenuPayload(await storageService.get(StoredKey.MENU))
    try {
        const published = await fetchMenu()
        if (published.length > 0 || cached.length === 0) {
            return published
        }
        return cached
    } catch {
        return cached
    }
}

export async function publishMenu(items: MenuItem[]): Promise<MenuItem[]> {
    const nsec = await storageService.get(StoredKey.NSEC)
    const payload = items.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        categories: item.categories,
    }))
    const menuUpdateEvent = nostrService.signNostrEvent(
        nsec,
        30000,
        MENU_TAGS,
        payload
    )
    const event = nostrService.signNostrliveryEvent(nsec, "PUBLISH_EVENT", {
        event: menuUpdateEvent,
    })
    await nodeService.postEvent(event)
    const withIndex = payload.map((item, index) => ({ ...item, index }))
    await storageService.set(StoredKey.MENU, withIndex)
    return withIndex
}

export function splitCategories(value: string): string[] {
    return value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
}
