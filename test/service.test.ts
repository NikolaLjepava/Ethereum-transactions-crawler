import { describe, it, expect, beforeAll } from '@jest/globals';
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
});