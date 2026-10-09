#!/usr/bin/env node
// 知几 deploy SDK / CLI — one-command, rollback-safe releases.
//
//   node ops/deploy/cli.mjs <command>
//
// Commands:
//   doctor     check host prerequisites
//   build      build the image without switching traffic (prebuild)
//   deploy     build -> switch -> health gate -> auto-rollback (default)
//   status     show the running release, image and health
//   rollback   switch back to the previous image
//   logs       tail the container logs
//   help       this text
//
// Zero dependencies: it must run on the production host with only Node and
// Docker present. The heavy lifting lives in ops/deploy/release.sh; this file
// is the stable, documented interface around it.
//
// Configuration is env-overridable so the same SDK works on any host:
//   QMDJ_ENV_FILE    runtime env file        (default /srv/qmdj/.env.local)
//   QMDJ_PROJECT     compose project         (default qmdj)
//   QMDJ_CONTAINER   container name          (default qmdj)
//   QMDJ_IMAGE_NAME  image repository        (default qmdj)
//   QMDJ_VOLUME_DIR  persistent build dir    (default <releases>/qmdj-build)
//   QMDJ_SDK_SRC     web-sdk package path    (default <releases>/…/web-sdk)
//   QMDJ_NODE_BIN    node bin for builds     (default nvm v24.16.0)
//   QMDJ_HEALTH_URL  health endpoint         (default http://127.0.0.1:3002/api/version)
//   QMDJ_NO_SUDO=1   never prefix docker with sudo

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const RELEASES_DIR = dirname(ROOT);

const config = {
  composeFile: resolve(ROOT, "docker-compose.qmdj.yml"),
  releaseScript: resolve(HERE, "release.sh"),
  envFile: process.env.QMDJ_ENV_FILE ?? "/srv/qmdj/.env.local",
  project: process.env.QMDJ_PROJECT ?? "qmdj",
  container: process.env.QMDJ_CONTAINER ?? "qmdj",
  imageName: process.env.QMDJ_IMAGE_NAME ?? "qmdj",
  healthUrl: process.env.QMDJ_HEALTH_URL ?? "http://127.0.0.1:3002/api/version",
  nodeBin: process.env.QMDJ_NODE_BIN ?? "/home/ubuntu/.nvm/versions/node/v24.16.0/bin",
  buildDir: process.env.QMDJ_VOLUME_DIR ?? resolve(RELEASES_DIR, "qmdj-build"),
  sdkSrc: process.env.QMDJ_SDK_SRC ?? resolve(RELEASES_DIR, "singularity-sequence-consumer-platform/packages/web-sdk"),
};

const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
// `-n` keeps sudo non-interactive: without a passwordless rule it must fail fast
// instead of blocking a deploy on a prompt that no one can answer.
const SUDO = process.env.QMDJ_NO_SUDO === "1" || isRoot ? [] : ["sudo", "-n"];

/** Run a command, inheriting stdio. Returns the exit status. */
const run = (cmd, args, { allowFail = false } = {}) => {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0 && !allowFail) process.exit(result.status ?? 1);
  return result.status ?? 1;
};

/** Run a command, capturing trimmed stdout (empty string on failure). */
const capture = (cmd, args) => {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
};

/** Docker, with sudo when the caller cannot reach the socket. */
const docker = (args) => run(SUDO[0] ?? "docker", SUDO.length ? ["docker", ...args] : args);
const dockerCapture = (args) => capture(SUDO[0] ?? "docker", SUDO.length ? ["docker", ...args] : args);

const gitShort = () => capture("git", ["-C", ROOT, "rev-parse", "--short", "HEAD"]) || "unknown";
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
};
const argValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
/**
 * Release id. Prefer an explicit `--release`/`RELEASE_ID`, then the checkout's
 * git hash, then the release directory name (a tarball deploy has no `.git`).
 * Without the directory fallback a tarball release would be tagged `unknown`,
 * and the health gate could not tell two releases apart.
 */
const releaseId = () => {
  const explicit = argValue("--release") ?? process.env.RELEASE_ID;
  if (explicit) return explicit;
  const dirName = ROOT.split(/[\\/]/).filter(Boolean).pop() ?? "";
  if (/^\d{8}-/.test(dirName)) return dirName;
  return `${today()}-${gitShort()}`;
};

