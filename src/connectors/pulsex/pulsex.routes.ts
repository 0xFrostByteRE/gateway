import sensible from '@fastify/sensible';
import { FastifyPluginAsync } from 'fastify';

// Import routes
import { pulsexAmmRoutes } from './amm-routes';

// AMM routes (PulseX V2)
const pulsexAmmRoutesWrapper: FastifyPluginAsync = async (fastify) => {
  await fastify.register(sensible);

  await fastify.register(async (instance) => {
    instance.addHook('onRoute', (routeOptions) => {
      if (routeOptions.schema && routeOptions.schema.tags) {
        routeOptions.schema.tags = ['/connector/pulsex'];
      }
    });

    await instance.register(pulsexAmmRoutes);
  });
};

// Export routes in the same pattern as other connectors
export const pulsexRoutes = {
  amm: pulsexAmmRoutesWrapper,
};

export default pulsexRoutes;
