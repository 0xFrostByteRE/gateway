// V2 (AMM) imports
import { Token, CurrencyAmount, Percent } from '@pancakeswap/sdk';
import { Pair as V2Pair } from '@pancakeswap/v2-sdk';
import { Contract, constants } from 'ethers';
import { getAddress } from 'ethers/lib/utils';
import { Address } from 'viem';

import { PulseChain, TokenInfo } from '../../chains/pulsechain/pulsechain';
import { logger } from '../../services/logger';

import { PulseXConfig } from './pulsex.config';
import {
  IPulseXV2PairABI,
  IPulseXV2FactoryABI,
  IPulseXV2Router02ABI,
  getPulseXV2RouterAddress,
  getPulseXV2FactoryAddress,
} from './pulsex.contracts';
import { isValidV2Pool } from './pulsex.utils';

export class PulseX {
  private static _instances: { [name: string]: PulseX };

  // PulseChain chain instance
  private pulsechain: PulseChain;

  // Configuration
  public config: PulseXConfig.RootConfig;

  // Common properties
  private chainId: number;
  private _ready: boolean = false;

  // V2 (AMM) properties
  private v2Factory: Contract;
  private v2Router: Contract;

  // Network name
  private networkName: string;

  private constructor(network: string) {
    this.networkName = network;
    this.config = PulseXConfig.config;
  }

  public static async getInstance(network: string): Promise<PulseX> {
    if (PulseX._instances === undefined) {
      PulseX._instances = {};
    }

    if (!(network in PulseX._instances)) {
      PulseX._instances[network] = new PulseX(network);
      await PulseX._instances[network].init();
    }

    return PulseX._instances[network];
  }

  public async init(): Promise<void> {
    // Initialize pulsechain chain if not already initialized
    this.pulsechain = await PulseChain.getInstance(this.networkName);
    await this.pulsechain.init();

    // Get chain ID
    this.chainId = this.pulsechain.chainId;

    // Initialize V2 contracts
    const v2RouterAddress = getPulseXV2RouterAddress(this.networkName);
    const v2FactoryAddress = getPulseXV2FactoryAddress(this.networkName);

    this.v2Router = new Contract(v2RouterAddress, IPulseXV2Router02ABI.abi, this.pulsechain.provider);
    this.v2Factory = new Contract(v2FactoryAddress, IPulseXV2FactoryABI.abi, this.pulsechain.provider);

    this._ready = true;
    logger.info(`PulseX connector initialized for network: ${this.networkName}`);
    logger.info(`  V2 Router: ${v2RouterAddress}`);
    logger.info(`  V2 Factory: ${v2FactoryAddress}`);
  }

  public ready(): boolean {
    return this._ready;
  }

  public async getToken(symbolOrAddress: string): Promise<TokenInfo | undefined> {
    return await this.pulsechain.getToken(symbolOrAddress);
  }

  public getPulseXToken(tokenInfo: TokenInfo): Token {
    return new Token(
      this.chainId,
      tokenInfo.address as `0x${string}`,
      tokenInfo.decimals,
      tokenInfo.symbol,
      tokenInfo.name,
    );
  }

