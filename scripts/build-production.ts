import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

type PackageJson = {
  name: string;
  version: string;
  type?: string;
  description?: string;
  license?: string;
  repository?: unknown;
  keywords?: string[];
  peerDependencies?: Record<string, string>;
};

const root = join(import.meta.dir, "..");
const distDir = join(root, "dist");
const bunExecutable = process.execPath;

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

run([bunExecutable, "run", "./scripts/build-native.ts"]);

Bun.build({
  entrypoints: ["./index.ts"],
  target: "bun",
  format: "esm",
  outdir: "./dist",
  sourcemap: "linked",
});

run([bunExecutable, "x", "tsc", "-p", "./tsconfig.build.json"]);

const packageJson = JSON.parse(
  await readFile(join(root, "package.json"), "utf8"),
) as PackageJson;

const distPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  type: packageJson.type ?? "module",
  description: packageJson.description,
  license: packageJson.license,
  repository: packageJson.repository,
  keywords: packageJson.keywords,
  main: "./index.js",
  module: "./index.js",
  types: "./index.d.ts",
  exports: {
    ".": {
      types: "./index.d.ts",
      import: "./index.js",
      default: "./index.js",
    },
  },
  peerDependencies: packageJson.peerDependencies,
};

await writeFile(
  join(distDir, "package.json"),
  `${JSON.stringify(distPackageJson, null, 2)}\n`,
  "utf8",
);
await copyFile(join(root, "README.md"), join(distDir, "README.md"));
await copyFile(join(root, "LICENSE"), join(distDir, "LICENSE"));
await copyFile(
  join(root, "THIRD_PARTY_LICENSES"),
  join(distDir, "THIRD_PARTY_LICENSES"),
);
await writeFile(join(distDir, ".npmignore"), "*.lib\n*.pdb\n", "utf8");

console.log(`Production build written to ${distDir}`);

function run(command: string[]) {
  const result = Bun.spawnSync(command, {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `Command failed with exit code ${result.exitCode}: ${command.join(" ")}`,
    );
  }
}