const releaseScript = (id, extraEnv = {}) => {
  const env = {
    ...process.env,
    RELEASE_ID: id,
    QMDJ_RELEASE_COMMIT: process.env.QMDJ_RELEASE_COMMIT ?? (id.match(/^\d{8}-(.+)$/)?.[1] ?? gitShort()),
    QMDJ_ENV_FILE: config.envFile,
    QMDJ_NODE_BIN: config.nodeBin,
    QMDJ_BUILD_DIR: config.buildDir,
    QMDJ_SDK_SRC: config.sdkSrc,
    QMDJ_HEALTH_URL: config.healthUrl,
    ...extraEnv,
  };
  const pairs = Object.entries(env)
    .filter(([, value]) => typeof value === "string")
    .map(([key, value]) => `${key}=${value}`);
  const [cmd, args] = SUDO.length
    ? [SUDO[0], [...SUDO.slice(1), "env", ...pairs, "bash", config.releaseScript]]
    : ["env", [...pairs, "bash", config.releaseScript]];
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  process.exit(result.status ?? 1);
};

const commands = {
  help() {
    console.log(`知几 deploy SDK

  node ops/deploy/cli.mjs <command>

  doctor     check host prerequisites (docker, rsync, node, disk, env, sdk)
  build      build the image without switching traffic (prebuild)
  deploy     build -> switch -> health gate -> auto-rollback   (default)
  status     show the running release, image and health
  rollback   switch back to the previous image
  logs       tail the container logs
  help       this text

Config (env overridable):
  QMDJ_ENV_FILE=${config.envFile}
  QMDJ_PROJECT=${config.project}   QMDJ_CONTAINER=${config.container}
  QMDJ_HEALTH_URL=${config.healthUrl}
  QMDJ_VOLUME_DIR=${config.buildDir}`);
  },

  doctor() {
    const checks = [];
    const ok = (name, pass, detail = "") => checks.push({ name, pass, detail });

    ok("repo root", existsSync(resolve(ROOT, "package.json")), ROOT);
    ok("node", capture("node", ["-v"]).length > 0 || existsSync(resolve(config.nodeBin, "node")), config.nodeBin);
    ok("docker", dockerCapture(["version", "--format", "{{.Server.Version}}"]).length > 0);
    ok("rsync", capture("rsync", ["--version"]).length > 0);
    ok("compose file", existsSync(config.composeFile), config.composeFile);
    ok("release script", existsSync(config.releaseScript), config.releaseScript);
    ok("env file", existsSync(config.envFile), config.envFile);
    ok("web-sdk package", existsSync(config.sdkSrc), config.sdkSrc);

    const dfLine = capture("df", ["-Pk", ROOT]).split("\n")[1] ?? "";
    const freeGb = Number(dfLine.split(/\s+/)[3] ?? "0") / 1024 / 1024;
    ok("disk free >= 2GB", freeGb >= 2, `${freeGb.toFixed(1)}GB`);

    const inProgress = capture("pgrep", ["-af", "ops/deploy/release.sh"]).length > 0;
    ok("no release in progress", !inProgress);

    let failed = 0;
    for (const check of checks) {
      console.log(`${check.pass ? "  ok  " : " FAIL "} ${check.name}${check.detail ? `  (${check.detail})` : ""}`);
      if (!check.pass) failed += 1;
    }
    console.log(failed === 0 ? "\nDOCTOR=ok" : `\nDOCTOR=failed (${failed})`);
    process.exit(failed === 0 ? 0 : 1);
  },

  build() {
    releaseScript(releaseId(), { QMDJ_BUILD_ONLY: "true" });
  },

  deploy() {
    releaseScript(releaseId());
  },

  status() {
    console.log(`container   ${config.container}`);
    console.log(`image       ${dockerCapture(["inspect", "-f", "{{.Config.Image}}", config.container]) || "(not running)"}`);
    console.log(`state       ${dockerCapture(["inspect", "-f", "{{.State.Status}} (health: {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}})", config.container]) || "(unknown)"}`);
    console.log(`health      ${capture("curl", ["-fsS", "-m", "5", config.healthUrl]) || "(unreachable)"}`);
    const manifest = resolve(ROOT, "release-manifest.json");
    if (existsSync(manifest)) console.log(`manifest    ${readFileSync(manifest, "utf8").replace(/\s+/g, " ")}`);
    console.log(`git         ${gitShort()}`);
  },

  rollback() {
    const manifestPath = resolve(ROOT, "release-manifest.json");
    if (!existsSync(manifestPath)) {
      console.error("no release-manifest.json in this checkout; cannot resolve the previous image");
      process.exit(1);
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const previous = manifest.previous_image;
    if (!previous) {
      console.error("manifest has no previous_image; nothing to roll back to");
      process.exit(1);
    }
    console.log(`rolling back ${config.container} to ${previous}`);
    process.env.QMDJ_IMAGE = previous;
    process.env.QMDJ_RELEASE_ID = manifest.release_id ?? "rollback";
    docker(["compose", "-p", config.project, "-f", config.composeFile, "up", "-d"]);
  },

  logs() {
    const rest = process.argv.slice(3);
    docker(["logs", "--tail", "200", ...rest, config.container]);
  },
};

const command = (process.argv[2] ?? "help").toLowerCase();
(commands[command] ?? commands.help)();
