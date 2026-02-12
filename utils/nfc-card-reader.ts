/**
 * NFC EMV Card Reader Utility
 *
 * Reads contactless debit/credit cards via NFC using ISO-DEP (IsoDep)
 * and APDU commands following the EMV contactless specification.
 *
 * Returns: card type, masked PAN (last 4), expiry date.
 * Does NOT process payments — identification only.
 */

import NfcManager, { NfcTech } from "react-native-nfc-manager";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface CardInfo {
    type: "visa" | "mastercard" | "amex" | "unknown";
    label: string; // "VISA", "MASTERCARD", etc.
    lastFour: string;
    expiry: string; // MM/YY
    holderName?: string;
    aid: string; // Application ID hex
}

// ─── Known AIDs ──────────────────────────────────────────────────────────────
const KNOWN_AIDS: { aid: string; type: CardInfo["type"]; label: string }[] = [
    { aid: "A0000000031010", type: "visa", label: "VISA" },
    { aid: "A0000000032010", type: "visa", label: "VISA ELECTRON" },
    { aid: "A0000000041010", type: "mastercard", label: "MASTERCARD" },
    { aid: "A0000000042010", type: "mastercard", label: "MAESTRO" },
    { aid: "A00000002501", type: "amex", label: "AMEX" },
];

// ─── APDU Helpers ────────────────────────────────────────────────────────────
/** Convert hex string to byte array */
const hexToBytes = (hex: string): number[] => {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
};

/** Convert byte array to hex string */
const bytesToHex = (bytes: number[]): string =>
    bytes.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join("");

/** Build SELECT command for a given AID */
const buildSelectAid = (aidHex: string): number[] => {
    const aidBytes = hexToBytes(aidHex);
    return [0x00, 0xa4, 0x04, 0x00, aidBytes.length, ...aidBytes, 0x00];
};

/** SELECT PPSE (Proximity Payment System Environment) */
const SELECT_PPSE: number[] = [
    0x00, 0xa4, 0x04, 0x00, 0x0e, ...hexToBytes("325041592E5359532E4444463031"), 0x00,
]; // "2PAY.SYS.DDF01"

/** GET PROCESSING OPTIONS (minimal PDOL) */
const GET_PROCESSING_OPTIONS: number[] = [
    0x80, 0xa8, 0x00, 0x00, 0x02, 0x83, 0x00, 0x00,
];

// ─── TLV Parser ──────────────────────────────────────────────────────────────
interface TLVEntry {
    tag: string;
    length: number;
    value: number[];
}

/**
 * Parse a TLV (Tag-Length-Value) structure from EMV response data.
 * Handles 1-byte and 2-byte tags, and 1-byte and multi-byte lengths.
 */
const parseTLV = (data: number[]): TLVEntry[] => {
    const entries: TLVEntry[] = [];
    let i = 0;

    while (i < data.length) {
        // Parse tag
        let tag = data[i].toString(16).padStart(2, "0").toUpperCase();
        i++;

        // Multi-byte tag: if lower 5 bits are all 1s
        if ((parseInt(tag, 16) & 0x1f) === 0x1f && i < data.length) {
            tag += data[i].toString(16).padStart(2, "0").toUpperCase();
            i++;
            // Could be even longer, but 2-byte tags cover EMV needs
        }

        if (i >= data.length) break;

        // Parse length
        let length = data[i];
        i++;

        if (length === 0x81 && i < data.length) {
            length = data[i];
            i++;
        } else if (length === 0x82 && i + 1 < data.length) {
            length = (data[i] << 8) | data[i + 1];
            i += 2;
        }

        if (i + length > data.length) break;

        // Extract value
        const value = data.slice(i, i + length);
        i += length;

        entries.push({ tag, length, value });
    }

    return entries;
};

/** Recursively search TLV data for a specific tag */
const findTag = (entries: TLVEntry[], targetTag: string): TLVEntry | undefined => {
    for (const entry of entries) {
        if (entry.tag === targetTag) return entry;
        // Try parsing value as nested TLV
        if (entry.value.length > 2) {
            try {
                const nested = parseTLV(entry.value);
                const found = findTag(nested, targetTag);
                if (found) return found;
            } catch {
                // Not nested TLV, that's fine
            }
        }
    }
    return undefined;
};

/** Decode BCD-encoded PAN from byte array */
const decodePAN = (bytes: number[]): string => {
    return bytes
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .replace(/[fF]+$/, ""); // Remove trailing F padding
};

/** Decode BCD expiry date (YYMM format in EMV tag 5F24) */
const decodeExpiry = (bytes: number[]): string => {
    if (bytes.length < 2) return "??/??";
    const hex = bytesToHex(bytes);
    // Tag 5F24: YYMMDD
    const yy = hex.substring(0, 2);
    const mm = hex.substring(2, 4);
    return `${mm}/${yy}`;
};

