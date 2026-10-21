import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageName = "@singularity-sequence/web-sdk";
const installedPackagePath = path.join(projectRoot, "node_modules", "@singularity-sequence", "web-sdk");
const productManifest = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const dependency = productManifest.dependencies?.[packageName];

if (typeof dependency !== "string" || !dependency.startsWith("file:")) {
  throw new Error(`${packageName} must remain a local file dependency.`);
}

const linkedSource = path.resolve(projectRoot, dependency.slice("file:".length));
const sourceOverride = process.env.QIMEN_WEB_SDK_SOURCE?.trim();
const linkedTarget = await realpath(installedPackagePath).catch(() => "");
const expectedTarget = await realpath(linkedSource).catch(() => "");
const installedLinkInfo = await lstat(installedPackagePath);
if ((!linkedTarget || !expectedTarget) && !sourceOverride) {
  throw new Error(`The installed ${packageName} link does not match ${dependency}.`);
}

const hashPlainPackage = async (directory) => {
  const rootInfo = await lstat(directory);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error(`Expected a plain SDK package directory: ${directory}`);
  }

  const hash = createHash("sha256");
  const visit = async (currentPath, relativePath = "") => {
    const entries = await readdir(currentPath, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (!relativePath && ["dist", "node_modules"].includes(entry.name)) continue;
      const entryPath = path.join(currentPath, entry.name);
      const entryRelativePath = path.posix.join(relativePath, entry.name);
      const info = await lstat(entryPath);
      if (info.isSymbolicLink()) throw new Error(`SDK package contains a link: ${entryPath}`);
      hash.update(`${entryRelativePath}\0`);
      if (info.isDirectory()) {
        hash.update("directory\0");
        await visit(entryPath, entryRelativePath);
      } else if (info.isFile()) {
        hash.update("file\0");
        hash.update(await readFile(entryPath));
      } else {
        throw new Error(`SDK package contains an unsupported filesystem entry: ${entryPath}`);
      }
    }
  };

  await visit(directory);
  return hash.digest("hex");
};

if (installedLinkInfo.isSymbolicLink()) {
  if (!sourceOverride && linkedTarget !== expectedTarget) {
    throw new Error(`The installed ${packageName} link does not match ${dependency}.`);
  }
} else if (installedLinkInfo.isDirectory()) {
  if (sourceOverride && (!linkedTarget || !expectedTarget)) {
    throw new Error(`An SDK source override requires a resolvable installed ${packageName} package.`);
  }
  const [installedHash, sourceHash] = await Promise.all([
    hashPlainPackage(installedPackagePath),
    hashPlainPackage(linkedSource),
  ]);
  if (installedHash !== sourceHash) {
    throw new Error(`The installed ${packageName} copy does not match ${dependency}.`);
  }
} else {
  throw new Error(`The installed ${packageName} is neither a link nor a plain package directory.`);
}

const sourcePath = path.resolve(sourceOverride ?? (installedLinkInfo.isSymbolicLink() ? linkedTarget : expectedTarget));
const sourceInfo = await lstat(sourcePath);
if (!sourceInfo.isDirectory() || sourceInfo.isSymbolicLink()) {
  throw new Error(`The SDK source must be a plain directory: ${sourcePath}`);
}

const sourceManifest = JSON.parse(await readFile(path.join(sourcePath, "package.json"), "utf8"));
if (sourceManifest.name !== packageName || sourceManifest.version !== "0.3.1") {
  throw new Error(`Unexpected linked SDK identity/version: ${sourceManifest.name}@${sourceManifest.version}.`);
}

const compilerPath = path.join(projectRoot, "node_modules", "typescript", "bin", "tsc");
const nextPath = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const sdkWorkspace = await mkdtemp(path.join(os.tmpdir(), "qimen-web-sdk-build-"));
const qimenBuildRoot = await mkdtemp(path.join(projectRoot, ".qimen-web-sdk-build-"));
const stagedPackage = path.join(sdkWorkspace, "packages", "web-sdk");
const buildPackage = path.join(qimenBuildRoot, "web-sdk");
const workspaceConfig = path.resolve(sourcePath, "..", "..", "tsconfig.base.json");

const assertPlainDirectory = async (directory) => {
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`Expected a plain directory: ${directory}`);
  }
};

const run = (script, args, env = process.env) => {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
    env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Command failed (${result.status ?? result.signal}): ${script}`);
};

const removePlainDirectory = async (directory) => {
  const info = await lstat(directory).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!info) return;
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`Refusing to remove a non-plain temporary directory: ${directory}`);
  }
  await rm(directory, { recursive: true, force: true });
};

try {
  await assertPlainDirectory(sdkWorkspace);
  await assertPlainDirectory(qimenBuildRoot);
  const workspaceConfigInfo = await lstat(workspaceConfig);
  if (!workspaceConfigInfo.isFile() || workspaceConfigInfo.isSymbolicLink()) {
    throw new Error(`Expected a plain SDK workspace config file: ${workspaceConfig}`);
  }
  await mkdir(path.dirname(stagedPackage), { recursive: true });
  await cp(sourcePath, stagedPackage, {
    recursive: true,
    filter: (source) => !["dist", "node_modules"].includes(path.basename(source)),
  });
  await cp(workspaceConfig, path.join(sdkWorkspace, "tsconfig.base.json"));
  await assertPlainDirectory(stagedPackage);

  run(compilerPath, ["-p", path.join(stagedPackage, "tsconfig.json")]);
  const builtEntry = path.join(stagedPackage, "dist", "index.js");
  const builtTypes = path.join(stagedPackage, "dist", "index.d.ts");
  await Promise.all([readFile(builtEntry), readFile(builtTypes)]);

  await cp(stagedPackage, buildPackage, { recursive: true });
  await assertPlainDirectory(buildPackage);

  const temporaryTsconfig = path.join(qimenBuildRoot, "tsconfig.json");
  const relativeBuildPackage = path.relative(projectRoot, buildPackage).split(path.sep).join("/");
  const relativeTemporaryTsconfig = path.relative(projectRoot, temporaryTsconfig).split(path.sep).join("/");
  await writeFile(temporaryTsconfig, `${JSON.stringify({
    extends: "../tsconfig.json",
    compilerOptions: {
      baseUrl: projectRoot,
      paths: {
        "@/*": ["src/*"],
        [packageName]: [`${relativeBuildPackage}/dist/index.d.ts`],
      },
    },
  }, null, 2)}\n`);

  run(nextPath, ["build", "--webpack"], {
    ...process.env,
    QIMEN_WEB_SDK_BUILD_PACKAGE: buildPackage,
    QIMEN_WEB_SDK_TSCONFIG_PATH: relativeTemporaryTsconfig,
  });
} finally {
  await Promise.all([
    removePlainDirectory(sdkWorkspace),
    removePlainDirectory(qimenBuildRoot),
  ]);
}
