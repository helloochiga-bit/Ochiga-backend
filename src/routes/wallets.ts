import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as WalletCtrl from "../controllers/walletController";

const router = Router();

// GET WALLET BALANCE
router.get("/", requireAuth, WalletCtrl.getWallet);

// INIT PAYSTACK PAYMENT
router.post("/init", requireAuth, WalletCtrl.initPayment);

// PAYSTACK WEBHOOK
router.post("/webhook", WalletCtrl.handleWebhook);

// MANUAL CREDIT
router.post("/credit", requireAuth, WalletCtrl.creditWallet);

// DEBIT
router.post("/debit", requireAuth, WalletCtrl.debitWallet);

export default router;
