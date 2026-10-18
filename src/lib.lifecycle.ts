import type { ConnectionStatus } from './types'

const allowedTransitions: Record<ConnectionStatus, ConnectionStatus[]> = {
  Requested: ['Matched', 'Expired', 'Cancelled', 'Shortfall'],
  Matched: ['Confirmed', 'Cancelled', 'Shortfall'],
  Confirmed: ['Collected', 'Cancelled'],
  Collected: ['Sale Completed', 'Cancelled'],
  'Sale Completed': [],
  Expired: [],
  Cancelled: [],
  Shortfall: [],
}

// Central lifecycle validator so UI and dashboard attribution share one rule set.
export const canTransition = (
  current: ConnectionStatus,
  next: ConnectionStatus,
): boolean => allowedTransitions[current].includes(next)
