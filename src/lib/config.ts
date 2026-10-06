export const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}` | undefined) ??
  '0x8DFc1aFE0542bb399756fa9E5BA89992E7B53a85'

// Browser reads/state checks stay same-origin to avoid direct StudioNet CORS/rate-limit failures.
export const STUDIO_RPC =
  typeof window !== 'undefined'
    ? `${window.location.origin}/genlayer-rpc`
    : '/genlayer-rpc'

// MetaMask needs the real public RPC when adding the network.
export const STUDIO_WALLET_RPC = 'https://studio.genlayer.com/api'
export const STUDIO_CHAIN_ID_HEX = '0xf22f'
export const STUDIO_CHAIN_ID_DECIMAL = 61999
export const STUDIO_CHAIN_NAME = 'Genlayer Studio Network'
export const EXPLORER_BASE = 'https://explorer-studio.genlayer.com'
