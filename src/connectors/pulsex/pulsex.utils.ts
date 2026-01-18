import { Token, CurrencyAmount, Percent } from '@pancakeswap/sdk';
import { Pair as V2Pair } from '@pancakeswap/v2-sdk';
import { Contract } from 'ethers';

import { PulseChain } from '../../chains/pulsechain/pulsechain';
import { logger } from '../../services/logger';

import { PulseX } from './pulsex';
import { IPulseXV2PairABI } from './pulsex.contracts';

/**
 * Check if a string is a valid fraction (in the form of 'a/b')
 * @param value The string to check
 * @returns True if the string is a valid fraction, false otherwise
 */
export function isFractionString(value: string): boolean {
  return value.includes('/') && value.split('/').length === 2;
}

/**
 * Determine if a pool address is a valid PulseX V2 pool
 * @param pulsechain PulseChain instance
 * @param tokenAAddress Address of token A
 * @param tokenBAddress Address of token B
 * @param poolAddress The pool address to check
 * @returns True if the address is a valid PulseX V2 pool, false otherwise
 */
export const isValidV2Pool = async (
  pulsechain: PulseChain,
  tokenAAddress: string,
  tokenBAddress: string,
  poolAddress: string,
): Promise<boolean> => {
  try {
    // Check if the pool address is a valid contract
    const pairContract = new Contract(poolAddress, IPulseXV2PairABI.abi, pulsechain.provider);

    // Get token0 and token1 from the pair
    const token0 = await pairContract.token0();
    const token1 = await pairContract.token1();

    // Check if the tokens in the pair match the expected tokens
    const token0Lower = token0.toLowerCase();
    const token1Lower = token1.toLowerCase();
    const tokenALower = tokenAAddress.toLowerCase();
    const tokenBLower = tokenBAddress.toLowerCase();

    if (
      !(
        (token0Lower === tokenALower && token1Lower === tokenBLower) ||
        (token0Lower === tokenBLower && token1Lower === tokenALower)
      )
    ) {
      logger.warn(`Pool ${poolAddress} does not contain tokens ${tokenAAddress} and ${tokenBAddress}`);
      return false;
    }

    // Check if the pool has liquidity
    const reserves = await pairContract.getReserves();
    const reserve0 = reserves[0];
    const reserve1 = reserves[1];

    if (reserve0.isZero() || reserve1.isZero()) {
      logger.warn(`Pool ${poolAddress} has zero reserves`);
      return false;
    }

    logger.info(`Pool ${poolAddress} is valid with reserves: ${reserve0.toString()}, ${reserve1.toString()}`);
    return true;
  } catch (error) {
    logger.error(`Error checking V2 pool validity: ${error.message}`);
    return false;
  }
};

/**
 * Format a raw token amount to human-readable format
 * @param rawAmount Raw amount as string
 * @param decimals Number of decimals for the token
 * @returns Formatted amount as number
 */
export function formatTokenAmount(rawAmount: string, decimals: number): number {
  try {
    const amount = BigInt(rawAmount);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === BigInt(0)) {
      return Number(integerPart);
    }

    // Convert to number with proper decimal places
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const fullNumber = integerPart.toString() + '.' + fractionalStr;
    return parseFloat(fullNumber);
  } catch (error) {
    logger.error(`Error formatting token amount: ${error.message}`);
    return 0;
  }
}

/**
 * Get information about a PulseX V2 pool
 * @param poolAddress The pool address
 * @param network The network name
 * @param type The pool type (always 'amm' for PulseX)
 * @returns Pool information object
 */
export async function getPulseXPoolInfo(
  poolAddress: string,
  network: string,
  type: 'amm' | 'clmm' | 'router' = 'amm',
): Promise<{
  baseTokenSymbol: string;
  quoteTokenSymbol: string;
  baseTokenAddress: string;
  quoteTokenAddress: string;
  feePct: number;
  address: string;
} | null> {
  try {
    // PulseX only supports AMM (V2)
    if (type !== 'amm') {
      logger.warn(`PulseX only supports AMM (V2) pools, requested: ${type}`);
      return null;
    }

    const pulsechain = await PulseChain.getInstance(network);
    await pulsechain.init();

    const pulsex = await PulseX.getInstance(network);

    // Get pool contract
    const pairContract = new Contract(poolAddress, IPulseXV2PairABI.abi, pulsechain.provider);

    // Get token addresses from the pair
    const token0Address = await pairContract.token0();
    const token1Address = await pairContract.token1();

    // Get token info
    const token0Info = await pulsechain.getToken(token0Address);
    const token1Info = await pulsechain.getToken(token1Address);

    if (!token0Info || !token1Info) {
      logger.error(`Could not find token info for pool ${poolAddress}`);
      return null;
    }

    // PulseX V2 pools have a fixed fee of 0.3%
    const feePct = 0.3;

    return {
      baseTokenSymbol: token0Info.symbol,
      quoteTokenSymbol: token1Info.symbol,
      baseTokenAddress: token0Address,
      quoteTokenAddress: token1Address,
      feePct,
      address: poolAddress,
    };
  } catch (error) {
    logger.error(`Error getting PulseX pool info: ${error.message}`);
    return null;
  }
}

/**
 * Create a slippage tolerance percentage object
 * @param slippagePct Slippage percentage (e.g., 1 for 1%)
 * @returns Percent object for the SDK
 */
export function createSlippageTolerance(slippagePct: number): Percent {
  return new Percent(Math.floor(slippagePct * 100), 10000);
}

/**
 * Parse a token amount to raw units
 * @param amount Human-readable amount
 * @param decimals Token decimals
 * @returns Raw amount as string
 */
export function parseTokenAmount(amount: number, decimals: number): string {
  const amountStr = amount.toFixed(decimals);
  const [integerPart, fractionalPart] = amountStr.split('.');
  const fractional = fractionalPart || '';
  const paddedFractional = fractional.padEnd(decimals, '0');
  return integerPart + paddedFractional;
}
