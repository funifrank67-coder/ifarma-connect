export type Role = 'farmer' | 'buyer' | 'coordinator'
export type Channel = 'App' | 'SMS' | 'WhatsApp' | 'Coordinator'
export type ProduceType = 'cabbage' | 'spinach' | 'tomatoes' | 'potatoes'

export type VerificationStatus =
  | 'Unverified'
  | 'Pending review'
  | 'Verified'
  | 'Needs more information'
  | 'Rejected'

export type ConnectionStatus =
  | 'Requested'
  | 'Matched'
  | 'Confirmed'
  | 'Collected'
  | 'Sale Completed'
  | 'Expired'
  | 'Cancelled'
  | 'Shortfall'

export type RegistrationType = 'self' | 'coordinator'

export interface VerificationRecord {
  currentStep: 1 | 2 | 3 | 4
  idType?: 'sa-id' | 'passport' | 'asylum-permit'
  maskedId?: string
  idHash?: string
  idConsent?: boolean
  identityNote?: string
  farmingLocation?: string
  produceGrown?: ProduceType[]
  landSizeHa?: number
  proofMethods?: Array<'farm visit' | 'extension officer' | 'photo evidence'>
  farmingNote?: string
  optionalDocs?: string[]
  reviewerName?: string
  reviewerDecision?: 'Approve' | 'Reject' | 'Request more information'
  reviewerNote?: string
  reviewedAt?: string
}

// Core app data schema used across registration, matching, lifecycle and dashboard attribution.
export interface User {
  id: string
  role: Role
  name: string
  phone: string
  pinHash: string // Demo-only simple hash. This is not secure authentication.
  village: string
  channel: Channel
  registrationType: RegistrationType
  verificationStatus: VerificationStatus
  verification: VerificationRecord
  farmSizeHa?: number
  produceGrown?: ProduceType[]
  cooperativeName?: string
  consentShareContacts?: boolean
  businessType?: string
  weeklyVolumeKg?: number
  deliveryPreference?: 'Collection' | 'Delivery'
  createdByCoordinatorId?: string
}

export interface Listing {
  id: string
  farmerId: string
  produce: ProduceType
  kgAvailable: number
  pricePerKg: number
  readyDate: string
  createdAt: string
}

export interface Order {
  id: string
  buyerId: string
  produce: ProduceType
  kgRequested: number
  requiredDate: string
  deliveryPreference: 'Collection' | 'Delivery'
  location: string
  status: ConnectionStatus
  sourceChannel: Channel
  createdAt: string
}

export interface Connection {
  id: string
  orderId: string
  listingId: string
  farmerId: string
  buyerId: string
  kgCommitted: number
  kgDelivered: number
  agreedPricePerKg: number
  status: ConnectionStatus
  sourceChannel: Channel
  lostReason?:
    | 'shortfall'
    | 'late harvest'
    | 'price disagreement'
    | 'transport'
    | 'buyer cancelled'
    | 'farmer not verified'
  timestamps: Partial<Record<ConnectionStatus, string>>
  registrationTypeOfFarmer: RegistrationType
  verificationStatusAtMatch: VerificationStatus
}

export interface PendingChange {
  id: string
  entity: 'user' | 'listing' | 'order' | 'connection' | 'verification'
  action: 'create' | 'update' | 'delete'
  createdAt: string
  synced: boolean
}

export interface AppData {
  users: User[]
  listings: Listing[]
  orders: Order[]
  connections: Connection[]
  pendingQueue: PendingChange[]
  seededAt: string
}
