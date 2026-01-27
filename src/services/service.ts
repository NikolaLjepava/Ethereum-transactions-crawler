import { isValidAddress, makeAlchemyCall, toHex, formatTransfers, fetchTransfers} from '../helpers/helpers.js';

export interface IBlockchainService {
  getWalletHistory(address: string, startBlock: number): Promise<ITransfer[]>;
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
  async getWalletHistory(address: string, startBlock: number): Promise<ITransfer[]> {
    if (!isValidAddress(address)) {
      throw new Error("Invalid Ethereum address");
    }
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
    const [outgoingResult, incomingResult] = await Promise.all([
      makeAlchemyCall(outgoingParams),
      makeAlchemyCall(incomingParams)
    ]);
    if (outgoingResult.error) throw new Error(outgoingResult.error.message);
    if (incomingResult.error) throw new Error(incomingResult.error.message);
    const allTransfers = [
      ...(outgoingResult.result?.transfers || []),
      ...(incomingResult.result?.transfers || [])
    ];
    const formattedTransfers = formatTransfers(allTransfers);
    return formattedTransfers;

  }
   


  getEthereumBalanceForDate(address: string, date: string): Promise<string> {
    return Promise.resolve("0");
  }
  getBalanceAndTokensForDate(address: string, tokenContract: string, date: string): Promise<string> {
    return Promise.resolve("0");
  }
}