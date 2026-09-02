// Replaces upstream's `test.ts`, which was a network-hitting CLI rather than a
// test suite. `getAsset` is pure once the manifest is imported, so these run
// offline; the cross-platform smoke test job covers the actual download.
import { describe, expect, it } from "@jest/globals";

import { getAsset, getSpecificVersions, type Options } from "../src/index.js";

const RELEASES = "https://github.com/llvm/llvm-project/releases/download";

function options(overrides: Partial<Options> = {}): Options {
  return {
    version: "21",
    arch: "x64",
    forceUrl: null,
    directory: null,
    cached: false,
    mirrorUrl: null,
    auth: null,
    env: false,
    ...overrides,
  };
}

describe("getSpecificVersions", () => {
  const versions = ["21.1.7", "21.1.8", "21.1.10", "20.1.8", "9.0.1", "nightly"];

  it("keeps only versions matching the requested major and sorts newest first", () => {
    expect(getSpecificVersions(versions, "21")).toEqual(["21.1.8", "21.1.7", "21.1.10"]);
  });

  it("matches an exact version", () => {
    expect(getSpecificVersions(versions, "21.1.7")).toEqual(["21.1.7"]);
  });

  it("ignores entries that are not three-part versions", () => {
    expect(getSpecificVersions(versions, "nightly")).toEqual([]);
  });

  it("returns nothing for an unknown version", () => {
    expect(getSpecificVersions(versions, "22")).toEqual([]);
  });
});

describe("getAsset", () => {
  it("resolves a major version to the newest matching release", () => {
    const asset = getAsset("linux", options({ version: "21" }));
    expect(asset.specificVersion).toBe("21.1.8");
    expect(asset.url).toBe(`${RELEASES}/llvmorg-21.1.8/LLVM-21.1.8-Linux-X64.tar.xz`);
  });

  it("resolves an exact version", () => {
    const asset = getAsset("linux", options({ version: "21.1.5" }));
    expect(asset.specificVersion).toBe("21.1.5");
    expect(asset.url).toContain("llvmorg-21.1.5");
  });

  it("honours the requested architecture", () => {
    const asset = getAsset("linux", options({ version: "21", arch: "arm64" }));
    expect(asset.url).toBe(`${RELEASES}/llvmorg-21.1.8/LLVM-21.1.8-Linux-ARM64.tar.xz`);
  });

  // Pins the regenerated manifest: upstream's fork point stops at 21.1.8.
  it("resolves the LLVM versions added after the fork point", () => {
    expect(getAsset("linux", options({ version: "22" })).specificVersion).toBe("22.1.8");
    expect(getAsset("linux", options({ version: "23" })).specificVersion).toBe("23.1.0");
    expect(getAsset("darwin", options({ version: "22", arch: "arm64" })).specificVersion).toBe("22.1.8");
    expect(getAsset("win32", options({ version: "22" })).specificVersion).toBe("22.1.8");
  });

  it("resolves Windows assets", () => {
    const asset = getAsset("win32", options({ version: "21" }));
    expect(asset.url).toBe(`${RELEASES}/llvmorg-21.1.8/LLVM-21.1.8-win64.exe`);
  });

  it("prefixes the mirror URL instead of the GitHub release URL", () => {
    const asset = getAsset("linux", options({ version: "21", mirrorUrl: "https://mirror.example/llvm" }));
    expect(asset.url).toBe("https://mirror.example/llvm/LLVM-21.1.8-Linux-X64.tar.xz");
  });

  it("short-circuits on force-url without consulting the manifest", () => {
    const asset = getAsset("linux", options({ version: "bogus", forceUrl: "https://example.com/llvm.tar.xz" }));
    expect(asset).toEqual({ specificVersion: "bogus", url: "https://example.com/llvm.tar.xz" });
  });

  it("throws for an unsupported platform", () => {
    expect(() => getAsset("aix", options())).toThrow(/Unsupported platform/);
  });

  it("throws for an unsupported architecture", () => {
    expect(() => getAsset("linux", options({ arch: "riscv64" }))).toThrow(/Unsupported platform/);
  });

  it("throws for an unsupported version", () => {
    expect(() => getAsset("linux", options({ version: "999" }))).toThrow(/Unsupported version for platform/);
  });
});
