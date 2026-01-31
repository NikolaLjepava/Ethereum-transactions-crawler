import { describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
global.fetch = jest.fn();
import { BlockchainService } from '../src/services/service';

describe('BlockchainService', () => {
  let service: BlockchainService;
  
  beforeAll(() => {
    process.env.ALCHEMY_API_KEY = 'test-key';
    service = new BlockchainService();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getWalletHistory', () => {
    it('should throw error for invalid address', async () => {
      await expect(service.getWalletHistory('invalid-address', 16000000))
        .rejects.toThrow('Invalid Ethereum address');
    });
    
    it('should return array for valid address', async () => {
  const mockTransfer = {
    from: '0x123...',
    to: '0x456...',
    blockNum: '0xF42400',
    category: 'external',
    value: '1000000000000000000', // 1 ETH in wei
    asset: 'ETH',
    hash: '0xabc...',
    metadata: { blockTimestamp: '2023-01-01T00:00:00Z' }
  };
  
(global.fetch as jest.Mock)
  .mockResolvedValueOnce({ 
    ok: true,
    json: async () => ({
      result: { 
        transfers: [mockTransfer],
        pageKey: undefined
      }
    })
  })
  .mockResolvedValueOnce({ 
    ok: true,
    json: async () => ({
      result: { 
        transfers: [],
        pageKey: undefined
      }
    })
  });
  
  const result = await service.getWalletHistory(
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    16000000
  );
  
  expect(result).toHaveLength(1);
  expect(result[0]).toEqual({
    fromAddress: '0x123...',
    toAddress: '0x456...',
    blockNum: 16000000, 
    category: 'external',
    value: '1.000000', 
    asset: 'ETH',
    hash: '0xabc...',
    timestamp: 1672531200
  });
});
  });
  describe('getEthereumBalanceForDate', () => {
  it('should get ETH balance for a date', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "1",
          result: "16000000"
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: "1000000000000000000"
        })
      });
    
    const balance = await service.getEthereumBalanceForDate(
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      '2023-01-01'
    );
    
    expect(balance).toBe('1.00000000 ETH');
  });
  
  it('should throw error for invalid date format', async () => {
    await expect(
      service.getEthereumBalanceForDate(
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        'invalid-date'
      )
    ).rejects.toThrow('Invalid date format');
  });
  
  it('should throw error for invalid address', async () => {
    await expect(
      service.getEthereumBalanceForDate('invalid', '2023-01-01')
    ).rejects.toThrow('Invalid Ethereum address');
  });
});
describe('getWalletHistoryPaginated', () => {
  it('should paginate results correctly', async () => {
    const mockTransfers = Array.from({ length: 15 }, (_, i) => ({
      fromAddress: `0x${i}`,
      toAddress: `0x${i + 1}`,
      blockNum: 16000000 + i,
      category: 'external',
      value: '1.000000',
      asset: 'ETH',
      hash: `0xhash${i}`
    }));
    
    jest.spyOn(service, 'getWalletHistory').mockResolvedValue(mockTransfers);
    
    const page1 = await service.getWalletHistoryPaginated(
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      16000000,
      5,
      0
    );
    
    expect(page1.transfers).toHaveLength(5);
    expect(page1.hasMore).toBe(true);
    expect(page1.total).toBe(15);
    expect(page1.transfers[0].blockNum).toBe(16000000);
    
    const page3 = await service.getWalletHistoryPaginated(
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      16000000,
      5,
      10
    );
    
    expect(page3.transfers).toHaveLength(5);
    expect(page3.hasMore).toBe(false);
    expect(page3.transfers[0].blockNum).toBe(16000010);
  });
  
  it('should handle empty results', async () => {
    jest.spyOn(service, 'getWalletHistory').mockResolvedValue([]);
    
    const result = await service.getWalletHistoryPaginated(
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      16000000,
      10,
      0
    );
    
    expect(result.transfers).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.total).toBe(0);
  });
});
});