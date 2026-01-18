import { FastifyPluginAsync } from 'fastify';

import { StatusRequestType, StatusResponseType, StatusResponseSchema } from '../../../schemas/chain-schema';
import { logger } from '../../../services/logger';
import { PulseChain } from '../pulsechain';
import { getPulseChainChainConfig } from '../pulsechain.config';
import { PulseChainStatusRequest } from '../schemas';

export async function getEthereumStatus(network: string): Promise<StatusResponseType> {
  try {
    const pulsechain = await PulseChain.getInstance(network);
    const chainConfig = getPulseChainChainConfig();
    const chain = 'pulsechain';
    const rpcProvider = chainConfig.rpcProvider || 'url';

    // Get the actual RPC URL based on provider
    let rpcUrl = pulsechain.rpcUrl; // Default to standard rpcUrl
    if (rpcProvider === 'infura') {
      const infuraService = pulsechain.getInfuraService();
      if (infuraService) {
        try {
          rpcUrl = infuraService.getHttpUrl();
        } catch (error) {
          // If Infura URL generation fails, fall back to standard rpcUrl
          logger.warn(`Failed to get Infura URL, using standard rpcUrl: ${error.message}`);
        }
      }
    }

    const nativeCurrency = pulsechain.nativeTokenSymbol;

    // Directly try to get the current block number with a timeout
    let currentBlockNumber = 0;
    try {
      // Set up a timeout promise to prevent hanging on unresponsive nodes
      const blockPromise = pulsechain.provider.getBlockNumber();
      const timeoutPromise = new Promise<number>((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), 5000);
      });

      // Race the block request against the timeout
      currentBlockNumber = await Promise.race([blockPromise, timeoutPromise]);
    } catch (blockError) {
      logger.warn(`Failed to get block number: ${blockError.message}`);
      // Continue with default block number
    }

    return {
      chain,
      network,
      rpcUrl,
      rpcProvider,
      currentBlockNumber,
      nativeCurrency,
      swapProvider: pulsechain.swapProvider,
    };
  } catch (error) {
    logger.error(`Error getting PulseChain status: ${error.message}`);
    throw new Error(`Failed to get PulseChain status: ${error.message}`);
  }
}

export const statusRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: StatusRequestType;
    Reply: StatusResponseType;
  }>(
    '/status',
    {
      schema: {
        description: 'Get PulseChain chain status',
        tags: ['/chain/pulsechain'],
        querystring: PulseChainStatusRequest,
        response: {
          200: StatusResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { network } = request.query;
      try {
        // This will handle node timeout internally
        return await getEthereumStatus(network);
      } catch (error) {
        // This will catch any other unexpected errors
        logger.error(`Error in PulseChain status endpoint: ${error.message}`);
        reply.status(500);
        // Return a minimal valid response
        return {
          chain: 'pulsechain',
          network,
          rpcUrl: 'unavailable',
          rpcProvider: 'unavailable',
          currentBlockNumber: 0,
          nativeCurrency: 'ETH',
          swapProvider: '',
        };
      }
    },
  );
};

export default statusRoute;
