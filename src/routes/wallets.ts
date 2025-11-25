// src/routes/wallets.ts
import express from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../supabase/client";

const router = express.Router();

// GET wallet balance
router.get("/", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.id;

  const { data, error } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// CREDIT wallet
router.post("/credit", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.id;
  const { amount, reference } = req.body;

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (walletError || !wallet) return res.status(404).json({ error: "Wallet not found" });

  const newBalance = Number(wallet.balance) + Number(amount);

  await supabaseAdmin.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);

  const { data: tx } = await supabaseAdmin.from("wallet_transactions").insert([{
    wallet_id: wallet.id,
    type: "credit",
    amount,
    reference,
    status: "completed",
    created_at: new Date().toISOString()
  }]).select().single();

  res.json({ wallet: { ...wallet, balance: newBalance }, transaction: tx });
});

// DEBIT wallet
router.post("/debit", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.id;
  const { amount, reference } = req.body;

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (walletError || !wallet) return res.status(404).json({ error: "Wallet not found" });
  if (Number(wallet.balance) < Number(amount)) return res.status(400).json({ error: "Insufficient funds" });

  const newBalance = Number(wallet.balance) - Number(amount);

  await supabaseAdmin.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);

  const { data: tx } = await supabaseAdmin.from("wallet_transactions").insert([{
    wallet_id: wallet.id,
    type: "debit",
    amount,
    reference,
    status: "completed",
    created_at: new Date().toISOString()
  }]).select().single();

  res.json({ wallet: { ...wallet, balance: newBalance }, transaction: tx });
});

export default router;
