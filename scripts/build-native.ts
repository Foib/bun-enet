import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const zigPath = process.env.ZIG_PATH ?? "C:\\Program Files\\Zig\\zig.exe";
const root = import.meta.dir;
const projectRoot = join(root, "..");
const outputDir = join(projectRoot, "dist");
const outputName = process.platform === "win32" ? "enet-wrapper.dll" : "libenet-wrapper.so";
const outputPath = join(outputDir, outputName);

const nativeSources = [
  "native/enet_wrapper.c",
  "enet-1.3.18/callbacks.c",
  "enet-1.3.18/compress.c",
  "enet-1.3.18/host.c",
  "enet-1.3.18/list.c",
  "enet-1.3.18/packet.c",
  "enet-1.3.18/peer.c",
  "enet-1.3.18/protocol.c",
  process.platform === "win32" ? "enet-1.3.18/win32.c" : "enet-1.3.18/unix.c",
];

if (!existsSync(zigPath)) {
  throw new Error(`Zig executable not found at ${zigPath}`);
}

await mkdir(outputDir, { recursive: true });

const flags = [
  zigPath,
  "cc",
  "-shared",
  "-O2",
  "-I",
  join(projectRoot, "enet-1.3.18", "include"),
  "-o",
  outputPath,
  ...nativeSources.map((source) => join(projectRoot, source)),
];

if (process.platform === "win32") {
  flags.push("-lws2_32", "-lwinmm");
}

const processResult = Bun.spawnSync(flags, {
  cwd: projectRoot,
  stdout: "inherit",
  stderr: "inherit",
});

if (processResult.exitCode !== 0) {
  throw new Error(`Native build failed with exit code ${processResult.exitCode}`);
}

console.log(`Built ${outputPath}`);
