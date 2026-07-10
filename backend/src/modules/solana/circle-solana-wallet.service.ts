import {
  Injectable,
  OnModuleInit,
  Logger,
  BadRequestException,
} from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { User, UserDocument } from "../users/users.model"
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets"
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js"

/**
 * Circle Developer-Controlled Wallets on Solana. Provisions an EOA wallet per
 * user (SOL-DEVNET) and signs arbitrary program instructions via Circle's
 * `signTransaction`, then broadcasts through an RPC connection. This preserves
 * the no-wallet-popup custodial UX the app used on Arc, now on Solana.
 */
@Injectable()
export class CircleSolanaWalletService implements OnModuleInit {
  private readonly logger = new Logger(CircleSolanaWalletService.name)
  private client: any
  private connection: Connection

  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  onModuleInit() {
    const rpcUrl =
      this.configService.get<string>("SOLANA_RPC_URL") ||
      "https://api.devnet.solana.com"
    this.connection = new Connection(rpcUrl, "confirmed")

    const apiKey = this.configService.get<string>("CIRCLE_API_KEY")
    const entitySecret = this.configService.get<string>("CIRCLE_ENTITY_SECRET")
    if (!apiKey || !entitySecret) {
      this.logger.warn(
        "CircleSolanaWalletService: CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET not configured.",
      )
      return
    }
    try {
      this.client = initiateDeveloperControlledWalletsClient({
        apiKey,
        entitySecret,
      })
      this.logger.log("Circle Solana wallet client initialized.")
    } catch (error) {
      this.logger.error("Failed to initialize Circle client:", error)
    }
  }

  /** Provision a Circle EOA wallet on Solana for a user and persist it. */
  async createSolanaWalletForUser(userId: string): Promise<string> {
    if (!this.client) {
      throw new BadRequestException("Circle client is not initialized.")
    }
    const walletSetId = this.configService.get<string>("CIRCLE_WALLET_SET_ID")
    if (!walletSetId) {
      throw new BadRequestException("CIRCLE_WALLET_SET_ID is not configured.")
    }
    const blockchain =
      this.configService.get<string>("CIRCLE_SOLANA_BLOCKCHAIN") || "SOL-DEVNET"

    try {
      const response = await this.client.createWallets({
        walletSetId,
        blockchains: [blockchain as any],
        accountType: "EOA",
        count: 1,
      })
      const wallet = response.data.wallets?.[0]
      if (!wallet) throw new Error("No wallet returned by Circle.")

      await this.userModel.findByIdAndUpdate(userId, {
        solanaWalletAddress: wallet.address,
        circleSolanaWalletId: wallet.id,
      })
      this.logger.log(
        `Solana EOA wallet created: ${wallet.address} (id ${wallet.id})`,
      )
      return wallet.address
    } catch (error: any) {
      this.logger.error(
        `Solana wallet creation failed for ${userId}:`,
        error.response?.data || error.message,
      )
      throw new BadRequestException(
        `Circle Solana wallet creation failed: ${error.response?.data?.message || error.message}`,
      )
    }
  }

  /**
   * Assemble the given instructions into one transaction (fee payer = the
   * user's Circle wallet), sign it via Circle, and broadcast. Solana
   * transactions natively batch instructions, so no ERC-4337-style wrapper is
   * needed — multiple actions are just multiple instructions here.
   */
  async signAndBroadcast(
    userId: string,
    instructions: TransactionInstruction[],
  ): Promise<string> {
    if (!this.client) {
      throw new BadRequestException("Circle client is not initialized.")
    }
    if (instructions.length === 0) {
      throw new BadRequestException("No instructions to sign.")
    }
    const user = await this.userModel.findById(userId)
    if (!user?.circleSolanaWalletId || !user?.solanaWalletAddress) {
      throw new BadRequestException(
        "User does not have a Circle Solana wallet.",
      )
    }

    const feePayer = new PublicKey(user.solanaWalletAddress)
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed")

    const tx = new Transaction()
    tx.feePayer = feePayer
    tx.recentBlockhash = blockhash
    instructions.forEach((ix) => tx.add(ix))

    const rawTransaction = tx
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64")

    try {
      const signed = await this.client.signTransaction({
        walletId: user.circleSolanaWalletId,
        rawTransaction,
      })
      const signedTx: string =
        signed.data?.signedTransaction ?? signed.data?.signed_transaction
      if (!signedTx) throw new Error("Circle returned no signed transaction.")

      const sig = await this.connection.sendRawTransaction(
        Buffer.from(signedTx, "base64"),
        { skipPreflight: false },
      )
      await this.connection.confirmTransaction(sig, "confirmed")
      this.logger.log(`Broadcast Solana tx ${sig} for user ${userId}`)
      return sig
    } catch (error: any) {
      this.logger.error(
        `Solana sign/broadcast failed for ${userId}: ${error.message}`,
      )
      throw new BadRequestException(
        `Solana transaction failed: ${error.message}`,
      )
    }
  }
}
