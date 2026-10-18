import type { AppData, Connection, Listing, Order, User } from './types'
import { demoHash } from './lib.validation'

const dayOffset = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const users = (): User[] => [
  {
    id: 'coord-1',
    role: 'coordinator',
    name: 'Noluthando Mbeki',
    phone: '071 000 0001',
    pinHash: demoHash('1111'),
    village: 'Ngcobo Central',
    channel: 'Coordinator',
    registrationType: 'self',
    verificationStatus: 'Verified',
    verification: { currentStep: 4, reviewerDecision: 'Approve' },
  },
  {
    id: 'farmer-1',
    role: 'farmer',
    name: 'Bongani M',
    phone: '071 000 0101',
    pinHash: demoHash('1234'),
    village: 'Qamata',
    channel: 'App',
    registrationType: 'self',
    verificationStatus: 'Verified',
    verification: { currentStep: 4, reviewerDecision: 'Approve' },
    farmSizeHa: 2,
    produceGrown: ['cabbage', 'spinach'],
    consentShareContacts: true,
  },
  {
    id: 'farmer-2',
    role: 'farmer',
    name: 'Nomusa T',
    phone: '071 000 0102',
    pinHash: demoHash('1234'),
    village: 'Nondweni',
    channel: 'SMS',
    registrationType: 'self',
    verificationStatus: 'Verified',
    verification: { currentStep: 4, reviewerDecision: 'Approve' },
    farmSizeHa: 1.5,
    produceGrown: ['cabbage', 'tomatoes'],
    consentShareContacts: true,
  },
  {
    id: 'farmer-3',
    role: 'farmer',
    name: 'Liyema G',
    phone: '071 000 0103',
    pinHash: demoHash('1234'),
    village: 'Mthombe',
    channel: 'WhatsApp',
    registrationType: 'coordinator',
    verificationStatus: 'Verified',
    verification: { currentStep: 4, reviewerDecision: 'Approve' },
    createdByCoordinatorId: 'coord-1',
    farmSizeHa: 1,
    produceGrown: ['cabbage', 'potatoes'],
    consentShareContacts: true,
  },
  {
    id: 'farmer-4',
    role: 'farmer',
    name: 'Aphiwe D',
    phone: '071 000 0104',
    pinHash: demoHash('1234'),
    village: 'Bityi',
    channel: 'App',
    registrationType: 'self',
    verificationStatus: 'Verified',
    verification: { currentStep: 4, reviewerDecision: 'Approve' },
    farmSizeHa: 3,
    produceGrown: ['spinach', 'potatoes'],
    consentShareContacts: true,
  },
  {
    id: 'farmer-5',
    role: 'farmer',
    name: 'Sive P',
    phone: '071 000 0105',
    pinHash: demoHash('1234'),
    village: 'Qunu',
    channel: 'SMS',
    registrationType: 'coordinator',
    verificationStatus: 'Pending review',
    verification: { currentStep: 4 },
    createdByCoordinatorId: 'coord-1',
    farmSizeHa: 1.2,
    produceGrown: ['cabbage'],
    consentShareContacts: true,
  },
  {
    id: 'farmer-6',
    role: 'farmer',
    name: 'Thobile R',
    phone: '071 000 0106',
    pinHash: demoHash('1234'),
    village: 'Sakhisizwe',
    channel: 'App',
    registrationType: 'self',
    verificationStatus: 'Unverified',
    verification: { currentStep: 1 },
    farmSizeHa: 0.8,
    produceGrown: ['cabbage'],
    consentShareContacts: true,
  },
  {
    id: 'buyer-1',
    role: 'buyer',
    name: 'Green Basket Market',
    phone: '072 000 0201',
    pinHash: demoHash('1234'),
    village: 'Mthatha',
    channel: 'App',
    registrationType: 'self',
    verificationStatus: 'Verified',
    verification: { currentStep: 4 },
    businessType: 'greengrocer',
    deliveryPreference: 'Collection',
    weeklyVolumeKg: 250,
  },
  {
    id: 'buyer-2',
    role: 'buyer',
    name: 'Sisonke Trader',
    phone: '072 000 0202',
    pinHash: demoHash('1234'),
    village: 'Ngcobo',
    channel: 'WhatsApp',
    registrationType: 'self',
    verificationStatus: 'Verified',
    verification: { currentStep: 4 },
    businessType: 'trader',
    deliveryPreference: 'Collection',
    weeklyVolumeKg: 200,
  },
  {
    id: 'buyer-3',
    role: 'buyer',
    name: 'Ubuntu Kitchen',
    phone: '072 000 0203',
    pinHash: demoHash('1234'),
    village: 'Dutywa',
    channel: 'SMS',
    registrationType: 'self',
    verificationStatus: 'Verified',
    verification: { currentStep: 4 },
    businessType: 'restaurant',
    deliveryPreference: 'Delivery',
    weeklyVolumeKg: 80,
  },
  {
    id: 'buyer-4',
    role: 'buyer',
    name: 'Fresh Hub',
    phone: '072 000 0204',
    pinHash: demoHash('1234'),
    village: 'Komani',
    channel: 'App',
    registrationType: 'self',
    verificationStatus: 'Verified',
    verification: { currentStep: 4 },
    businessType: 'other',
    deliveryPreference: 'Delivery',
    weeklyVolumeKg: 180,
  },
]

