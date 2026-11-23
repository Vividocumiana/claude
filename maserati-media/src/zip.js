// Streaming ZIP writer (STORE, no compression) for Cloudflare Workers.
// CRC-32 values are computed in the browser at upload time and stored as R2
// metadata, so the Worker only concatenates headers and file bodies: almost no
// CPU, and the exact archive size is known up-front (Content-Length).
// ZIP64 records are added automatically for files/archives over 4 GB.

const MAX32 = 0xffffffff; // ZIP 32-bit sentinel
let LIMIT = MAX32;       // sizes/offsets >= LIMIT switch to ZIP64
// Test hook: lower the ZIP64 threshold to exercise the ZIP64 code path with small files.
export function __setZip64Threshold(n) { LIMIT = n; }
const enc = new TextEncoder();

function dosDateTime(d) {
  const time = (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1);
  const date = ((Math.max(d.getUTCFullYear(), 1980) - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate();
  return { time, date };
}

class Buf {
  constructor(n) { this.b = new Uint8Array(n); this.v = new DataView(this.b.buffer); this.o = 0; }
  u16(x) { this.v.setUint16(this.o, x, true); this.o += 2; return this; }
  u32(x) { this.v.setUint32(this.o, x >>> 0, true); this.o += 4; return this; }
  u64(x) { this.v.setUint32(this.o, x % 0x100000000, true); this.v.setUint32(this.o + 4, Math.floor(x / 0x100000000), true); this.o += 8; return this; }
  bytes(a) { this.b.set(a, this.o); this.o += a.length; return this; }
}

function localHeader(e) {
  const z64 = e.size >= LIMIT;
  const extraLen = z64 ? 20 : 0;
  const b = new Buf(30 + e.nameBytes.length + extraLen);
  b.u32(0x04034b50).u16(z64 ? 45 : 20).u16(0x0800).u16(0).u16(e.dt.time).u16(e.dt.date)
    .u32(e.crc).u32(z64 ? MAX32 : e.size).u32(z64 ? MAX32 : e.size)
    .u16(e.nameBytes.length).u16(extraLen).bytes(e.nameBytes);
  if (z64) b.u16(0x0001).u16(16).u64(e.size).u64(e.size);
  return b.b;
}

function centralHeader(e) {
  const bigSize = e.size >= LIMIT, bigOff = e.offset >= LIMIT;
  const extraData = (bigSize ? 16 : 0) + (bigOff ? 8 : 0);
  const extraLen = extraData ? 4 + extraData : 0;
  const b = new Buf(46 + e.nameBytes.length + extraLen);
  b.u32(0x02014b50).u16(45).u16(bigSize || bigOff ? 45 : 20).u16(0x0800).u16(0).u16(e.dt.time).u16(e.dt.date)
    .u32(e.crc).u32(bigSize ? MAX32 : e.size).u32(bigSize ? MAX32 : e.size)
    .u16(e.nameBytes.length).u16(extraLen).u16(0).u16(0).u16(0).u32(0).u32(bigOff ? MAX32 : e.offset)
    .bytes(e.nameBytes);
  if (extraLen) {
    b.u16(0x0001).u16(extraData);
    if (bigSize) b.u64(e.size).u64(e.size);
    if (bigOff) b.u64(e.offset);
  }
  return b.b;
}

function endRecords(count, cdSize, cdOffset) {
  const z64 = count >= 0xffff || cdSize >= LIMIT || cdOffset >= LIMIT;
  const b = new Buf((z64 ? 56 + 20 : 0) + 22);
  if (z64) {
    const z64Offset = cdOffset + cdSize;
    b.u32(0x06064b50).u64(44).u16(45).u16(45).u32(0).u32(0).u64(count).u64(count).u64(cdSize).u64(cdOffset);
    b.u32(0x07064b50).u32(0).u64(z64Offset).u32(1);
  }
  b.u32(0x06054b50).u16(0).u16(0).u16(z64 ? 0xffff : count).u16(z64 ? 0xffff : count)
    .u32(z64 ? MAX32 : cdSize).u32(z64 ? MAX32 : cdOffset).u16(0);
  return b.b;
}

// entries: [{ key, name, size, crc, date }]
export function zipPlan(entries) {
  const used = new Set();
  let offset = 0;
  const list = entries.map((e) => {
    let name = e.name, i = 1;
    while (used.has(name.toLowerCase())) name = e.name.replace(/(\.[^.]*)?$/, ` (${i++})$1`);
    used.add(name.toLowerCase());
    const x = { ...e, nameBytes: enc.encode(name), dt: dosDateTime(e.date || new Date()), offset };
    x.local = localHeader(x);
    offset += x.local.length + x.size;
    return x;
  });
  const central = list.map(centralHeader);
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = endRecords(list.length, cdSize, offset);
  return { list, central, end, total: offset + cdSize + end.length };
}

export async function streamZip(plan, writable, getObject) {
  let w = writable.getWriter();
  try {
    for (const e of plan.list) {
      await w.write(e.local);
      const obj = await getObject(e.key);
      if (!obj || obj.size !== e.size) throw new Error("File changed during download: " + e.key);
      w.releaseLock();
      await obj.body.pipeTo(writable, { preventClose: true });
      w = writable.getWriter();
    }
    for (const c of plan.central) await w.write(c);
    await w.write(plan.end);
    await w.close();
  } catch (err) {
    try { await w.abort(err); } catch (_) {}
  }
}
