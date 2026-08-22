export enum NostrEventKinds {
    REGULAR = 1000,
    EPHEMERAL = 20000,
    REPLACEABLE = 30000,
    /** Parameterized replaceable order snapshot (NIP-33 style). */
    ORDER = 31200,
}