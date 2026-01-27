export async function isValidAddress(address: string): Promise<boolean> {
  // Simple regex to check if the address is a valid Ethereum address
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethAddressRegex.test(address);
}
export async function fetchTransfers(address: string, startBlock: number): Promise<any> {
  // Implementation for fetching transfers
}
export async function formatTransfers(transfers: any[]): Promise<any[]> {
  // Implementation for formatting transfers
  return transfers;
}
export async function makeAlchemyCall(params: any): Promise<any> {
  const apiKey = process.env.ALCHEMY_API_KEY!;
  const baseUrl = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;
    
    const requestBody = {
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000), // Random ID
      method: "alchemy_getAssetTransfers",
      params: [params]  // Note: params is INSIDE an array!
    };
    
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.statusText}`);
    }
    
    return response.json();
  }

export function toHex(num: number): string {
  return '0x' + num.toString(16);
}