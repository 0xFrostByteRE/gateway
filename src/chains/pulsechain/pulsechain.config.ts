import { ConfigManagerV2 } from '../../services/config-manager-v2';

import { getAvailablePulseChainNetworks } from './pulsechain.utils';

export interface PulseChainNetworkConfig {
  chainID: number;
  nodeURL: string;
  nativeCurrencySymbol: string;
  geckoId: string;
  swapProvider?: string;
  gasPrice?: number | null;
  baseFee?: number | null;
  priorityFee?: number | null;
  baseFeeMultiplier?: number;
  transactionExecutionTimeoutMs?: number;
}

export interface PulseChainChainConfig {
  defaultNetwork: string;
  defaultWallet: string;
  rpcProvider: string;
}

// Export available networks
export const networks = getAvailablePulseChainNetworks();

export function getPulseChainNetworkConfig(network: string): PulseChainNetworkConfig {
  const namespaceId = `pulsechain-${network}`;
  return {
    chainID: ConfigManagerV2.getInstance().get(namespaceId + '.chainID'),
    nodeURL: ConfigManagerV2.getInstance().get(namespaceId + '.nodeURL'),
    nativeCurrencySymbol: ConfigManagerV2.getInstance().get(namespaceId + '.nativeCurrencySymbol'),
    geckoId: ConfigManagerV2.getInstance().get(namespaceId + '.geckoId'),
    swapProvider: ConfigManagerV2.getInstance().get(namespaceId + '.swapProvider'),
    gasPrice: ConfigManagerV2.getInstance().get(namespaceId + '.gasPrice'),
    baseFee: ConfigManagerV2.getInstance().get(namespaceId + '.baseFee'),
    priorityFee: ConfigManagerV2.getInstance().get(namespaceId + '.priorityFee'),
    baseFeeMultiplier: ConfigManagerV2.getInstance().get(namespaceId + '.baseFeeMultiplier'),
    transactionExecutionTimeoutMs: ConfigManagerV2.getInstance().get(namespaceId + '.transactionExecutionTimeoutMs'),
  };
}

export function getPulseChainChainConfig(): PulseChainChainConfig {
  return {
    defaultNetwork: ConfigManagerV2.getInstance().get('pulsechain.defaultNetwork'),
    defaultWallet: ConfigManagerV2.getInstance().get('pulsechain.defaultWallet'),
    rpcProvider: ConfigManagerV2.getInstance().get('pulsechain.rpcProvider') || 'url',
  };
}
