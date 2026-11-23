import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const three = path.dirname(require.resolve("three"));
const from = path.join(three, "..", "examples", "jsm", "libs", "draco", "gltf");
const to = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "draco");

await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
