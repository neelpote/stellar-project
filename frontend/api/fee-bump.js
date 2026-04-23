/**
 * Fee Bump API — Vercel Serverless Function
 *
 * Wraps a user-signed inner transaction in a fee bump transaction signed by
 * the sponsor account, so users don't need any XLM to pay fees.
 */

import * as StellarSdk from '@stellar/stellar-sdk';

const HORIZON_URL  = 'https://horizon-testnet.stellar.org';
const PASSPHRASE   = 'Test SDF Network ; September 2015';
const BASE_FEE     = 10000; // 0.001 XLM — generous enough for fast inclusion

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Shared secret prevents unauthorized use of the sponsor wallet
  const secret = req.headers['x-deco-secret'];
  if (!secret || secret !== process.env.FEE_BUMP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { innerTxXdr } = req.body;
  if (!innerTxXdr) return res.status(400).json({ error: 'Missing innerTxXdr' });

  const sponsorSecret = process.env.SPONSOR_SECRET_KEY;
  if (!sponsorSecret) return res.status(500).json({ error: 'Sponsor not configured' });

  try {
    const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecret);
    const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

    const innerTx = StellarSdk.TransactionBuilder.fromXDR(innerTxXdr, PASSPHRASE);

    const feeBumpTx = StellarSdk.TransactionBuilder.buildFeeBumpTransaction(
      sponsorKeypair,
      String(BASE_FEE),
      innerTx,
      PASSPHRASE
    );

    feeBumpTx.sign(sponsorKeypair);

    const result = await horizon.submitTransaction(feeBumpTx);

    return res.status(200).json({
      hash: result.hash,
      successful: result.successful,
      feePaidBy: sponsorKeypair.publicKey(),
    });
  } catch (error) {
    console.error('Fee bump error:', error);
    const detail = error?.response?.data?.extras?.result_codes || error.message;
    return res.status(500).json({ error: 'Fee bump failed', detail });
  }
}
