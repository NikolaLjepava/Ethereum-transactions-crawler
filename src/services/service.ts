import { isValidAddress, makeAlchemyCall, toHex, formatTransfers} from '../helpers/helpers';

export interface IBlockchainService {
  getWalletHistory(address: string, startBlock: number): Promise<ITransfer[]>;
  getWalletHistoryPaginated(address: string, startBlock: number, limit: number, offset: number): 
    Promise<{ transfers: ITransfer[], hasMore: boolean, total?: number }>;
  getEthereumBalanceForDate(address: string, date: string): Promise<string>;
  getBalanceAndTokensForDate(address: string, tokenContract: string, date: string): Promise<string>;
}
export interface ITransfer {
  fromAddress: string;
  toAddress: string;
  blockNum: number;
  category: string;
  value: string;
  asset: string;
  hash: string;
}

export class BlockchainService implements IBlockchainService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.ALCHEMY_API_KEY!;
    if (!this.apiKey) {
      throw new Error('ALCHEMY_API_KEY not set in environment');
    }
  }
  async getWalletHistory(address: string, startBlock: number, maxTransfers: number = 20000): Promise<ITransfer[]> {
  if (!isValidAddress(address)) {
    throw new Error("Invalid Ethereum address");
  }
  
  const fetchAllTransfers = async (params: any): Promise<any[]> => {
    let allTransfers: any[] = [];
    let currentPageKey: string | undefined = undefined;
    let fetchCount = 0;
    const MAX_FETCHES = 20;
    
    do {
      const result = await makeAlchemyCall(params, currentPageKey);
      allTransfers.push(...result.transfers);
      currentPageKey = result.pageKey;
      fetchCount++;
      
      // don't fetch forever
      if (fetchCount >= MAX_FETCHES) {
        console.warn(`Reached max fetches (${MAX_FETCHES}) for wallet ${address}`);
        break;
      }
       if (allTransfers.length >= maxTransfers) {
    console.warn(`Reached max transfers limit (${maxTransfers})`);
    break;
  }
      
      // delay between pages to prevent API stress
      if (currentPageKey) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } while (currentPageKey);
    
    console.log(`Fetched ${allTransfers.length} transfers (${fetchCount} pages)`);
    return allTransfers;
  };
  
  const outgoingParams = {
    fromBlock: toHex(startBlock),
    fromAddress: address,
    category: ["external", "internal", "erc20", "erc721", "erc1155"],
    withMetadata: true,
    excludeZeroValue: false
  };
  
  const incomingParams = {
    fromBlock: toHex(startBlock),
    toAddress: address,
    category: ["external", "internal", "erc20", "erc721", "erc1155"],
    withMetadata: true,
    excludeZeroValue: false
  };
  
  // fetch all pages for both directions
  const [outgoingTransfers, incomingTransfers] = await Promise.all([
    fetchAllTransfers(outgoingParams),
    fetchAllTransfers(incomingParams)
  ]);
  
  // combine and sort
  const allTransfers = [...outgoingTransfers, ...incomingTransfers];
  allTransfers.sort((a, b) => parseInt(a.blockNum, 16) - parseInt(b.blockNum, 16));
  // format transfers
  const formattedTransfers = await formatTransfers(allTransfers);
  return formattedTransfers;
}

async getWalletHistoryPaginated(
  address: string, 
  startBlock: number,
  limit: number,
  offset: number
): Promise<{ transfers: ITransfer[], hasMore: boolean, total?: number }> {
  
  const allTransfers = await this.getWalletHistory(address, startBlock);
  
  const total = allTransfers.length;
  const startIdx = Math.min(offset, total);
  const endIdx = Math.min(offset + limit, total);
  const pageTransfers = allTransfers.slice(startIdx, endIdx);
  
  return {
    transfers: pageTransfers,
    hasMore: endIdx < total,
    total
  };
}


getEthereumBalanceForDate(address: string, date: string): Promise<string> {
    return Promise.resolve("0");
  }
getBalanceAndTokensForDate(address: string, tokenContract: string, date: string): Promise<string> {
    return Promise.resolve("0");
  }
}