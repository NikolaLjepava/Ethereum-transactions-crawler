// helper functions for better code organization to avoid spaghetti code
const KNOWN_TOKEN_DECIMALS: Record<string, number> = {
  // USDC
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": 6,
  // USDT
  "0xdAC17F958D2ee523a2206206994597C13D831ec7": 6,
  // DAI
  "0x6B175474E89094C44Da98b954EedeAC495271d0F": 18,
  // WETH
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": 18,
};
const tokenDecimalsCache = new Map<string, number>();

async function getTokenDecimals(contractAddress: string): Promise<number> {
  const normalizedAddress = contractAddress.toLowerCase();
  // Check cache first
  if (tokenDecimalsCache.has(normalizedAddress)) {
    return tokenDecimalsCache.get(normalizedAddress)!;
  }

  if (KNOWN_TOKEN_DECIMALS[normalizedAddress]) {
    const decimals = KNOWN_TOKEN_DECIMALS[normalizedAddress];
    tokenDecimalsCache.set(normalizedAddress, decimals);
    return decimals;
  }
  return 18; // default to 18 if unknown
}
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
export async function formatTransfers(transfers: any[]): Promise<any[]> {
  const formatted = [];

  for (const transfer of transfers) {
    formatted.push({
      fromAddress: transfer.from,
      toAddress: transfer.to || "",
      blockNum: parseInt(transfer.blockNum, 16),
      category: transfer.category,
      value: await formatValue(
        transfer.value,
        transfer.category,
        transfer.rawContract,
      ),
      asset: transfer.asset || "ETH",
      hash: transfer.hash,
      timestamp: transfer.metadata?.blockTimestamp
        ? new Date(transfer.metadata.blockTimestamp).getTime() / 1000
        : undefined,
    });
  }

  return formatted;
}
async function formatValue(
  value: string,
  category: string,
  rawContract?: any,
): Promise<string> {
  const numValue = Number(value);

  if (category === "external" || category === "internal") {
    // ETH convert from wei (10^18)
    return (numValue / 1e18).toFixed(6);
  }

  if (category === "erc20" && rawContract?.address) {
    try {
      const decimals = await getTokenDecimals(rawContract.address);
      const divisor = Math.pow(10, decimals);
      const formattedValue = numValue / divisor;
      if (formattedValue < 0.0001) {
        return formattedValue.toFixed(8);
      }
    } catch (error) {
      console.error(
        `Failed to format value for ${rawContract.address}:`,
        error,
      );
      return numValue.toString();
    }
  }

  return numValue.toString();
}
export async function makeAlchemyCall(
  params: any,
  pageKey?: string,
  maxCount?: number,
): Promise<{ transfers: any[]; pageKey?: string }> {
  const apiKey = process.env.ALCHEMY_API_KEY!;
  const baseUrl = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

  const requestBody = {
    jsonrpc: "2.0" as const,
    id: Math.floor(Math.random() * 1000),
    method: "alchemy_getAssetTransfers" as const,
    params: [
      {
        ...params,
        ...(pageKey && { pageKey }),
        ...(maxCount && { maxCount: maxCount.toString() }),
      },
    ],
  };

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    result?: {
      transfers?: any[];
      pageKey?: string;
    };
    error?: {
      message: string;
    };
  };

  if (data.error) {
    throw new Error(`Alchemy API error: ${data.error.message}`);
  }

  return {
    transfers: data.result?.transfers || [],
    pageKey: data.result?.pageKey,
  };
}

export function toHex(num: number): string {
  return "0x" + num.toString(16);
}

export async function getBlockNumberByTimestamp(
  timestamp: number,
): Promise<number> {
  const etherscanUrl = `https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=${timestamp}&closest=before`;

  const response = await fetch(etherscanUrl);
  const data = (await response.json()) as {
    status: string;
    result: string;
  };

  if (data.status !== "1") {
    throw new Error(`Etherscan error: ${data.result}`);
  }

  return parseInt(data.result);
}

export function dateToTimestamp(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00Z");
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD`);
  }
  return Math.floor(date.getTime() / 1000);
}
