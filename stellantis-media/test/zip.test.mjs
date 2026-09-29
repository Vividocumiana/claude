import { zipPlan, streamZip } from "../src/zip.js";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import zlib from "node:zlib";
const files = { "a/b/photo 1.jpg": Buffer.alloc(300000, 7), "a/b/Città.pdf": Buffer.from("hello pdf"), "a/b/empty.txt": Buffer.alloc(0) };
const crc = (b) => zlib.crc32(b);
const entries = Object.entries(files).map(([k, b]) => ({ key: k, name: k.split("/").pop(), size: b.length, crc: crc(b), date: new Date("2026-10-12T10:00:00Z") }));
entries.push({ ...entries[1] }); // duplicate name -> renamed
const plan = zipPlan(entries);
const chunks = [];
const ws = new WritableStream({ write(c) { chunks.push(Buffer.from(c)); } });
await streamZip(plan, ws, async (k) => ({ size: files[k].length, body: new ReadableStream({ start(c) { if (files[k].length) c.enqueue(new Uint8Array(files[k])); c.close(); } }) }));
const out = Buffer.concat(chunks);
console.log("planned", plan.total, "actual", out.length);
const path = process.argv[2] || join(tmpdir(), "t.zip");
writeFileSync(path, out);
console.log("written", path, "- check with: unzip -t", path);
