// src/routes/wallets.ts
import express from "express";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../supabase/client";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;

// Paystack axios instance
const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET}`,
    "Content-Type": "application/json",
  },
});

// =============================
// GET WALLET BALANCE
// =============================
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

// =============================
// INIT PAYSTACK PAYMENT
// =============================
router.post("/init", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.id;
  const { amount, email } = req.body;

  try {
    const response = await paystack.post("/transaction/initialize", {
      email,
      amount: Number(amount) * 100,
      metadata: {
        userId,
      },
    });

    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err?.response?.data || err.message });
  }
});

// =============================
// PAYSTACK WEBHOOK
// =============================
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["x-paystack-signature"] as string;

    const hash = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(req.body)
      .digest("hex");

    if (hash !== signature) {
      return res.status(401).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    // We only care about charge.success
    if (event.event === "charge.success") {
      const data = event.data;
      const userId = data.metadata.userId;

      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (wallet) {
        const credited = Number(data.amount) / 100;
        const newBalance = Number(wallet.balance) + credited;

        await supabaseAdmin
          .from("wallets")
          .update({ balance: newBalance })
          .eq("id", wallet.id);

        await supabaseAdmin.from("wallet_transactions").insert([
          {
            wallet_id: wallet.id,
            type: "credit",
            amount: credited,
            reference: data.reference,
            status: "completed",
            created_at: new Date().toISOString(),
          },
        ]);
      }
    }

    res.sendStatus(200);
  }
);

// =============================
// MANUAL CREDIT (rarely used when Paystack exists)
// =============================
router.post("/credit", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.id;
  const { amount, reference } = req.body;

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (walletError || !wallet)
    return res.status(404).json({ error: "Wallet not found" });

  const newBalance = Number(wallet.balance) + Number(amount);

  await supabaseAdmin
    .from("wallets")
    .update({ balance: newBalance })
    .eq("id", wallet.id);

  const { data: tx } = await supabaseAdmin
    .from("wallet_transactions")
    .insert([
      {
        wallet_id: wallet.id,
        type: "credit",
        amount,
        reference,
        status: "completed",
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  res.json({ wallet: { ...wallet, balance: newBalance }, transaction: tx });
});

// =============================
// DEBIT
// =============================
router.post("/debit", requireAuth, async (req, res) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.id;
  const { amount, reference } = req.body;

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (walletError || !wallet)
    return res.status(404).json({ error: "Wallet not found" });

  if (Number(wallet.balance) < Number(amount))
    return res.status(400).json({ error: "Insufficient funds" });

  const newBalance = Number(wallet.balance) - Number(amount);

  await supabaseAdmin
    .from("wallets")
    .update({ balance: newBalance })
    .eq("id", wallet.id);

  const { data: tx } = await supabaseAdmin
    .from("wallet_transactions")
    .insert([
      {
        wallet_id: wallet.id,
        type: "debit",
        amount,
        reference,
        status: "completed",
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  res.json({ wallet: { ...wallet, balance: newBalance }, transaction: tx });
});

export default router;
