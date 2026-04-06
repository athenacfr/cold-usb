import { describe, test, expect } from "bun:test";
import { parsePSBT, getTransactionDetails } from "./psbt";

describe("parsePSBT", () => {
  test("rejects invalid base64", () => {
    expect(() => parsePSBT("not-valid-psbt", "base64", {} as any)).toThrow();
  });

  test("rejects invalid hex", () => {
    expect(() => parsePSBT("xyz", "hex", {} as any)).toThrow();
  });

  test("rejects unsupported format", () => {
    expect(() => parsePSBT("data", "json", {} as any)).toThrow("Unsupported format");
  });
});

describe("getTransactionDetails", () => {
  test("rejects invalid data", () => {
    expect(() => getTransactionDetails("not-valid", "base64")).toThrow();
  });
});
