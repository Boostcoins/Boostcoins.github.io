import {
  Connection,
  Keypair,
  Transaction,
  PublicKey,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddressSync,
  createBurnInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import {
  OnlinePumpSdk,
  PUMP_SDK,
  PUMP_PROGRAM_ID,
  getBuyTokenAmountFromSolAmount,
  bondingCurveV2Pda,
} from '@pump-fun/pump-sdk'
import {
  OnlinePumpAmmSdk,
  PumpAmmSdk,
  PUMP_AMM_SDK,
  PUMP_AMM_PROGRAM_ID,
  poolV2Pda,
  canonicalPumpPoolPda,
} from '@pump-fun/pump-swap-sdk'
import BN from 'bn.js'
import { keypairFromEncrypted } from './wallet'
import { supabaseAdmin } from './supabase'

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
const MIN_CLAIM_SOL = parseFloat(process.env.MIN_CLAIM_SOL || '0.01')

// ─── Mood-aware strategy picker ───────────────────────────────────────────────

// Mood → strategy mapping
// burn:     aggressive/dark moods → buy tokens and destroy them
// buyback:  bullish/excited moods → buy tokens and hold supply pressure
// lp:       calm/stable moods    → strengthen the market
// balanced: neutral moods        → split evenly

const MOOD_BURN    = new Set(['aggressive', 'defiant', 'wired', 'electric', 'raw', 'hungry', 'sharp', 'restless', 'intense', 'dark', 'angry', 'furious', 'chaotic', 'wild', 'volatile', 'destructive', 'obsessed'])
const MOOD_BUYBACK = new Set(['bullish', 'excited', 'euphoric', 'pumped', 'confident', 'optimistic', 'determined', 'focused', 'motivated', 'hopeful', 'proud', 'strong', 'bold', 'fearless'])
const MOOD_LP      = new Set(['calm', 'soft', 'tender', 'lucid', 'warm', 'foggy', 'hollow', 'numb', 'still', 'quiet', 'gentle', 'patient', 'steady', 'grounded', 'peaceful', 'serene', 'stable', 'thoughtful'])

type Strategy = { name: string; buybackFraction: number; lpFraction: number }

function pickStrategy(mood?: string): Strategy {
  // Manual override via env var — set FORCE_STRATEGY=lp|burn|buyback|balanced in Vercel
  const forced = process.env.FORCE_STRATEGY?.toLowerCase().trim()
  if (forced === 'lp')       return { name: 'lp',       buybackFraction: 0.0, lpFraction: 1.0 }
  if (forced === 'burn')     return { name: 'burn',      buybackFraction: 1.0, lpFraction: 0.0 }
  if (forced === 'buyback')  return { name: 'buyback',   buybackFraction: 1.0, lpFraction: 0.0 }
  if (forced === 'balanced') return { name: 'balanced',  buybackFraction: 0.5, lpFraction: 0.5 }

  const m = mood?.toLowerCase().trim() ?? ''

  // Direct mood → strategy (deterministic, no randomness)
  if (MOOD_BURN.has(m))    return { name: 'burn',    buybackFraction: 1.0, lpFraction: 0.0 }
  if (MOOD_BUYBACK.has(m)) return { name: 'buyback', buybackFraction: 1.0, lpFraction: 0.0 }
  if (MOOD_LP.has(m))      return { name: 'lp',      buybackFraction: 0.0, lpFraction: 1.0 }

  // Unknown/neutral mood → weighted random including LP
  const roll = Math.random()
  if (roll < 0.40) return { name: 'burn',     buybackFraction: 1.0, lpFraction: 0.0 }
  if (roll < 0.70) return { name: 'buyback',  buybackFraction: 1.0, lpFraction: 0.0 }
  if (roll < 0.85) return { name: 'balanced', buybackFraction: 0.5, lpFraction: 0.5 }
  return               { name: 'lp',       buybackFraction: 0.0, lpFraction: 1.0 }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Ix = { programId: PublicKey; keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[] }

async function getTokenProgramForMint(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint)
  if (info && info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID
  return TOKEN_PROGRAM_ID
}

function appendV2Account(instructions: Ix[], programId: PublicKey, v2Pda: PublicKey) {
  for (const ix of instructions) {
    if (ix.programId.equals(programId)) {
      ix.keys.push({ pubkey: v2Pda, isSigner: false, isWritable: false })
    }
  }
}

async function sendTx(connection: Connection, tx: Transaction, signer: Keypair): Promise<string> {
  tx.instructions.unshift(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
  )
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const sig = await sendAndConfirmTransaction(connection, tx, [signer], {
        skipPreflight: false,
        preflightCommitment: 'processed',
        maxRetries: 5,
      })
      return sig
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('blockhash') && attempt < 2) {
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        continue
      }
      throw err
    }
  }
  throw new Error('tx failed after 3 attempts')
}

