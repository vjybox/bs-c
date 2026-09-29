import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./ids";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("newId", () => {
  it("returns a v4 UUID", () => {
    expect(newId()).toMatch(V4);
  });

  it("still works where crypto.randomUUID is missing (plain-HTTP LAN address)", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: real.getRandomValues.bind(real) });
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect([...ids].every((id) => V4.test(id))).toBe(true);
    expect(ids.size).toBe(200);
  });
});
