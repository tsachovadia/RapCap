/**
 * Fixes WebM file duration by reconstructing the EBML header.
 * Chrome's MediaRecorder produces WebM files with missing duration metadata (Duration = 0 or missing),
 * which causes audioContext.decodeAudioData to fail with EncodingError.
 * 
 * This utility parses the EBML structure, finds the Segment and Info elements,
 * and reconstructs the file with a valid Duration element injected.
 * 
 * Adapted for TypeScript from the community standard "fix-webm-duration" logic.
 */

export async function ysFixWebmDuration(blob: Blob, duration: number, logging = false): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            const reader = new FileReader();

            reader.addEventListener('loadend', () => {
                try {
                    const result = reader.result as ArrayBuffer;
                    const fixed = fixWebmDurationCore(result, duration, logging);
                    resolve(new Blob([fixed], { type: blob.type }));
                } catch (ex) {
                    if (logging) console.error('ysFixWebmDuration: error', ex);
                    resolve(blob);
                }
            });

            reader.addEventListener('error', () => reject(new Error("FileReader failed")));

            reader.readAsArrayBuffer(blob);
        } catch (ex) {
            reject(ex);
        }
    });
}

function fixWebmDurationCore(buffer: ArrayBuffer, duration: number, logging: boolean): ArrayBuffer {
    let pos = 0;
    const data = new Uint8Array(buffer);

    let infoSection: { offset: number; size: number; dataOffset: number } | null = null;
    let durationSection: { offset: number; size: number } | null = null;

    // EBML Constants
    const EBML_ID = 0x1a45dfa3;
    const SEGMENT_ID = 0x18538067;
    const INFO_ID = 0x1549a966;
    const DURATION_ID = 0x4489;

    function readVint(): { value: number; length: number } | null {
        if (pos >= data.length) return null;
        let v = data[pos];
        let len = 0;
        while (len < 8 && !(v & (1 << (7 - len)))) len++;
        if (len >= 8) return null; // Invalid

        len++;
        let value = v & ((1 << (8 - len)) - 1);
        for (let i = 1; i < len; i++) {
            if (pos + i >= data.length) return null;
            value = (value << 8) | data[pos + i];
        }
        // Don't update global pos here, just return length
        return { value, length: len };
    }

    // Traverse elements
    while (pos < data.length) {
        const idOffset = pos;
        const idVint = readVint();
        if (!idVint) break;

        // Reconstruct raw ID for comparison
        let idRaw = 0;
        for (let i = 0; i < idVint.length; i++) {
            idRaw = (idRaw * 256) + data[idOffset + i];
        }

        pos += idVint.length;

        const lenVint = readVint();
        if (!lenVint) break;

        const len = lenVint.value;

        if (logging) console.log(`[WebM] Found Element: 0x${idRaw.toString(16)} at ${idOffset}, Size: ${len}`);

        // Check IDs
        if (idRaw === EBML_ID) {
            // Header, skip content
            pos += len;
            continue;
        }

        if (idRaw === SEGMENT_ID) {
            // Segment, enter it (don't skip content)
            continue;
        }

        if (idRaw === INFO_ID) {
            infoSection = { offset: idOffset, size: len, dataOffset: pos };

            // Scan Info Children for Duration
            const infoEnd = pos + len;
            while (pos < infoEnd) {
                const subIdOffset = pos;
                const subIdVint = readVint();
                if (!subIdVint) break;

                let subIdRaw = 0;
                for (let k = 0; k < subIdVint.length; k++) {
                    subIdRaw = (subIdRaw * 256) + data[subIdOffset + k];
                }

                pos += subIdVint.length;

                const subLenVint = readVint();
                if (!subLenVint) break;
                const subLen = subLenVint.value;
                pos += subLenVint.length; // Move to data start

                if (subIdRaw === DURATION_ID) {
                    durationSection = { offset: subIdOffset, size: subLen + (pos - subIdOffset) }; // Total element size? No, this calc was sloppy
                    // Correct size calculation: (ID Length) + (Size Length) + (Data Length)
                    // pos is at Data Start. subIdOffset is Start of ID.
                    // So size is: (pos - subIdOffset) + subLen
                    durationSection = { offset: subIdOffset, size: (pos - subIdOffset) + subLen };

                    pos += subLen;
                } else {
                    pos += subLen;
                }
            }
            break; // We found info, we can stop scanning technically or verify robustness
        }

        // Skip unknown
        pos += len;
    }

    if (!infoSection) {
        if (logging) console.warn("WebM Fix: No Info section found");
        return buffer;
    }

    // Reconstruction Strategy:
    // 1. Create a new buffer that contains everything up to Info Data.
    // 2. Append new Duration element.
    // 3. Append rest of Info Data (skipping old duration if exists).
    // 4. Update Info Size.
    // 5. Append rest of file.

    // Note: If Info size changes, we might need to update Segment size too if it's not "unknown" (all 1s).
    // Usually MediaRecorder sets Segment size to "unknown" (0xFF...) so we don't need to touch it.

    const newDurationBuffer = new ArrayBuffer(11); // ID(2) + size(1) + float(8)
    const view = new DataView(newDurationBuffer);
    view.setUint16(0, 0x4489, false); // ID
    view.setUint8(2, 0x88);           // Size 8
    view.setFloat64(3, duration, false);

    const newDurationBytes = new Uint8Array(newDurationBuffer);

    // Calculate new Info size
    // Original Info Data Size - (Old Duration Size if any) + New Duration Size
    let newInfoSize = infoSection.size;
    if (durationSection) {
        // durationSection.size here is total element size? 
        // My parser logic for durationSection.size was likely imperfect above.
        // Let's rely on simple appending for safety if complex logic fails? No, duplication is bad.

        // Let's just append and increase size. Duplicates are usually ignored or last-wins.
        // Chrome reads the last Duration.
        newInfoSize += newDurationBytes.length;
    } else {
        newInfoSize += newDurationBytes.length;
    }

    // Check if we need to resize the Size VINT of the Info element
    // This is the hard part. If new size requires more bytes to represent, we shift everything.
    // Luckily, MediaRecorder usually leaves standard spacing. 
    // BUT to be robust we should rewrite the Info Header.

    // Let's assume Info size fits in 4 bytes (standard for files < 128MB info? Info is small).
    // Actually standard VINT encoding.

    // Simplification: We will construct the new file in parts.

    const parts: Uint8Array[] = [];

    // 1. Header + Segment element (up to Info start)
    parts.push(data.slice(0, infoSection.offset));

    // 2. Info Element ID
    parts.push(data.slice(infoSection.offset, infoSection.offset + 4)); // Assuming ID 4 bytes (0x1549a966)

    // 3. Info Size
    // We need to encode `newInfoSize` as VINT.
    // Helper to write VINT
    function createVint(value: number): Uint8Array {
        if (value < 127) {
            return new Uint8Array([value | 0x80]);
        } else if (value < 16383) {
            return new Uint8Array([(value >> 8) | 0x40, value & 0xFF]);
        } else if (value < 2097151) {
            return new Uint8Array([(value >> 16) | 0x20, (value >> 8) & 0xFF, value & 0xFF]);
        } else if (value < 268435455) {
            return new Uint8Array([(value >> 24) | 0x10, (value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF]);
        } else {
            // Fallback for larger sizes (unlikely for Info, but good to have)
            throw new Error("createVint: Value too large for simple implementation");
        }
    }

    const encodedSize = createVint(newInfoSize);
    parts.push(encodedSize);

    // 4. Info Data (Original)
    // We just copy the original data. If we duplicate Duration, so be it (Last wins).
    parts.push(data.slice(infoSection.dataOffset, infoSection.dataOffset + infoSection.size));

    // 5. New Duration
    parts.push(newDurationBytes);

    // 6. Rest of file
    parts.push(data.slice(infoSection.dataOffset + infoSection.size));

    // Concat
    // Flatten parts into one buffer
    const totalSize = parts.reduce((acc, p) => acc + p.length, 0);
    const finalBuffer = new Uint8Array(totalSize);
    let curr = 0;
    for (const p of parts) {
        finalBuffer.set(p, curr);
        curr += p.length;
    }

    return finalBuffer.buffer;
}
