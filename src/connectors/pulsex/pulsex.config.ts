import { getAvailablePulseChainNetworks } from '../../chains/pulsechain/pulsechain.utils';
import { AvailableNetworks } from '../../services/base';
import { ConfigManagerV2 } from '../../services/config-manager-v2';

export namespace PulseXConfig {
  // Supported networks for PulseX
  export const chain = 'pulsechain';
  export const networks = getAvailablePulseChainNetworks();
  export type Network = string;

  // Supported trading types (PulseX is Uniswap V2 fork)
  export const tradingTypes = ['amm'] as const;

  export interface RootConfig {
    // Global configuration
    slippagePct: number;
    maximumHops: number;

    // Available networks
    availableNetworks: Array<AvailableNetworks>;
  }

  export const config: RootConfig = {
    slippagePct: ConfigManagerV2.getInstance().get('pulsex.slippagePct') || 2,
    maximumHops: ConfigManagerV2.getInstance().get('pulsex.maximumHops') || 4,

    availableNetworks: [
      {
        chain,
        networks: networks,
      },
    ],
  };
}
