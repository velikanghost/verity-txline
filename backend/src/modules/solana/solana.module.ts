import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { MongooseModule } from "@nestjs/mongoose"
import { User, UserSchema } from "../users/users.model"
import { Market, MarketSchema } from "../markets/markets.model"
import { Post, PostSchema } from "../posts/posts.model"
import { TxlineFixture, TxlineFixtureSchema } from "./fixtures.model"
import { SolanaLiquidity, SolanaLiquiditySchema } from "./liquidity-record.model"
import { SolanaService } from "./solana.service"
import { TxlineService } from "./txline.service"
import { CircleSolanaWalletService } from "./circle-solana-wallet.service"
import { WorldCupMarketService } from "./worldcup-market.service"
import { SolanaController } from "./solana.controller"

/**
 * Solana settlement + TxLINE data layer. Provides:
 *  - SolanaService: keeper-authoritative program calls (create pool, settle).
 *  - TxlineService: TxLINE REST/proof client.
 *  - CircleSolanaWalletService: per-user custodial Solana wallets + tx signing.
 */
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Market.name, schema: MarketSchema },
      { name: Post.name, schema: PostSchema },
      { name: TxlineFixture.name, schema: TxlineFixtureSchema },
      { name: SolanaLiquidity.name, schema: SolanaLiquiditySchema },
    ]),
  ],
  controllers: [SolanaController],
  providers: [
    SolanaService,
    TxlineService,
    CircleSolanaWalletService,
    WorldCupMarketService,
  ],
  exports: [SolanaService, TxlineService, CircleSolanaWalletService],
})
export class SolanaModule {}
