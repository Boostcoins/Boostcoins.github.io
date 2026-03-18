import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY!

function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
}

export function encryptPrivateKey(privateKeyBase58: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  let encrypted = cipher.update(privateKeyBase58, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decryptPrivateKey(encrypted: string): string {
  const key = getKey()
  const [ivHex, encryptedHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export function generateWallet(): { publicKey: string; encryptedPrivateKey: string } {
  const keypair = Keypair.generate()
  const privateKeyBase58 = bs58.encode(keypair.secretKey)
  return {
    publicKey: keypair.publicKey.toBase58(),
    encryptedPrivateKey: encryptPrivateKey(privateKeyBase58),
  }
}

export function keypairFromEncrypted(encryptedPrivateKey: string): Keypair {
  const privateKeyBase58 = decryptPrivateKey(encryptedPrivateKey)
  const secretKey = bs58.decode(privateKeyBase58)
  return Keypair.fromSecretKey(secretKey)
}

export async function getWalletBalance(publicKey: string): Promise<number> {
  const rpcUrl = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
  const connection = new Connection(rpcUrl, 'confirmed')
  const balance = await connection.getBalance(new PublicKey(publicKey))
  return balance / LAMPORTS_PER_SOL
}
