import { Router, Request, Response } from 'express';
import { EtherscanService } from '../services/etherscan.service';

const router = Router();
const etherscanService = new EtherscanService();

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { address, startBlock } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Valid address query parameter is required.' });
    }
    const startBlockNum = startBlock ? parseInt(startBlock as string) : 0;

    const transactions = await etherscanService.getTransactionsByAddress(address, startBlockNum);
    res.json(transactions);

  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Failed to fetch transaction data.' });
  }
});

export default router;