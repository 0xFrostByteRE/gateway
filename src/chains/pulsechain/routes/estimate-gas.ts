import { FastifyPluginAsync, FastifyInstance } from 'fastify';

import { EstimateGasRequestType, EstimateGasResponse, EstimateGasResponseSchema } from '../../../schemas/chain-schema';
import { logger } from '../../../services/logger';
import { PulseChain } from '../pulsechain';
import { PulseChainEstimateGasRequest } from '../schemas';

export async function estimateGasEthereum(fastify: FastifyInstance, network: string): Promise<EstimateGasResponse> {
  try {
    const pulsechain = await PulseChain.getInstance(network);

    // Get gas price in GWEI (this already includes fallback to minGasPrice)
    const gasPrice = await pulsechain.estimateGasPrice();

    // Default gas limit for PulseChain is 300000
    const DEFAULT_GAS_LIMIT = 300000;

    // Calculate total fee in GWEI
    const totalFeeInGwei = gasPrice * DEFAULT_GAS_LIMIT;

    // Convert GWEI to ETH (1 ETH = 10^9 GWEI)
    const totalFeeInEth = totalFeeInGwei / 1e9;

    // Check if we have EIP-1559 data cached
    const isEIP1559Network =
      network === 'mainnet' ||
      network === 'polygon' ||
      network === 'arbitrum' ||
      network === 'optimism' ||
      network === 'base';

    const response: EstimateGasResponse = {
      feePerComputeUnit: gasPrice,
      denomination: 'gwei',
      computeUnits: DEFAULT_GAS_LIMIT,
      feeAsset: pulsechain.nativeTokenSymbol,
      fee: totalFeeInEth,
      timestamp: Date.now(),
    };

    // Add EIP-1559 details if available
    if (isEIP1559Network && (pulsechain as any).constructor.lastGasPriceEstimate?.isEIP1559) {
      const cached = (pulsechain as any).constructor.lastGasPriceEstimate;
      response.gasType = 'eip1559';
      response.maxFeePerGas = cached.maxFeePerGas;
      response.maxPriorityFeePerGas = cached.maxPriorityFeePerGas;
    } else if (!isEIP1559Network) {
      response.gasType = 'legacy';
    }

    return response;
  } catch (error) {
    logger.error(`Error estimating gas for network ${network}: ${error.message}`);

    // Check if it's a network/RPC error
    if (error.message?.includes('RPC') || error.message?.includes('network') || error.message?.includes('provider')) {
      throw fastify.httpErrors.serviceUnavailable(`RPC provider unavailable for network ${network}: ${error.message}`);
    }

    // Check if it's an invalid network
    if (
      error.message?.includes('Invalid') ||
      error.message?.includes('not found') ||
      error.message?.includes('Unsupported')
    ) {
      throw fastify.httpErrors.badRequest(`Invalid network ${network}: ${error.message}`);
    }

    // Generic error
    throw fastify.httpErrors.internalServerError(`Failed to estimate gas for network ${network}: ${error.message}`);
  }
}

export const estimateGasRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: EstimateGasRequestType;
    Reply: EstimateGasResponse;
  }>(
    '/estimate-gas',
    {
      schema: {
        description: 'Estimate gas prices for PulseChain transactions',
        tags: ['/chain/pulsechain'],
        querystring: PulseChainEstimateGasRequest,
        response: {
          200: EstimateGasResponseSchema,
        },
      },
    },
    async (request) => {
      const { network } = request.query;
      return await estimateGasEthereum(fastify, network);
    },
  );
};

export default estimateGasRoute;