async function checkMigration(connection: Connection, mint: PublicKey): Promise<boolean> {
  try {
    const poolPda = canonicalPumpPoolPda(mint)
    const info = await connection.getAccountInfo(poolPda)
    return info !== null
  } catch {
    return false
  }
}

// ─── LP Add (post-migration only) ─────────────────────────────────────────────

async function addLiquidity(
  connection: Connection,
  keypair: Keypair,
  mint: PublicKey,
  lpLamports: number,
  txs: string[],
  tag: string,
  tokenProgram: PublicKey
): Promise<{ sol: number; error?: string }> {
  try {
    console.log(`${tag} [LP] starting liquidity add — ${(lpLamports / 1e9).toFixed(6)} SOL`)
    const onlineAmm = new OnlinePumpAmmSdk(connection)
    const pumpAmmSdk = new PumpAmmSdk()
    const poolPda = canonicalPumpPoolPda(mint)
    const ata = getAssociatedTokenAddressSync(mint, keypair.publicKey, true, tokenProgram)

    const depositSolBN = new BN(Math.floor(lpLamports * 0.5))

    const liquidityState = await onlineAmm.liquiditySolanaState(poolPda, keypair.publicKey, ata)
    const { base: tokensNeeded, lpToken } = pumpAmmSdk.depositAutocompleteBaseAndLpTokenFromQuote(
      liquidityState,
      depositSolBN,
      5
    )

    if (tokensNeeded.isZero() || lpToken.isZero()) {
      console.log(`${tag} [LP] tokens needed is zero — skipping LP`)
      return { sol: 0 }
    }

    console.log(`${tag} [LP] buying ${tokensNeeded.toString()} tokens for LP deposit`)
    const swapState = await onlineAmm.swapSolanaState(poolPda, keypair.publicKey, ata)
    const buyIx = await PUMP_AMM_SDK.buyBaseInput(swapState, tokensNeeded, 5)
    appendV2Account(buyIx as unknown as Ix[], PUMP_AMM_PROGRAM_ID, poolV2Pda(mint))
    const buySig = await sendTx(connection, new Transaction().add(...(buyIx as unknown as import('@solana/web3.js').TransactionInstruction[])), keypair)
    console.log(`${tag} [LP] token buy tx: ${buySig}`)
    txs.push(buySig)

    await new Promise((r) => setTimeout(r, 3000))

    const tokenInfo = await connection.getTokenAccountBalance(ata)
    const actualTokens = new BN(tokenInfo.value.amount)
    if (actualTokens.isZero()) {
      console.log(`${tag} [LP] actual token balance is zero after buy — skipping deposit`)
      return { sol: 0 }
    }

    const freshLiquidityState = await onlineAmm.liquiditySolanaState(poolPda, keypair.publicKey, ata)
    const { lpToken: freshLpToken } = pumpAmmSdk.depositAutocompleteQuoteAndLpTokenFromBase(
      freshLiquidityState,
      actualTokens,
      5
    )
    if (freshLpToken.isZero()) {
      console.log(`${tag} [LP] fresh lpToken is zero — skipping deposit`)
      return { sol: 0 }
    }

    console.log(`${tag} [LP] depositing to pool`)
    const depositIx = await pumpAmmSdk.depositInstructions(freshLiquidityState, freshLpToken, 5)
    appendV2Account(depositIx as unknown as Ix[], PUMP_AMM_PROGRAM_ID, poolV2Pda(mint))
    const depositSig = await sendTx(connection, new Transaction().add(...(depositIx as unknown as import('@solana/web3.js').TransactionInstruction[])), keypair)
    console.log(`${tag} [LP] deposit tx: ${depositSig}`)
    txs.push(depositSig)

    console.log(`${tag} [LP] complete — ${(lpLamports / 1e9).toFixed(6)} SOL added`)
    return { sol: lpLamports / 1e9 }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${tag} [LP] failed: ${msg}`)
    return { sol: -1, error: msg }
  }
}

// ─── Buyback + Burn ───────────────────────────────────────────────────────────

async function doBuyback(
  connection: Connection,
  keypair: Keypair,
  mint: PublicKey,
  sdk: OnlinePumpSdk,
  isMigrated: boolean,
  buyLamports: number,
  txs: string[],
  tag: string,
  tokenProgram: PublicKey
): Promise<{ buySol: number; burnedAmount: string }> {
  const buySolBn = new BN(Math.floor(buyLamports))
  const buySol = buyLamports / 1e9
  const ata = getAssociatedTokenAddressSync(mint, keypair.publicKey, true, tokenProgram)

  console.log(`${tag} [BUY] buying ${buySol.toFixed(6)} SOL worth via ${isMigrated ? 'AMM' : 'bonding curve'}`)

  if (isMigrated) {
    const onlineAmm = new OnlinePumpAmmSdk(connection)
    const poolPda = canonicalPumpPoolPda(mint)
    const swapState = await onlineAmm.swapSolanaState(poolPda, keypair.publicKey, ata)
    const buyIx = await PUMP_AMM_SDK.buyQuoteInput(swapState, buySolBn, 5)
    appendV2Account(buyIx as unknown as Ix[], PUMP_AMM_PROGRAM_ID, poolV2Pda(mint))
    const sig = await sendTx(connection, new Transaction().add(...(buyIx as unknown as import('@solana/web3.js').TransactionInstruction[])), keypair)
    console.log(`${tag} [BUY] AMM buy tx: ${sig}`)
    txs.push(sig)
  } else {
    const global = await sdk.fetchGlobal()
    const buyState = await sdk.fetchBuyState(mint, keypair.publicKey, tokenProgram)
    const amount = getBuyTokenAmountFromSolAmount({
      global,
      feeConfig: null,
      mintSupply: buyState.bondingCurve.tokenTotalSupply,
      bondingCurve: buyState.bondingCurve,
      amount: buySolBn,
    })
    const buyIx = await PUMP_SDK.buyInstructions({
      global,
      bondingCurveAccountInfo: buyState.bondingCurveAccountInfo,
      bondingCurve: buyState.bondingCurve,
      associatedUserAccountInfo: buyState.associatedUserAccountInfo,
      mint,
      user: keypair.publicKey,
      amount,
      solAmount: buySolBn,
      slippage: 2,
      tokenProgram,
    })
    appendV2Account(buyIx as unknown as Ix[], PUMP_PROGRAM_ID, bondingCurveV2Pda(mint))
    const sig = await sendTx(connection, new Transaction().add(...(buyIx as unknown as import('@solana/web3.js').TransactionInstruction[])), keypair)
    console.log(`${tag} [BUY] bonding curve buy tx: ${sig}`)
    txs.push(sig)
  }

  await new Promise((r) => setTimeout(r, 3000))

  let tokenBalance = BigInt(0)
  try {
    const tokenInfo = await connection.getTokenAccountBalance(ata)
    tokenBalance = BigInt(tokenInfo.value.amount)
  } catch (err) {
    console.error(`${tag} [BURN] failed to fetch token balance: ${err instanceof Error ? err.message : err}`)
  }

  let burnedAmount = '0'
  if (tokenBalance > BigInt(0)) {
    console.log(`${tag} [BURN] burning ${tokenBalance.toString()} tokens`)
    const burnIx = createBurnInstruction(ata, mint, keypair.publicKey, tokenBalance, [], tokenProgram)
    const sig = await sendTx(connection, new Transaction().add(burnIx), keypair)
    console.log(`${tag} [BURN] burn tx: ${sig}`)
    txs.push(sig)
    burnedAmount = tokenBalance.toString()
  } else {
    console.log(`${tag} [BURN] no tokens to burn`)
  }

  return { buySol, burnedAmount }
}

// ─── Main exported function ───────────────────────────────────────────────────

const MIN_WALLET_SOL_FOR_FEES = 0.005 // wallet needs this much SOL to pay for tx fees

export async function runOnChainCycle(
  agentId: string,
  encryptedPrivateKey: string,
  mintAddress: string,
  mood?: string
): Promise<{ success: boolean; message: string; strategy?: string; claimedSol?: number; burned?: string; lpSol?: number; txs?: string[] }> {
  const tag = `[CHAIN:${agentId}]`
  console.log(`${tag} starting on-chain cycle — mint: ${mintAddress} | mood: ${mood ?? 'none'}`)

  const connection = new Connection(RPC_URL, 'confirmed')
  const keypair = keypairFromEncrypted(encryptedPrivateKey)
  const mint = new PublicKey(mintAddress)
  const sdk = new OnlinePumpSdk(connection)
  const txs: string[] = []

  // Step 0: Check wallet SOL balance for tx fees (separate from vault balance)
  try {
    const { LAMPORTS_PER_SOL } = await import('@solana/web3.js')
    const walletLamports = await connection.getBalance(keypair.publicKey)
    const walletSol = walletLamports / LAMPORTS_PER_SOL
    console.log(`${tag} wallet SOL: ${walletSol.toFixed(6)} (min for fees: ${MIN_WALLET_SOL_FOR_FEES})`)
    if (walletSol < MIN_WALLET_SOL_FOR_FEES) {
      return { success: false, message: `wallet SOL too low for tx fees: ${walletSol.toFixed(6)} SOL — top up wallet to continue` }
    }
  } catch (err) {
    console.error(`${tag} failed to check wallet SOL balance: ${err instanceof Error ? err.message : err}`)
  }

  // Step 1: Check creator vault balance
  let balanceLamports: BN
  try {
    balanceLamports = await sdk.getCreatorVaultBalanceBothPrograms(keypair.publicKey)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${tag} failed to fetch vault balance: ${msg}`)
    return { success: false, message: `vault balance check failed: ${msg}` }
  }

  const balanceSol = balanceLamports.toNumber() / 1e9
  console.log(`${tag} vault balance: ${balanceSol.toFixed(6)} SOL (min: ${MIN_CLAIM_SOL})`)

  if (balanceSol < MIN_CLAIM_SOL) {
    console.log(`${tag} vault balance below minimum — skipping cycle`)
    return { success: false, message: `vault balance too low: ${balanceSol.toFixed(6)} SOL` }
  }

  // Step 2: Claim creator fees
  console.log(`${tag} claiming creator fees`)
  try {
    const claimIx = await sdk.collectCoinCreatorFeeInstructions(keypair.publicKey, keypair.publicKey)
    appendV2Account(claimIx as unknown as Ix[], PUMP_PROGRAM_ID, bondingCurveV2Pda(mint))
    appendV2Account(claimIx as unknown as Ix[], PUMP_AMM_PROGRAM_ID, poolV2Pda(mint))
    const claimSig = await sendTx(connection, new Transaction().add(...(claimIx as unknown as import('@solana/web3.js').TransactionInstruction[])), keypair)
    console.log(`${tag} claim tx: ${claimSig}`)
    txs.push(claimSig)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${tag} claim failed: ${msg}`)
    return { success: false, message: `claim failed: ${msg}` }
  }

  await new Promise((r) => setTimeout(r, 2000))

  const txFeeSol = 0.002
  const availableLamports = Math.max(0, Math.floor(balanceSol * 1e9) - txFeeSol * 1e9)

  if (availableLamports <= 0) {
    console.log(`${tag} nothing left after gas reserve — cycle done`)
    await saveStats(agentId, balanceSol, 0, '0', 0, 'none', tag)
    return { success: true, message: 'claimed fees, nothing left after gas', strategy: 'none' }
  }

  // Step 3: Detect token program + check migration status
  const tokenProgram = await getTokenProgramForMint(connection, mint)
  console.log(`${tag} token program: ${tokenProgram.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'SPL Token'}`)
  const isMigrated = await checkMigration(connection, mint)
  console.log(`${tag} migration status: ${isMigrated ? 'migrated (AMM)' : 'bonding curve'}`)

  // Step 4: Pick strategy — mood-driven for both bonding curve and AMM
  const strategy = pickStrategy(mood)

  console.log(`${tag} mood: "${mood ?? 'none'}" → strategy: ${strategy.name} (buy: ${strategy.buybackFraction * 100}% | lp: ${strategy.lpFraction * 100}%)`)

  let lpSol = 0
  let lpError: string | undefined
  let buyLamports = availableLamports

  // Step 5: Add liquidity (post-migration only)
  if (isMigrated && strategy.lpFraction > 0) {
    const lpLamports = Math.floor(availableLamports * strategy.lpFraction)
    buyLamports = availableLamports - lpLamports

    const lpResult = await addLiquidity(connection, keypair, mint, lpLamports, txs, tag, tokenProgram)
    if (lpResult.sol === -1) {
      lpError = lpResult.error
      buyLamports = availableLamports
      console.log(`${tag} LP failed — reallocating full amount to buyback`)
    } else {
      lpSol = lpResult.sol
    }
  }

  // Step 6: Buyback + burn
  let buySol = 0
  let burnedAmount = '0'

  if (buyLamports > 0 && strategy.buybackFraction > 0) {
    try {
      const result = await doBuyback(connection, keypair, mint, sdk, isMigrated, buyLamports, txs, tag, tokenProgram)
      buySol = result.buySol
      burnedAmount = result.burnedAmount
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`${tag} buyback/burn failed: ${msg}`)
      return { success: false, message: `buyback failed: ${msg}`, strategy: strategy.name }
    }
  }

  // Step 7: Save stats + cycle proof
  await saveStats(agentId, balanceSol, buySol, burnedAmount, lpSol, strategy.name, tag)
  await saveCycle(agentId, strategy.name, balanceSol, burnedAmount, lpSol, txs, tag)

  const msg = `cycle complete — ${strategy.name}${isMigrated ? ' (AMM)' : ' (bonding curve)'}${lpError ? ` [LP failed: ${lpError}]` : ''}`
  console.log(`${tag} ${msg} | burned: ${burnedAmount} | lpSol: ${lpSol} | txs: ${txs.length}`)

  return {
    success: true,
    message: msg,
    strategy: strategy.name,
    claimedSol: balanceSol,
    burned: burnedAmount,
    lpSol,
    txs,
  }
}

// ─── Save cycle proof ─────────────────────────────────────────────────────────

async function saveCycle(
  agentId: string,
  strategy: string,
  claimedSol: number,
  burned: string,
  lpSol: number,
  txs: string[],
  tag: string
) {
  const { error } = await supabaseAdmin.from('cycles').insert({
    agent_id:    agentId,
    strategy,
    claimed_sol: claimedSol,
    burned,
    lp_sol:      lpSol,
    txs,
  })
  if (error) console.error(`${tag} failed to save cycle: ${error.message}`)
  else console.log(`${tag} saved cycle proof — ${txs.length} tx(s): ${txs.join(', ')}`)
}

// ─── Save stats ───────────────────────────────────────────────────────────────

async function saveStats(
  agentId: string,
  claimed: number,
  boughtBack: number,
  burned: string,
  lpSol: number,
  strategy: string,
  tag: string
) {
  const { data: existing } = await supabaseAdmin
    .from('agent_stats')
    .select('*')
    .eq('agent_id', agentId)
    .single()

  if (existing) {
    const { error } = await supabaseAdmin
      .from('agent_stats')
      .update({
        total_claimed:  (existing.total_claimed  || 0) + claimed,
        total_burned:   (BigInt(String(existing.total_burned ?? '0')) + BigInt(burned)).toString(),
        total_lp:       (existing.total_lp       || 0) + lpSol,
        last_cycle:     new Date().toISOString(),
        last_strategy:  strategy,
      })
      .eq('agent_id', agentId)
    if (error) console.error(`${tag} failed to update stats: ${error.message}`)
  } else {
    const { error } = await supabaseAdmin.from('agent_stats').insert({
      agent_id:      agentId,
      total_claimed: claimed,
      total_burned:  burned,
      total_lp:      lpSol,
      last_cycle:    new Date().toISOString(),
      last_strategy: strategy,
    })
    if (error) console.error(`${tag} failed to insert stats: ${error.message}`)
  }
}
