import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  isValidAddress,
  toHex,
  formatTransfers,
  dateToTimestamp,
  getBlockNumberByTimestamp,
} from "../src/helpers/helpers";

// Declare the mock globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Helpers", () => {
  describe("isValidAddress", () => {
    it("should return true for valid address", () => {
      const valid = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
      const result = isValidAddress(valid);
      expect(result).toBe(true);
    });

    it("should return false for invalid address", () => {
      expect(isValidAddress("not-an-address")).toBe(false);
      expect(isValidAddress("0x123")).toBe(false);
      expect(isValidAddress("")).toBe(false);
    });
  });

  describe("formatTransfers", () => {
    it("should format ETH transfer correctly", async () => {
      const raw = {
        from: "0x123",
        to: "0x456",
        blockNum: "0xF42400",
        category: "external",
        value: "1500000000000000000",
        asset: "ETH",
        hash: "0xabc",
        metadata: { blockTimestamp: "2023-01-01T00:00:00Z" },
      };

      const result = await formatTransfers([raw]);
      expect(result[0].fromAddress).toBe("0x123");
      expect(result[0].value).toBe("1.500000");
    });

    it("should handle token transfer", async () => {
      const raw = {
        from: "0x123",
        to: "0x456",
        blockNum: "0xF42401",
        category: "erc20",
        value: "1000000",
        asset: "USDC",
        hash: "0xdef",
        rawContract: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" }, // USDC contract
      };

      const result = await formatTransfers([raw]);
      expect(result[0].value).toBe("1.0000");
    });
  });

  describe("dateToTimestamp", () => {
    it("should convert valid date string to timestamp", () => {
      // 2023-01-01 00:00:00 UTC
      const timestamp = dateToTimestamp("2023-01-01");
      expect(timestamp).toBe(1672531200);
    });

    it("should throw error for invalid date format", () => {
      expect(() => dateToTimestamp("not-a-date")).toThrow(
        "Invalid date format",
      );
      expect(() => dateToTimestamp("2023/01/01")).toThrow(
        "Invalid date format",
      );
      expect(() => dateToTimestamp("")).toThrow("Invalid date format");
    });

    it("should handle different dates correctly", () => {
      expect(dateToTimestamp("2020-01-01")).toBe(1577836800);
      expect(dateToTimestamp("2024-02-29")).toBe(1709164800); // Leap year
    });
  });

  describe("getBlockNumberByTimestamp", () => {
    beforeEach(() => {
      mockFetch.mockClear();
    });

    it("should fetch block number from Etherscan", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          status: "1",
          result: "16000000",
          message: "OK",
        }),
      });

      const blockNumber = await getBlockNumberByTimestamp(1672531200);
      expect(blockNumber).toBe(16000000);
    });

    it("should throw error on Etherscan API failure", async () => {
      mockFetch.mockResolvedValue({
        json: async () => ({
          status: "0",
          result: "Error!",
          message: "Invalid timestamp",
        }),
      });

      await expect(getBlockNumberByTimestamp(9999999999)).rejects.toThrow(
        "Etherscan error: Error!",
      );
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(getBlockNumberByTimestamp(1672531200)).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("toHex", () => {
    it("should convert decimal to hex", () => {
      expect(toHex(0)).toBe("0x0");
      expect(toHex(16)).toBe("0x10");
      expect(toHex(16000000)).toBe("0xf42400");
    });
  });
});
