// helper functions for Ethereum transaction crawler for better code organization
const KNOWN_TOKEN_DECIMALS: Record<string, number> = {
  // USDC
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 6,
  // USDT
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': 6,
  // DAI
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': 18,
  // WETH
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 18,
};
const tokenDecimalsCache = new Map<string, number>();
async function getTokenDecimals(contractAddress: string): Promise<number> {
  // Check cache first
  if (tokenDecimalsCache.has(contractAddress)) {
    return tokenDecimalsCache.get(contractAddress)!;
  }
  
  // Check known tokens
  if (KNOWN_TOKEN_DECIMALS[contractAddress]) {
    const decimals = KNOWN_TOKEN_DECIMALS[contractAddress];
    tokenDecimalsCache.set(contractAddress, decimals);
    return decimals;
  }
  
  return 18;
}
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
export async function formatTransfers(transfers: any[]): Promise<any[]> {
  const formatted = [];
  
  for (const transfer of transfers) {
    formatted.push({
      fromAddress: transfer.from,
      toAddress: transfer.to || '',
      blockNum: parseInt(transfer.blockNum, 16),
      category: transfer.category,
      value: await formatValue(
        transfer.value, 
        transfer.category, 
        transfer.asset,
        transfer.rawContract
      ),
      asset: transfer.asset || 'ETH',
      hash: transfer.hash,
      timestamp: transfer.metadata?.blockTimestamp 
        ? new Date(transfer.metadata.blockTimestamp).getTime() / 1000
        : undefined
    });
  }
  
  return formatted;
}
async function formatValue(
  value: string, 
  category: string, 
  asset: string,
  rawContract?: any
): Promise<string> {
  const numValue = parseFloat(value);
  
  if (category === 'external' || category === 'internal') {
    // ETH convert from wei (10^18)
    return (numValue / 1e18).toFixed(6);
  }
  
  if (category === 'erc20' && rawContract?.address) {
    try {
      const decimals = await getTokenDecimals(rawContract.address);
      const formatted = (numValue / Math.pow(10, decimals)).toFixed(4);
      return formatted;
    } catch (error) {
      console.error(`Failed to get decimals for ${rawContract.address}:`, error);
      return numValue.toString();
    }
  }
  
  return numValue.toString();
}
export async function makeAlchemyCall(
  params: any, 
  pageKey?: string,
  maxCount?: number
): Promise<{ transfers: any[], pageKey?: string }> {
  const apiKey = process.env.ALCHEMY_API_KEY!;
  const baseUrl = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
  
  const requestBody = {
    jsonrpc: "2.0" as const,
    id: Math.floor(Math.random() * 1000),
    method: "alchemy_getAssetTransfers" as const,
    params: [{
      ...params,
      ...(pageKey && { pageKey }),
      ...(maxCount && { maxCount: maxCount.toString() })
    }]
  };
  
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error(`Alchemy API error: ${response.statusText}`);
  }
  
  const data = await response.json() as {
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
    pageKey: data.result?.pageKey
  };
}

export function toHex(num: number): string {
  return '0x' + num.toString(16);
}