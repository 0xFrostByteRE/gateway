import { Type, Static } from '@sinclair/typebox';

import { getPulseChainChainConfig, networks as PulseChainNetworks } from './pulsechain.config';

// Get chain config for defaults
const pulsechainChainConfig = getPulseChainChainConfig();

// Example values
const EXAMPLE_TX_HASH = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
const EXAMPLE_BALANCE_TOKENS = ['PLS', 'USDC', 'WPLS'];
const EXAMPLE_ALLOWANCE_TOKENS = ['USDC', 'WPLS'];
const EXAMPLE_AMOUNT = '0.01';
const EXAMPLE_SPENDER = 'pulsex/amm';

// Network parameter with proper defaults and enum
export const PulseChainNetworkParameter = Type.Optional(
  Type.String({
    description: 'The PulseChain network to use',
    default: pulsechainChainConfig.defaultNetwork,
    enum: PulseChainNetworks,
  }),
);

// Address parameter with proper defaults
export const PulseChainAddressParameter = Type.Optional(
  Type.String({
    description: 'PulseChain wallet address',
    default: pulsechainChainConfig.defaultWallet,
  }),
);

// Status request schema
export const PulseChainStatusRequest = Type.Object({
  network: PulseChainNetworkParameter,
});

// Balance request schema
export const PulseChainBalanceRequest = Type.Object({
  network: PulseChainNetworkParameter,
  address: PulseChainAddressParameter,
  tokens: Type.Optional(
    Type.Array(Type.String(), {
      description:
        'A list of token symbols (PLS, USDC, WPLS) or token addresses. Both formats are accepted and will be automatically detected. An empty array is treated the same as if the parameter was not provided, returning only non-zero balances (with the exception of PLS).',
      examples: [EXAMPLE_BALANCE_TOKENS],
    }),
  ),
});

// Estimate gas request schema
export const PulseChainEstimateGasRequest = Type.Object({
  network: PulseChainNetworkParameter,
});

// Poll request schema - map signature to txHash for PulseChain
export const PulseChainPollRequest = Type.Object({
  network: PulseChainNetworkParameter,
  signature: Type.String({
    description: 'Transaction hash to poll',
    examples: [EXAMPLE_TX_HASH],
  }),
});

// Allowances request schema (multiple tokens)
export const AllowancesRequestSchema = Type.Object({
  network: PulseChainNetworkParameter,
  address: PulseChainAddressParameter,
  spender: Type.String({
    description: 'Connector name (e.g., pulsex/amm) or contract address',
    examples: [EXAMPLE_SPENDER],
  }),
  tokens: Type.Array(Type.String(), {
    description: 'Array of token symbols or addresses',
    examples: [EXAMPLE_ALLOWANCE_TOKENS],
  }),
});

// Allowances response schema
export const AllowancesResponseSchema = Type.Object({
  spender: Type.String(),
  approvals: Type.Record(Type.String(), Type.String()),
});

// Approve request schema
export const ApproveRequestSchema = Type.Object({
  network: PulseChainNetworkParameter,
  address: PulseChainAddressParameter,
  spender: Type.String({
    description: 'Connector name (e.g., pulsex/amm) contract address',
    examples: [EXAMPLE_SPENDER],
  }),
  token: Type.String({
    description: 'Token symbol or address',
    examples: [EXAMPLE_ALLOWANCE_TOKENS[0]],
  }),
  amount: Type.Optional(
    Type.String({
      description: 'The amount to approve. If not provided, defaults to maximum amount (unlimited approval).',
      default: '',
    }),
  ),
});

// Approve response schema
export const ApproveResponseSchema = Type.Object({
  signature: Type.String(),
  status: Type.Number({ description: 'TransactionStatus enum value' }),

  // Only included when status = CONFIRMED
  data: Type.Optional(
    Type.Object({
      tokenAddress: Type.String(),
      spender: Type.String(),
      amount: Type.String(),
      nonce: Type.Number(),
      fee: Type.String(),
    }),
  ),
});

// Wrap request schema
export const WrapRequestSchema = Type.Object({
  network: PulseChainNetworkParameter,
  address: PulseChainAddressParameter,
  amount: Type.String({
    description: 'The amount of native token to wrap (e.g., PLS)',
    examples: [EXAMPLE_AMOUNT],
  }),
});

// Wrap response schema
export const WrapResponseSchema = Type.Object({
  signature: Type.String(),
  status: Type.Number({ description: 'TransactionStatus enum value' }),

  // Only included when status = CONFIRMED
  data: Type.Optional(
    Type.Object({
      nonce: Type.Number(),
      fee: Type.String(),
      amount: Type.String(),
      wrappedAddress: Type.String(),
      nativeToken: Type.String(),
      wrappedToken: Type.String(),
    }),
  ),
});

// Unwrap request schema
export const UnwrapRequestSchema = Type.Object({
  network: PulseChainNetworkParameter,
  address: PulseChainAddressParameter,
  amount: Type.String({
    description: 'The amount of wrapped token to unwrap (e.g., WPLS)',
    examples: [EXAMPLE_AMOUNT],
  }),
});

// Unwrap response schema
export const UnwrapResponseSchema = Type.Object({
  signature: Type.String(),
  status: Type.Number({ description: 'TransactionStatus enum value' }),

  // Only included when status = CONFIRMED
  data: Type.Optional(
    Type.Object({
      nonce: Type.Number(),
      fee: Type.String(),
      amount: Type.String(),
      wrappedAddress: Type.String(),
      nativeToken: Type.String(),
      wrappedToken: Type.String(),
    }),
  ),
});

// Type exports
export type AllowancesRequestType = Static<typeof AllowancesRequestSchema>;
export type AllowancesResponseType = Static<typeof AllowancesResponseSchema>;
export type ApproveRequestType = Static<typeof ApproveRequestSchema>;
export type ApproveResponseType = Static<typeof ApproveResponseSchema>;
export type WrapRequestType = Static<typeof WrapRequestSchema>;
export type WrapResponseType = Static<typeof WrapResponseSchema>;
export type UnwrapRequestType = Static<typeof UnwrapRequestSchema>;
export type UnwrapResponseType = Static<typeof UnwrapResponseSchema>;