/** Decode ASCII holder name */
const decodeHolderName = (bytes: number[]): string => {
    return String.fromCharCode(...bytes)
        .replace(/\//g, " ")
        .trim();
};

// ─── Main Reader ─────────────────────────────────────────────────────────────

/** Check if NFC is supported on this device */
export const isNfcSupported = async (): Promise<boolean> => {
    try {
        const supported = await NfcManager.isSupported();
        return supported;
    } catch {
        return false;
    }
};

/** Check if NFC is enabled */
export const isNfcEnabled = async (): Promise<boolean> => {
    try {
        const enabled = await NfcManager.isEnabled();
        return enabled;
    } catch {
        return false;
    }
};

/** Start NFC manager (call once at app start or before first use) */
export const initNfc = async (): Promise<boolean> => {
    try {
        await NfcManager.start();
        return true;
    } catch {
        return false;
    }
};

/**
 * Read a contactless card via NFC.
 *
 * - Requests IsoDep technology
 * - Tries SELECT PPSE first to discover AIDs
 * - Falls back to trying known AIDs directly
 * - Reads card data via GET PROCESSING OPTIONS and READ RECORD
 *
 * @returns CardInfo or null if reading fails
 */
export const readContactlessCard = async (): Promise<CardInfo | null> => {
    try {
        // Request IsoDep (ISO 14443-4) technology — this waits for card tap
        await NfcManager.requestTechnology(NfcTech.IsoDep);

        let detectedAid = "";
        let detectedType: CardInfo["type"] = "unknown";
        let detectedLabel = "TARJETA";

        // ── Step 1: SELECT PPSE to discover AIDs ──────────────────────────────
        try {
            const ppseResponse = await NfcManager.isoDepHandler.transceive(SELECT_PPSE);
            const ppseHex = bytesToHex(ppseResponse);

            // Check if response is successful (ends with 9000)
            if (ppseHex.endsWith("9000")) {
                // Look for AIDs in PPSE response (tag 4F)
                const responseData = ppseResponse.slice(0, -2); // Remove SW1SW2
                const tlv = parseTLV(responseData);
                const aidEntry = findTag(tlv, "4F");

                if (aidEntry) {
                    const foundAid = bytesToHex(aidEntry.value);
                    const known = KNOWN_AIDS.find(
                        (k) => foundAid.toUpperCase().startsWith(k.aid)
                    );
                    if (known) {
                        detectedAid = known.aid;
                        detectedType = known.type;
                        detectedLabel = known.label;
                    } else {
                        detectedAid = foundAid;
                    }
                }
            }
        } catch {
            // PPSE not supported, will try direct AID selection
        }

        // ── Step 2: If PPSE didn't work, try known AIDs directly ──────────────
        if (!detectedAid) {
            for (const known of KNOWN_AIDS) {
                try {
                    const selectCmd = buildSelectAid(known.aid);
                    const response = await NfcManager.isoDepHandler.transceive(selectCmd);
                    const hex = bytesToHex(response);

                    if (hex.endsWith("9000")) {
                        detectedAid = known.aid;
                        detectedType = known.type;
                        detectedLabel = known.label;
                        break;
                    }
                } catch {
                    continue;
                }
            }
        }

        // If we found an AID, SELECT it (if not already selected)
        if (detectedAid) {
            try {
                const selectCmd = buildSelectAid(detectedAid);
                await NfcManager.isoDepHandler.transceive(selectCmd);
            } catch {
                // May already be selected
            }
        }

        // ── Step 3: GET PROCESSING OPTIONS ────────────────────────────────────
        let pan = "";
        let expiry = "";
        let holderName = "";

        try {
            const gpoResponse = await NfcManager.isoDepHandler.transceive(
                GET_PROCESSING_OPTIONS
            );
            const gpoHex = bytesToHex(gpoResponse);

            if (gpoHex.endsWith("9000")) {
                const gpoData = gpoResponse.slice(0, -2);
                const gpoTlv = parseTLV(gpoData);

                // Check for PAN (tag 5A) and expiry (tag 5F24) in GPO response
                const panEntry = findTag(gpoTlv, "5A");
                if (panEntry) pan = decodePAN(panEntry.value);

                const expiryEntry = findTag(gpoTlv, "5F24");
                if (expiryEntry) expiry = decodeExpiry(expiryEntry.value);

                const nameEntry = findTag(gpoTlv, "5F20");
                if (nameEntry) holderName = decodeHolderName(nameEntry.value);
            }
        } catch {
            // GPO failed, try reading records directly
        }

        // ── Step 4: READ RECORD to find PAN if not found yet ──────────────────
        if (!pan) {
            // Try reading SFI 1-3, Record 1-3
            for (let sfi = 1; sfi <= 3 && !pan; sfi++) {
                for (let rec = 1; rec <= 3 && !pan; rec++) {
                    try {
                        const p2 = (sfi << 3) | 0x04;
                        const readCmd = [0x00, 0xb2, rec, p2, 0x00];
                        const response = await NfcManager.isoDepHandler.transceive(readCmd);
                        const hex = bytesToHex(response);

                        if (hex.endsWith("9000")) {
                            const recordData = response.slice(0, -2);
                            const recordTlv = parseTLV(recordData);

                            const panEntry = findTag(recordTlv, "5A");
                            if (panEntry) pan = decodePAN(panEntry.value);

                            if (!expiry) {
                                const expiryEntry = findTag(recordTlv, "5F24");
                                if (expiryEntry) expiry = decodeExpiry(expiryEntry.value);
                            }

                            if (!holderName) {
                                const nameEntry = findTag(recordTlv, "5F20");
                                if (nameEntry) holderName = decodeHolderName(nameEntry.value);
                            }
                        }
                    } catch {
                        continue;
                    }
                }
            }
        }

        // ── Build result ──────────────────────────────────────────────────────
        const lastFour = pan.length >= 4 ? pan.slice(-4) : "????";

        return {
            type: detectedType,
            label: detectedLabel,
            lastFour,
            expiry: expiry || "--/--",
            holderName: holderName || undefined,
            aid: detectedAid,
        };
    } catch (error: any) {
        console.warn("[NFC Card Reader] Error:", error?.message || error);
        return null;
    } finally {
        // Always clean up
        try {
            NfcManager.cancelTechnologyRequest();
        } catch {
            // Ignore cleanup errors
        }
    }
};

/** Cancel an ongoing NFC read */
export const cancelNfcRead = async () => {
    try {
        await NfcManager.cancelTechnologyRequest();
    } catch {
        // Ignore
    }
};