  public async getV2Pool(
    baseToken: string,
    quoteToken: string,
    poolAddress?: string,
  ): Promise<{ pool: V2Pair | null; address: string }> {
    let pairAddress: string;
    const tokenAObj = await this.getToken(baseToken);
    const tokenBObj = await this.getToken(quoteToken);

    if (!tokenAObj || !tokenBObj) {
      logger.error(`Tokens not found: ${baseToken}, ${quoteToken}`);
      return { pool: null, address: '' };
    }

    try {
      // Get pair address from factory if not provided
      pairAddress = poolAddress || (await this.v2Factory.getPair(tokenAObj.address, tokenBObj.address));

      if (pairAddress === constants.AddressZero) {
        logger.warn(`No V2 pool found for ${baseToken}/${quoteToken}`);
        return { pool: null, address: '' };
      }

      // Check if the pool is valid and has liquidity
      const isValid = await isValidV2Pool(
        this.pulsechain,
        tokenAObj.address as `0x${string}`,
        tokenBObj.address as `0x${string}`,
        pairAddress,
      );

      if (!isValid) {
        logger.warn(`V2 pool ${pairAddress} is invalid or has no liquidity`);
        return { pool: null, address: '' };
      }

      // Get pair contract and reserves
      const pairContract = new Contract(pairAddress, IPulseXV2PairABI.abi, this.pulsechain.provider);
      const reserves = await pairContract.getReserves();
      const token0Address = await pairContract.token0();

      // Parse reserves based on token order
      const reserve0 = reserves[0];
      const reserve1 = reserves[1];

      const token0 = token0Address.toLowerCase() === tokenAObj.address.toLowerCase() ? tokenAObj : tokenBObj;
      const token1 = token0Address.toLowerCase() === tokenAObj.address.toLowerCase() ? tokenBObj : tokenAObj;

      // Create SDK tokens
      const token0SDK = new Token(
        this.chainId,
        token0.address as `0x${string}`,
        token0.decimals,
        token0.symbol,
        token0.name,
      );
      const token1SDK = new Token(
        this.chainId,
        token1.address as `0x${string}`,
        token1.decimals,
        token1.symbol,
        token1.name,
      );

      // Create V2 pair
      const pair = new V2Pair(
        CurrencyAmount.fromRawAmount(token0SDK, reserve0.toString()),
        CurrencyAmount.fromRawAmount(token1SDK, reserve1.toString()),
      );

      logger.info(
        `Found valid V2 pool at ${pairAddress} with reserves: ${reserve0} ${token0.symbol}, ${reserve1} ${token1.symbol}`,
      );

      return { pool: pair, address: pairAddress };
    } catch (error) {
      logger.error(`Error fetching V2 pool: ${error.message}`);
      return { pool: null, address: '' };
    }
  }

  public async findDefaultPool(
    baseToken: string,
    quoteToken: string,
    type: 'amm' | 'clmm' | 'router' = 'amm',
  ): Promise<string | null> {
    // PulseX only supports AMM (V2)
    if (type !== 'amm') {
      logger.warn(`PulseX only supports AMM (V2) pools, requested: ${type}`);
      return null;
    }

    const baseTokenInfo = await this.getToken(baseToken);
    const quoteTokenInfo = await this.getToken(quoteToken);

    if (!baseTokenInfo || !quoteTokenInfo) {
      logger.error(`Tokens not found: ${baseToken}, ${quoteToken}`);
      return null;
    }

    // Create SDK tokens
    const baseToken_sdk = new Token(
      this.chainId,
      baseTokenInfo.address as `0x${string}`,
      baseTokenInfo.decimals,
      baseTokenInfo.symbol,
      baseTokenInfo.name,
    );
    const quoteToken_sdk = new Token(
      this.chainId,
      quoteTokenInfo.address as `0x${string}`,
      quoteTokenInfo.decimals,
      quoteTokenInfo.symbol,
      quoteTokenInfo.name,
    );

    try {
      // Get pair address from factory
      const pairAddress = await this.v2Factory.getPair(
        baseTokenInfo.address as `0x${string}`,
        quoteTokenInfo.address as `0x${string}`,
      );

      if (pairAddress === constants.AddressZero) {
        logger.warn(`No V2 pool found for ${baseToken}/${quoteToken}`);
        return null;
      }

      // Check if pool is valid
      const isValid = await isValidV2Pool(
        this.pulsechain,
        baseTokenInfo.address as `0x${string}`,
        quoteTokenInfo.address as `0x${string}`,
        pairAddress,
      );

      if (!isValid) {
        logger.warn(`Pool ${pairAddress} is invalid or has no liquidity`);
        return null;
      }

      logger.info(`Found valid pool: ${pairAddress} for ${baseToken}-${quoteToken}`);
      return pairAddress;
    } catch (error) {
      logger.error(`Error finding pool: ${error.message}`);
      return null;
    }
  }

  public async getFirstWalletAddress(): Promise<string | null> {
    try {
      return await PulseChain.getFirstWalletAddress();
    } catch (error) {
      logger.error(`Error getting first wallet address: ${error.message}`);
      return null;
    }
  }

  public async close(): Promise<void> {
    this._ready = false;
    if (this.networkName in PulseX._instances) {
      delete PulseX._instances[this.networkName];
    }
    logger.info(`PulseX connector closed for network: ${this.networkName}`);
  }
}
