export interface ZipEntryInput {
  name: string;
  data: Blob | ArrayBuffer | Uint8Array | string;
}

interface PreparedZipEntry {
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc32: number;
  offset: number;
}

const textEncoder = new TextEncoder();

const CRC_TABLE = new Uint32Array(256);

for (let i = 0; i < CRC_TABLE.length; i += 1) {
  let value = i;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[i] = value >>> 0;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function toBytes(data: ZipEntryInput["data"]): Promise<Uint8Array> {
  if (typeof data === "string") {
    return textEncoder.encode(data);
  }

  if (data instanceof Uint8Array) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  if (typeof data.arrayBuffer === "function") {
    return new Uint8Array(await data.arrayBuffer());
  }

  if (typeof data.text === "function") {
    return textEncoder.encode(await data.text());
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(new Uint8Array(reader.result));
        return;
      }

      reject(new Error("Expected FileReader to return an ArrayBuffer."));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Failed to read ZIP entry data.")));
    reader.readAsArrayBuffer(data);
  });
}

function createLocalHeader(entry: PreparedZipEntry): Uint8Array {
  const header = new Uint8Array(30 + entry.nameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, entry.crc32, true);
  view.setUint32(18, entry.data.byteLength, true);
  view.setUint32(22, entry.data.byteLength, true);
  view.setUint16(26, entry.nameBytes.length, true);
  view.setUint16(28, 0, true);
  header.set(entry.nameBytes, 30);

  return header;
}

function createCentralDirectoryHeader(entry: PreparedZipEntry): Uint8Array {
  const header = new Uint8Array(46 + entry.nameBytes.length);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, entry.crc32, true);
  view.setUint32(20, entry.data.byteLength, true);
  view.setUint32(24, entry.data.byteLength, true);
  view.setUint16(28, entry.nameBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, entry.offset, true);
  header.set(entry.nameBytes, 46);

  return header;
}

function createEndOfCentralDirectory(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Uint8Array {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);

  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);

  return header;
}

function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function createZip(entries: ZipEntryInput[]): Promise<Blob> {
  const preparedEntries: PreparedZipEntry[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = textEncoder.encode(entry.name);
    const data = await toBytes(entry.data);
    const preparedEntry = {
      nameBytes,
      data,
      crc32: crc32(data),
      offset,
    };

    preparedEntries.push(preparedEntry);
    offset += 30 + nameBytes.length + data.byteLength;
  }

  const chunks: BlobPart[] = [];
  for (const entry of preparedEntries) {
    chunks.push(toBlobPart(createLocalHeader(entry)), toBlobPart(entry.data));
  }

  const centralDirectoryOffset = offset;
  let centralDirectorySize = 0;
  for (const entry of preparedEntries) {
    const header = createCentralDirectoryHeader(entry);
    chunks.push(toBlobPart(header));
    centralDirectorySize += header.byteLength;
  }

  chunks.push(toBlobPart(createEndOfCentralDirectory(preparedEntries.length, centralDirectorySize, centralDirectoryOffset)));

  return new Blob(chunks, { type: "application/octet-stream" });
}
