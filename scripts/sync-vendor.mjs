/**
 * Copy three.js + three-vrm into /vendor for static serving (ESM imports).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nm = path.join(root, "node_modules");
const vendor = path.join(root, "vendor");

function cp(src, dest) {
  if (!fs.existsSync(src)) throw new Error(`Missing ${src}`);
  fs.cpSync(src, dest, { recursive: true });
}

fs.mkdirSync(vendor, { recursive: true });
cp(path.join(nm, "three"), path.join(vendor, "three"));
fs.mkdirSync(path.join(vendor, "@pixiv"), { recursive: true });
cp(path.join(nm, "@pixiv/three-vrm"), path.join(vendor, "@pixiv/three-vrm"));
console.log("vendor synced");