const listings = (): Listing[] => [
  // Hero demo listings: exactly 100kg from three verified farmers.
  {
    id: 'listing-cab-50',
    farmerId: 'farmer-1',
    produce: 'cabbage',
    kgAvailable: 50,
    pricePerKg: 8.4,
    readyDate: dayOffset(1),
    createdAt: dayOffset(-3),
  },
  {
    id: 'listing-cab-30',
    farmerId: 'farmer-2',
    produce: 'cabbage',
    kgAvailable: 30,
    pricePerKg: 8.2,
    readyDate: dayOffset(2),
    createdAt: dayOffset(-2),
  },
  {
    id: 'listing-cab-20',
    farmerId: 'farmer-3',
    produce: 'cabbage',
    kgAvailable: 20,
    pricePerKg: 8.8,
    readyDate: dayOffset(2),
    createdAt: dayOffset(-1),
  },
  // Not verified listing should be excluded from matching.
  {
    id: 'listing-cab-unverified',
    farmerId: 'farmer-6',
    produce: 'cabbage',
    kgAvailable: 60,
    pricePerKg: 7.5,
    readyDate: dayOffset(1),
    createdAt: dayOffset(-1),
  },
  // Late listing should be excluded for required dates before readiness.
  {
    id: 'listing-cab-late',
    farmerId: 'farmer-4',
    produce: 'cabbage',
    kgAvailable: 45,
    pricePerKg: 7.9,
    readyDate: dayOffset(8),
    createdAt: dayOffset(-1),
  },
  { id: 'listing-spin-1', farmerId: 'farmer-4', produce: 'spinach', kgAvailable: 15, pricePerKg: 12, readyDate: dayOffset(2), createdAt: dayOffset(-3) },
  { id: 'listing-tom-1', farmerId: 'farmer-2', produce: 'tomatoes', kgAvailable: 80, pricePerKg: 15, readyDate: dayOffset(4), createdAt: dayOffset(-4) },
  { id: 'listing-pot-1', farmerId: 'farmer-3', produce: 'potatoes', kgAvailable: 120, pricePerKg: 9, readyDate: dayOffset(3), createdAt: dayOffset(-5) },
]

const orders = (): Order[] => [
  { id: 'order-seed-1', buyerId: 'buyer-1', produce: 'spinach', kgRequested: 25, requiredDate: dayOffset(3), deliveryPreference: 'Collection', location: 'Ngcobo Taxi Rank', status: 'Requested', sourceChannel: 'App', createdAt: dayOffset(-7) },
  { id: 'order-seed-2', buyerId: 'buyer-2', produce: 'potatoes', kgRequested: 50, requiredDate: dayOffset(4), deliveryPreference: 'Delivery', location: 'Ngcobo Main Road', status: 'Confirmed', sourceChannel: 'WhatsApp', createdAt: dayOffset(-6) },
  { id: 'order-seed-3', buyerId: 'buyer-3', produce: 'tomatoes', kgRequested: 40, requiredDate: dayOffset(1), deliveryPreference: 'Collection', location: 'Mthatha Depot', status: 'Cancelled', sourceChannel: 'SMS', createdAt: dayOffset(-5) },
  { id: 'order-seed-4', buyerId: 'buyer-4', produce: 'cabbage', kgRequested: 70, requiredDate: dayOffset(2), deliveryPreference: 'Collection', location: 'Ngcobo Sports Ground', status: 'Sale Completed', sourceChannel: 'Coordinator', createdAt: dayOffset(-10) },
]

