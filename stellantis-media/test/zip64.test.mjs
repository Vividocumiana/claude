import { zipPlan, streamZip, __setZip64Threshold } from "../src/zip.js";
import { writeFileSync } from "node:fs"; import zlib from "node:zlib";
__setZip64Threshold(1000);
const files = { "x/big.bin": Buffer.alloc(5000, 1), "x/small.txt": Buffer.from("hi"), "x/big2.bin": Buffer.alloc(3000, 2) };
const entries = Object.entries(files).map(([k,b]) => ({ key:k, name:k.split("/").pop(), size:b.length, crc: zlib.crc32(b) }));
const plan = zipPlan(entries); const chunks=[];
await streamZip(plan, new WritableStream({write(c){chunks.push(Buffer.from(c))}}), async k => ({ size: files[k].length, body: new ReadableStream({start(c){c.enqueue(new Uint8Array(files[k]));c.close()}}) }));
const out = Buffer.concat(chunks); console.log(plan.total, out.length);
writeFileSync(process.argv[2], out);
