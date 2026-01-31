import { Router, Request, Response } from "express";
import { BlockchainService } from "../services/service";

const router = Router();
const blockchainService = new BlockchainService();

router.get("/transactions", async (req: Request, res: Response) => {
  try {
    const { address, startBlock, page = "1", limit = "50" } = req.query;

    if (!address || typeof address !== "string") {
      return res.status(400).json({
        success: false,
        error: "Wallet address is required",
      });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Ethereum address format",
      });
    }
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string))); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;
    const startBlockNum = startBlock ? parseInt(startBlock as string) : 0;

    // Fetch transactions
    const result = await blockchainService.getWalletHistoryPaginated(
      address as string,
      startBlockNum,
      limitNum,
      offset,
    );

    res.json({
      success: true,
      address,
      startBlock: startBlockNum,
      page: pageNum,
      limit: limitNum,
      hasMore: result.hasMore,
      total: result.total,
      transfers: result.transfers,
    });
  } catch (error: any) {
    console.error("Route error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch transaction data",
    });
  }
});

export default router;
