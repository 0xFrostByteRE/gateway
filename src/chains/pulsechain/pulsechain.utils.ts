import * as fs from 'fs';
import * as path from 'path';

import { rootPath } from '../../paths';

// Utility functions for PulseChain chain

// Validates if the input string is a valid PulseChain address (Ethereum format)
export const isAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Get available PulseChain networks from template files
export const getAvailablePulseChainNetworks = (): string[] => {
  const networksPath = path.join(rootPath(), 'dist/src/templates/chains/pulsechain');

  try {
    const files = fs.readdirSync(networksPath);
    return files.filter((file) => file.endsWith('.yml')).map((file) => file.replace('.yml', ''));
  } catch (error) {
    // Fallback to hardcoded list if directory doesn't exist
    return ['pulsechain'];
  }
};
