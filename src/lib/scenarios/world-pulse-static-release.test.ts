import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicRoot = resolve(process.cwd(), "public", "gods-eye-view");

function filesBelow(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

describe("world pulse static release", () => {
  it("references assets that exist in the release", () => {
    const html = readFileSync(join(publicRoot, "index.html"), "utf8");
    const moduleSrc = html.match(/<script type="module"[^>]+src="([^"]+)"/)?.[1];
    expect(moduleSrc).toBeTruthy();
    expect(existsSync(resolve(process.cwd(), "public", moduleSrc!.replace(/^\//, "")))).toBe(true);
    expect(html).toContain("/gods-eye-view/battle-observation-bridge.js");
  });

  it("does not distribute the noncommercial TeleGeography dataset or layer", () => {
    const files = filesBelow(publicRoot);
    expect(files.some((path) => /(?:cable-geo|landing-point-geo)/i.test(path))).toBe(false);
    const html = readFileSync(join(publicRoot, "index.html"), "utf8");
    const moduleSrc = html.match(/<script type="module"[^>]+src="([^"]+)"/)?.[1];
    const bundle = readFileSync(resolve(process.cwd(), "public", moduleSrc!.replace(/^\//, "")), "utf8");
    expect(bundle).not.toMatch(/telegeography-submarine-cables|submarinecablemap\.com|TeleGeography/);
  });
});
