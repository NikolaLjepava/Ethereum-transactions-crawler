import {
  isValidAddress,
  makeAlchemyCall,
  toHex,
  formatTransfers,
  dateToTimestamp,
  getBlockNumberByTimestamp,
} from "../helpers/helpers";

export interface IBlockchainService {
  getWalletHistory(address: string, startBlock: number): Promise<ITransfer[]>;
  getWalletHistoryPaginated(
    address: string,
    startBlock: number,
    limit: number,
    offset: number,
  ): Promise<{ transfers: ITransfer[]; hasMore: boolean; total?: number }>;
  getEthereumBalanceForDate(address: string, date: string): Promise<string>;
  getBalanceAndTokensForDate(
    address: string,
    tokenContract: string,
    date: string,
  ): Promise<string>; //not implemented
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
      throw new Error("ALCHEMY_API_KEY not set in environment");
    }
  }
  async getWalletHistory(
    address: string,
    startBlock: number,
    maxTransfers: number = 20000,
  ): Promise<ITransfer[]> {
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
          console.warn(
            `Reached max fetches (${MAX_FETCHES}) for wallet ${address}`,
          );
          break;
        }
        if (allTransfers.length >= maxTransfers) {
          console.warn(`Reached max transfers limit (${maxTransfers})`);
          break;
        }

        // delay between pages to prevent API stress
        if (currentPageKey) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } while (currentPageKey);

      console.log(
        `Fetched ${allTransfers.length} transfers (${fetchCount} pages)`,
      );
      return allTransfers;
    };

    const outgoingParams = {
      fromBlock: toHex(startBlock),
      fromAddress: address,
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      withMetadata: true,
      excludeZeroValue: false,
    };

    const incomingParams = {
      fromBlock: toHex(startBlock),
      toAddress: address,
      category: ["external", "internal", "erc20", "erc721", "erc1155"],
      withMetadata: true,
      excludeZeroValue: false,
    };

    // fetch all pages for both directions
    const [outgoingTransfers, incomingTransfers] = await Promise.all([
      fetchAllTransfers(outgoingParams),
      fetchAllTransfers(incomingParams),
    ]);

    // combine and sort
    const allTransfers = [...outgoingTransfers, ...incomingTransfers];
    allTransfers.sort(
      (a, b) => parseInt(a.blockNum, 16) - parseInt(b.blockNum, 16),
    );
    // format transfers
    const formattedTransfers = await formatTransfers(allTransfers);
    return formattedTransfers;
  }

  async getWalletHistoryPaginated(
    address: string,
    startBlock: number,
    limit: number,
    offset: number,
  ): Promise<{ transfers: ITransfer[]; hasMore: boolean; total?: number }> {
    const allTransfers = await this.getWalletHistory(address, startBlock);

    const total = allTransfers.length;
    const startIdx = Math.min(offset, total);
    const endIdx = Math.min(offset + limit, total);
    const pageTransfers = allTransfers.slice(startIdx, endIdx);

    return {
      transfers: pageTransfers,
      hasMore: endIdx < total,
      total,
    };
  }

  private async getBalanceAtBlock(
    address: string,
    blockNumber: number,
  ): Promise<string> {
    const apiKey = process.env.ALCHEMY_API_KEY!;
    const baseUrl = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`;

    const requestBody = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "0x" + blockNumber.toString(16)],
    };

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = (await response.json()) as {
      result?: string;
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(`Alchemy balance error: ${data.error.message}`);
    }

    return data.result || "0";
  }
  async getEthereumBalanceForDate(
    address: string,
    date: string,
  ): Promise<string> {
    try {
      if (!isValidAddress(address)) {
        throw new Error("Invalid Ethereum address");
      }
      const timestamp = dateToTimestamp(date);
      const blockNumber = await getBlockNumberByTimestamp(timestamp);
      console.log(
        `Getting ETH balance for ${address} at block ${blockNumber} (${date})`,
      );
      const balance = await this.getBalanceAtBlock(address, blockNumber);
      return (parseInt(balance) / 1e18).toFixed(8) + " ETH";
    } catch (error: any) {
      if (error.message.includes("Invalid date")) {
        throw error;
      }
      if (error.message.includes("Etherscan error")) {
        throw new Error(
          `Failed to find block for date ${date}: ${error.message}`,
        );
      }
      throw new Error(`Failed to get historical balance: ${error.message}`);
    }
  }
  getBalanceAndTokensForDate(
    address: string,
    tokenContract: string,
    date: string,
  ): Promise<string> {
    return Promise.resolve("0"); // took too much time to figure out how to do it and ran out of time
  }
}
