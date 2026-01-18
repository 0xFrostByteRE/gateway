import { FastifyPluginAsync, FastifyInstance } from 'fastify';

import { BalanceRequestType, BalanceResponseType, BalanceResponseSchema } from '../../../schemas/chain-schema';
import { logger } from '../../../services/logger';
import { PulseChain } from '../pulsechain';
import { PulseChainBalanceRequest } from '../schemas';

export async function getPulseChainBalances(
  fastify: FastifyInstance,
  network: string,
  address: string,
  tokens?: string[],
): Promise<BalanceResponseType> {
  try {
    const pulsechain = await PulseChain.getInstance(network);
    const balances = await pulsechain.getBalances(address, tokens);
    return { balances };
  } catch (error) {
    logger.error(`Error getting balances: ${error.message}`);
    throw fastify.httpErrors.internalServerError(`Failed to get balances: ${error.message}`);
  }
}

export const balancesRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: BalanceRequestType;
    Reply: BalanceResponseType;
  }>(
    '/balances',
    {
      schema: {
        description:
          'Get PulseChain balances. If no tokens specified or empty array provided, returns native token (PLS) and only non-zero balances for tokens from the token list. If specific tokens are requested, returns those exact tokens with their balances, including zeros.',
        tags: ['/chain/pulsechain'],
        body: PulseChainBalanceRequest,
        response: {
          200: BalanceResponseSchema,
        },
      },
    },
    async (request) => {
      const { network, address, tokens } = request.body;
      return await getPulseChainBalances(fastify, network, address, tokens);
    },
  );
};

export default balancesRoute;