const seedConnections = (): Connection[] => [
  {
    id: 'conn-1', orderId: 'order-seed-4', listingId: 'listing-cab-50', farmerId: 'farmer-1', buyerId: 'buyer-4', kgCommitted: 35, kgDelivered: 35, agreedPricePerKg: 8.5, status: 'Sale Completed', sourceChannel: 'Coordinator', timestamps: { Requested: dayOffset(-10), Matched: dayOffset(-9), Confirmed: dayOffset(-8), Collected: dayOffset(-7), 'Sale Completed': dayOffset(-6) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-2', orderId: 'order-seed-4', listingId: 'listing-cab-30', farmerId: 'farmer-2', buyerId: 'buyer-4', kgCommitted: 20, kgDelivered: 20, agreedPricePerKg: 8.2, status: 'Sale Completed', sourceChannel: 'Coordinator', timestamps: { Requested: dayOffset(-10), Matched: dayOffset(-9), Confirmed: dayOffset(-8), Collected: dayOffset(-7), 'Sale Completed': dayOffset(-6) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-3', orderId: 'order-seed-4', listingId: 'listing-cab-20', farmerId: 'farmer-3', buyerId: 'buyer-4', kgCommitted: 15, kgDelivered: 15, agreedPricePerKg: 8.8, status: 'Sale Completed', sourceChannel: 'Coordinator', timestamps: { Requested: dayOffset(-10), Matched: dayOffset(-9), Confirmed: dayOffset(-8), Collected: dayOffset(-7), 'Sale Completed': dayOffset(-6) }, registrationTypeOfFarmer: 'coordinator', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-4', orderId: 'order-seed-2', listingId: 'listing-pot-1', farmerId: 'farmer-3', buyerId: 'buyer-2', kgCommitted: 50, kgDelivered: 0, agreedPricePerKg: 9, status: 'Confirmed', sourceChannel: 'WhatsApp', timestamps: { Requested: dayOffset(-6), Matched: dayOffset(-5), Confirmed: dayOffset(-4) }, registrationTypeOfFarmer: 'coordinator', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-5', orderId: 'order-seed-1', listingId: 'listing-spin-1', farmerId: 'farmer-4', buyerId: 'buyer-1', kgCommitted: 15, kgDelivered: 0, agreedPricePerKg: 12, status: 'Shortfall', sourceChannel: 'App', lostReason: 'shortfall', timestamps: { Requested: dayOffset(-7), Matched: dayOffset(-6), Shortfall: dayOffset(-6) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-6', orderId: 'order-seed-3', listingId: 'listing-tom-1', farmerId: 'farmer-2', buyerId: 'buyer-3', kgCommitted: 25, kgDelivered: 0, agreedPricePerKg: 15, status: 'Cancelled', sourceChannel: 'SMS', lostReason: 'buyer cancelled', timestamps: { Requested: dayOffset(-5), Matched: dayOffset(-5), Cancelled: dayOffset(-4) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-7', orderId: 'order-seed-3', listingId: 'listing-cab-late', farmerId: 'farmer-4', buyerId: 'buyer-3', kgCommitted: 10, kgDelivered: 0, agreedPricePerKg: 7.9, status: 'Expired', sourceChannel: 'App', lostReason: 'late harvest', timestamps: { Requested: dayOffset(-5), Expired: dayOffset(-3) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-8', orderId: 'order-seed-1', listingId: 'listing-cab-unverified', farmerId: 'farmer-6', buyerId: 'buyer-1', kgCommitted: 5, kgDelivered: 0, agreedPricePerKg: 7.5, status: 'Cancelled', sourceChannel: 'Coordinator', lostReason: 'farmer not verified', timestamps: { Requested: dayOffset(-7), Cancelled: dayOffset(-7) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Unverified'
  },
  {
    id: 'conn-9', orderId: 'order-seed-2', listingId: 'listing-cab-20', farmerId: 'farmer-3', buyerId: 'buyer-2', kgCommitted: 10, kgDelivered: 0, agreedPricePerKg: 8.8, status: 'Collected', sourceChannel: 'App', timestamps: { Requested: dayOffset(-6), Matched: dayOffset(-5), Confirmed: dayOffset(-4), Collected: dayOffset(-3) }, registrationTypeOfFarmer: 'coordinator', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-10', orderId: 'order-seed-1', listingId: 'listing-cab-30', farmerId: 'farmer-2', buyerId: 'buyer-1', kgCommitted: 10, kgDelivered: 0, agreedPricePerKg: 8.2, status: 'Matched', sourceChannel: 'App', timestamps: { Requested: dayOffset(-7), Matched: dayOffset(-6) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-11', orderId: 'order-seed-2', listingId: 'listing-cab-50', farmerId: 'farmer-1', buyerId: 'buyer-2', kgCommitted: 12, kgDelivered: 0, agreedPricePerKg: 8.4, status: 'Requested', sourceChannel: 'SMS', timestamps: { Requested: dayOffset(-6) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Verified'
  },
  {
    id: 'conn-12', orderId: 'order-seed-2', listingId: 'listing-cab-30', farmerId: 'farmer-2', buyerId: 'buyer-2', kgCommitted: 8, kgDelivered: 0, agreedPricePerKg: 8.2, status: 'Cancelled', sourceChannel: 'App', lostReason: 'transport', timestamps: { Requested: dayOffset(-6), Matched: dayOffset(-5), Cancelled: dayOffset(-4) }, registrationTypeOfFarmer: 'self', verificationStatusAtMatch: 'Verified'
  },
]

export const createSeedData = (): AppData => ({
  users: users(),
  listings: listings(),
  orders: orders(),
  connections: seedConnections(),
  pendingQueue: [],
  seededAt: new Date().toISOString(),
})

export const demoCredentials = {
  farmer: { phone: '071 000 0101', pin: '1234' },
  buyer: { phone: '072 000 0201', pin: '1234' },
  coordinator: { phone: '071 000 0001', pin: '1111' },
}
