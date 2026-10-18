import type { Channel, Connection, Listing, Order, User } from './types'

export interface ExcludedListingReason {
  listing: Listing
  farmer?: User
  reason:
    | 'farmer not verified'
    | 'late harvest'
    | 'wrong produce'
    | 'no stock'
    | 'unknown farmer'
}

export interface MatchResult {
  selected: Array<{ listing: Listing; farmer: User; kgCommitted: number }>
  excluded: ExcludedListingReason[]
  totalEligibleKg: number
  shortfallKg: number
  canFulfil: boolean
}

// Matching logic: same produce, verified farmers, ready by date, stock > 0, then sort by price then readiness.
export const runMatching = (
  order: Order,
  listings: Listing[],
  users: User[],
): MatchResult => {
  const excluded: ExcludedListingReason[] = []

  const eligible = listings
    .map((listing) => {
      const farmer = users.find((user) => user.id === listing.farmerId)
      if (!farmer) {
        excluded.push({ listing, reason: 'unknown farmer' })
        return null
      }
      if (listing.produce !== order.produce) {
        excluded.push({ listing, farmer, reason: 'wrong produce' })
        return null
      }
      if (listing.kgAvailable <= 0) {
        excluded.push({ listing, farmer, reason: 'no stock' })
        return null
      }
      if (farmer.verificationStatus !== 'Verified') {
        excluded.push({ listing, farmer, reason: 'farmer not verified' })
        return null
      }
      if (new Date(listing.readyDate) > new Date(order.requiredDate)) {
        excluded.push({ listing, farmer, reason: 'late harvest' })
        return null
      }
      return { listing, farmer }
    })
    .filter(Boolean) as Array<{ listing: Listing; farmer: User }>

  eligible.sort((a, b) => {
    if (a.listing.pricePerKg !== b.listing.pricePerKg) {
      return a.listing.pricePerKg - b.listing.pricePerKg
    }
    return (
      new Date(a.listing.readyDate).getTime() - new Date(b.listing.readyDate).getTime()
    )
  })

  let remaining = order.kgRequested
  const selected: Array<{ listing: Listing; farmer: User; kgCommitted: number }> = []

  for (const item of eligible) {
    if (remaining <= 0) break
    const commit = Math.min(remaining, item.listing.kgAvailable)
    if (commit > 0) {
      selected.push({ ...item, kgCommitted: commit })
      remaining -= commit
    }
  }

  const totalEligibleKg = eligible.reduce((sum, item) => sum + item.listing.kgAvailable, 0)

  return {
    selected,
    excluded,
    totalEligibleKg,
    shortfallKg: Math.max(remaining, 0),
    canFulfil: remaining <= 0,
  }
}

// One connection per contributing listing/farmer from an order.
export const buildConnectionsFromMatch = (
  order: Order,
  matches: MatchResult,
  channel: Channel,
): Connection[] =>
  matches.selected.map((match) => ({
    id: `conn-${order.id}-${match.listing.id}`,
    orderId: order.id,
    listingId: match.listing.id,
    farmerId: match.farmer.id,
    buyerId: order.buyerId,
    kgCommitted: match.kgCommitted,
    kgDelivered: 0,
    agreedPricePerKg: match.listing.pricePerKg,
    status: 'Matched',
    sourceChannel: channel,
    timestamps: {
      Requested: order.createdAt,
      Matched: new Date().toISOString(),
    },
    registrationTypeOfFarmer: match.farmer.registrationType,
    verificationStatusAtMatch: match.farmer.verificationStatus,
  }))
