import { type ReactNode, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Funnel,
  FunnelChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { demoCredentials } from './data.seed'
import { dictionary, type Lang } from './i18n'
import { canTransition } from './lib.lifecycle'
import { buildConnectionsFromMatch, runMatching, type MatchResult } from './lib.matching'
import { loadData, queueChange, resetData } from './lib.storage'
import {
  demoHash,
  isValidPhone,
  isValidPin,
  isValidSouthAfricanId,
  maskSouthAfricanId,
  normalizePhone,
} from './lib.validation'
import type {
  AppData,
  Channel,
  Connection,
  ConnectionStatus,
  Listing,
  Order,
  ProduceType,
  RegistrationType,
  Role,
  User,
} from './types'

const villages = ['Qamata', 'Nondweni', 'Mthombe', 'Bityi', 'Qunu', 'Sakhisizwe']
const produceTypes: ProduceType[] = ['cabbage', 'spinach', 'tomatoes', 'potatoes']
const produceEmoji: Record<ProduceType, string> = {
  cabbage: '🥬',
  spinach: '🌿',
  tomatoes: '🍅',
  potatoes: '🥔',
}

const roleTabs: Record<Role, string[]> = {
  farmer: ['Marketplace', 'Availability', 'Verification', 'My Connections', 'Profile'],
  buyer: ['Marketplace', 'Orders', 'My Connections', 'Profile'],
  coordinator: [
    'Marketplace',
    'Orders',
    'Verification Queue',
    'My Connections',
    'Dashboard',
    'Profile',
  ],
}

const stageRank: Record<ConnectionStatus, number> = {
  Requested: 1,
  Matched: 2,
  Confirmed: 3,
  Collected: 4,
  'Sale Completed': 5,
  Expired: 0,
  Cancelled: 0,
  Shortfall: 0,
}

const formatDate = (value: string) => new Date(value).toISOString().split('T')[0]

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const [lang, setLang] = useState<Lang>('en')
  const [authStep, setAuthStep] = useState<'splash' | 'role' | 'auth'>('splash')
  const [selectedRole, setSelectedRole] = useState<Role>('farmer')
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('Marketplace')
  const [forceOffline, setForceOffline] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [matchResults, setMatchResults] = useState<Record<string, MatchResult>>({})
  const [selectedPlanOrderId, setSelectedPlanOrderId] = useState<string | null>(null)
  const [saleFields, setSaleFields] = useState<Record<string, { kg: number; price: number }>>({})

  const t = (key: string) => dictionary[lang][key] || key
  const currentUser = data.users.find((user) => user.id === currentUserId) || null
  const online = !forceOffline && (typeof navigator === 'undefined' ? true : navigator.onLine)

  const updateData = (
    updater: (prev: AppData) => AppData,
    change: { entity: 'user' | 'listing' | 'order' | 'connection' | 'verification'; action: 'create' | 'update' | 'delete' },
  ) => {
    setData((prev) => {
      const next = updater(prev)
      next.pendingQueue = online
        ? prev.pendingQueue
        : queueChange(prev.pendingQueue, change)
      localStorage.setItem('ifarma_demo_state_v1', JSON.stringify(next))
      return next
    })
  }

  const login = (phone: string, pin: string) => {
    const account = data.users.find(
      (user) => normalizePhone(user.phone) === normalizePhone(phone.trim()),
    )
    if (!account || account.pinHash !== demoHash(pin)) {
      setMessage('Invalid phone or PIN')
      return
    }
    setCurrentUserId(account.id)
    setActiveTab(roleTabs[account.role][0])
    setMessage('')
  }

  const runSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setData((prev) => {
        const next = { ...prev, pendingQueue: [] }
        localStorage.setItem('ifarma_demo_state_v1', JSON.stringify(next))
        return next
      })
      setSyncing(false)
    }, 1100)
  }

  const registerUser = (formData: FormData, registrationType: RegistrationType) => {
    const name = String(formData.get('name') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    const pin = String(formData.get('pin') || '').trim()
    const village = String(formData.get('village') || '').trim()
    const channel = String(formData.get('channel') || 'App') as Channel

    // Registration rules: required fields, unique phone login ID, valid SA phone, and demo-only PIN hashing.
    if (!name || !phone || !village || !isValidPhone(phone) || !isValidPin(pin)) {
      setMessage('Please complete required fields, SA phone format, and 4-digit PIN.')
      return
    }
    if (
      data.users.some(
        (user) => normalizePhone(user.phone) === normalizePhone(phone),
      )
    ) {
      setMessage('Phone number already exists. Use log in instead.')
      return
    }

    const baseUser: User = {
      id: `${selectedRole}-${crypto.randomUUID()}`,
      role: selectedRole,
      name,
      phone,
      pinHash: demoHash(pin),
      village,
      channel,
      registrationType,
      verificationStatus: selectedRole === 'farmer' ? 'Unverified' : 'Verified',
      verification: { currentStep: 1 },
    }

    const nextUser: User =
      selectedRole === 'farmer'
        ? {
            ...baseUser,
            farmSizeHa: Number(formData.get('farmSizeHa') || 0),
            produceGrown: formData.getAll('produceGrown') as ProduceType[],
            cooperativeName: String(formData.get('cooperativeName') || '').trim(),
            consentShareContacts: formData.get('consentShareContacts') === 'on',
            createdByCoordinatorId:
              registrationType === 'coordinator' ? currentUser?.id : undefined,
          }
        : {
            ...baseUser,
            businessType: String(formData.get('businessType') || 'other'),
            weeklyVolumeKg: Number(formData.get('weeklyVolumeKg') || 0),
            deliveryPreference:
              (String(formData.get('deliveryPreference') || 'Collection') as
                | 'Collection'
                | 'Delivery'),
          }

    updateData(
      (prev) => ({ ...prev, users: [...prev.users, nextUser] }),
      { entity: 'user', action: 'create' },
    )

    setMessage('Registered successfully. Welcome message preview: “Welcome to IFarma.”')
    if (!currentUser) {
      setCurrentUserId(nextUser.id)
      setActiveTab(roleTabs[nextUser.role][0])
    }
  }

  const createOrder = (formData: FormData) => {
    if (!currentUser || currentUser.role !== 'buyer') return
    const produce = String(formData.get('produce')) as ProduceType
    const kgRequested = Number(formData.get('kgRequested') || 0)
    const requiredDate = String(formData.get('requiredDate'))
    const location = String(formData.get('location') || '').trim()
    const deliveryPreference = String(formData.get('deliveryPreference') || 'Collection') as
      | 'Collection'
      | 'Delivery'

    if (!produce || !kgRequested || !requiredDate || !location) {
      setMessage('Please complete all order fields.')
      return
    }

    const order: Order = {
      id: `order-${crypto.randomUUID()}`,
      buyerId: currentUser.id,
      produce,
      kgRequested,
      requiredDate,
      deliveryPreference,
      location,
      status: 'Requested',
      sourceChannel: currentUser.channel,
      createdAt: new Date().toISOString(),
    }

    updateData(
      (prev) => ({ ...prev, orders: [order, ...prev.orders] }),
      { entity: 'order', action: 'create' },
    )
    setMessage('Order created. Tap Match order to run matching.')
  }

  const matchOrder = (order: Order) => {
    // Matching excludes non-verified farmers and late-ready listings, then selects by lowest price and readiness.
    const result = runMatching(order, data.listings, data.users)
    setMatchResults((prev) => ({ ...prev, [order.id]: result }))

    const newConnections = buildConnectionsFromMatch(order, result, order.sourceChannel)
    if (result.shortfallKg > 0) {
      newConnections.push({
        id: `conn-short-${order.id}`,
        orderId: order.id,
        listingId: 'shortfall',
        farmerId: 'shortfall',
        buyerId: order.buyerId,
        kgCommitted: result.shortfallKg,
        kgDelivered: 0,
        agreedPricePerKg: 0,
        status: 'Shortfall',
        sourceChannel: order.sourceChannel,
        lostReason: 'shortfall',
        timestamps: { Requested: order.createdAt, Shortfall: new Date().toISOString() },
        registrationTypeOfFarmer: 'self',
        verificationStatusAtMatch: 'Unverified',
      })
    }

    updateData(
      (prev) => ({
        ...prev,
        connections: [...newConnections, ...prev.connections],
        orders: prev.orders.map((item) =>
          item.id === order.id
            ? {
                ...item,
                status: result.canFulfil ? 'Matched' : 'Shortfall',
              }
            : item,
        ),
      }),
      { entity: 'connection', action: 'create' },
    )
  }

  const transitionConnection = (
    connection: Connection,
    nextStatus: ConnectionStatus,
    extra?: { kgDelivered?: number; agreedPricePerKg?: number; lostReason?: Connection['lostReason'] },
  ) => {
    if (!canTransition(connection.status, nextStatus)) {
      setMessage(`Cannot move ${connection.status} to ${nextStatus}`)
      return
    }
    // Connection is the source of truth for lifecycle and sales attribution in dashboard KPIs.
    updateData(
      (prev) => ({
        ...prev,
        connections: prev.connections.map((item) =>
          item.id === connection.id
            ? {
                ...item,
                status: nextStatus,
                kgDelivered: extra?.kgDelivered ?? item.kgDelivered,
                agreedPricePerKg: extra?.agreedPricePerKg ?? item.agreedPricePerKg,
                lostReason: extra?.lostReason ?? item.lostReason,
                timestamps: { ...item.timestamps, [nextStatus]: new Date().toISOString() },
              }
            : item,
        ),
      }),
      { entity: 'connection', action: 'update' },
    )
  }

  const saveVerification = (formData: FormData) => {
    if (!currentUser || currentUser.role !== 'farmer') return
    const step = Number(formData.get('step')) as 1 | 2 | 3 | 4

    updateData(
      (prev) => ({
        ...prev,
        users: prev.users.map((user) => {
          if (user.id !== currentUser.id) return user
          const verification = { ...user.verification }

          // POPIA simulation: only masked SA ID plus demo hash are stored, never raw ID.
          if (step === 1) {
            const idType = String(formData.get('idType') || 'sa-id') as
              | 'sa-id'
              | 'passport'
              | 'asylum-permit'
            const idNumber = String(formData.get('idNumber') || '').trim()
            const idConsent = formData.get('idConsent') === 'on'
            if (idType === 'sa-id' && !isValidSouthAfricanId(idNumber)) {
              setMessage('SA ID must be 13 digits with valid checksum. Try test ID 8001015009087.')
              return user
            }
            if (!idConsent) {
              setMessage('Consent is required for identity simulation.')
              return user
            }
            verification.idType = idType
            verification.maskedId =
              idType === 'sa-id' ? maskSouthAfricanId(idNumber) : `${idType}-••••`
            verification.idHash = demoHash(idNumber, `ifarma-id-${user.id}`)
            verification.idConsent = idConsent
            verification.identityNote =
              'Simulation: ID used only for identity confirmation and can be deleted on request.'
          }

          if (step === 2) {
            verification.farmingLocation = String(formData.get('farmingLocation') || user.village)
            verification.produceGrown = formData.getAll('produceGrown') as ProduceType[]
            verification.landSizeHa = Number(formData.get('landSizeHa') || user.farmSizeHa || 0)
            verification.proofMethods = formData.getAll('proofMethods') as Array<
              'farm visit' | 'extension officer' | 'photo evidence'
            >
            verification.farmingNote = String(formData.get('farmingNote') || '')
          }

          if (step === 3) {
            verification.optionalDocs = String(formData.get('optionalDocs') || '')
              .split(',')
              .map((doc) => doc.trim())
              .filter(Boolean)
          }

          if (step === 4) {
            user.verificationStatus = 'Pending review'
          }

          verification.currentStep = Math.min(4, step + 1) as 1 | 2 | 3 | 4
          return { ...user, verification }
        }),
      }),
      { entity: 'verification', action: 'update' },
    )
    setMessage('Verification step saved.')
  }

  const dashboard = useMemo(() => {
    const farmers = data.users.filter((user) => user.role === 'farmer')
    const buyers = data.users.filter((user) => user.role === 'buyer')
    const verifiedFarmers = farmers.filter((farmer) => farmer.verificationStatus === 'Verified')
    const totalConnections = data.connections.filter((connection) => connection.farmerId !== 'shortfall')
    const realSales = totalConnections.filter((connection) => connection.status === 'Sale Completed')
    const kgSold = realSales.reduce((sum, item) => sum + item.kgDelivered, 0)
    const salesValue = realSales.reduce(
      (sum, item) => sum + item.kgDelivered * item.agreedPricePerKg,
      0,
    )
    const conversion = totalConnections.length
      ? (realSales.length / totalConnections.length) * 100
      : 0
    const avgSaleHours = realSales.length
      ? realSales.reduce((sum, connection) => {
          const requested = connection.timestamps.Requested
            ? new Date(connection.timestamps.Requested).getTime()
            : 0
          const completed = connection.timestamps['Sale Completed']
            ? new Date(connection.timestamps['Sale Completed']).getTime()
            : requested
          return sum + (completed - requested) / (1000 * 60 * 60)
        }, 0) / realSales.length
      : 0

    const orderedStages: ConnectionStatus[] = [
      'Requested',
      'Matched',
      'Confirmed',
      'Collected',
      'Sale Completed',
    ]
    const funnel = orderedStages.map((stage) => ({
      stage,
      value: totalConnections.filter((item) => stageRank[item.status] >= stageRank[stage]).length,
    }))

    const trend = orderedStages.map((stage, index) => ({
      name: stage,
      count: funnel[index].value,
    }))

    return {
      farmers,
      buyers,
      verifiedFarmers,
      totalConnections,
      realSales,
      kgSold,
      salesValue,
      conversion,
      avgSaleHours,
      funnel,
      trend,
    }
  }, [data.connections, data.users])

  if (!currentUser && authStep === 'splash') {
    return (
      <main className="min-h-screen bg-[#1F5E2B] text-white p-6 flex flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-bold">IFarma</h1>
        <p className="text-lg">{t('supporting')}</p>
        <button className="btn-primary" onClick={() => setAuthStep('role')}>
          {t('getStarted')}
        </button>
      </main>
    )
  }

  if (!currentUser && authStep === 'role') {
    return (
      <main className="page">
        <h2 className="title">Choose role</h2>
        <div className="grid gap-3">
          {(['farmer', 'buyer', 'coordinator'] as Role[]).map((role) => (
            <button
              key={role}
              className={`card text-left ${selectedRole === role ? 'ring-2 ring-[#0B7A3B]' : ''}`}
              onClick={() => {
                setSelectedRole(role)
                setAuthStep('auth')
              }}
            >
              {t(role)}
            </button>
          ))}
        </div>
      </main>
    )
  }

  if (!currentUser && authStep === 'auth') {
    return (
      <main className="page">
        <div className="flex justify-between">
          <h2 className="title">{selectedRole.toUpperCase()}</h2>
          <button onClick={() => setLang(lang === 'en' ? 'xh' : 'en')}>{lang.toUpperCase()}</button>
        </div>
        <div className="flex gap-2 mb-3">
          <button className={`pill ${authMode === 'register' ? 'pill-active' : ''}`} onClick={() => setAuthMode('register')}>
            {t('register')}
          </button>
          <button className={`pill ${authMode === 'login' ? 'pill-active' : ''}`} onClick={() => setAuthMode('login')}>
            {t('login')}
          </button>
        </div>

        {authMode === 'register' && selectedRole !== 'coordinator' ? (
          <form
            className="card grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              registerUser(new FormData(event.currentTarget), 'self')
            }}
          >
            <input className="input" name="name" placeholder={selectedRole === 'buyer' ? 'Business name' : 'Full name'} required />
            <input className="input" name="phone" placeholder="0XX XXX XXXX" required />
            <input className="input" name="pin" placeholder="4-digit PIN" required />
            <select className="input" name="village" required>
              {villages.map((village) => (
                <option key={village}>{village}</option>
              ))}
            </select>
            <select className="input" name="channel" defaultValue="App">
              <option>App</option>
              <option>SMS</option>
              <option>WhatsApp</option>
            </select>
            {selectedRole === 'farmer' ? (
              <>
                <input className="input" name="farmSizeHa" type="number" placeholder="Farm size (ha)" required />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {produceTypes.map((produce) => (
                    <label key={produce} className="chip">
                      <input name="produceGrown" type="checkbox" value={produce} /> {produce}
                    </label>
                  ))}
                </div>
                <input className="input" name="cooperativeName" placeholder="Co-op name (optional)" />
                <label className="text-sm">
                  <input name="consentShareContacts" type="checkbox" /> I consent to share contact details
                </label>
              </>
            ) : (
              <>
                <input className="input" name="businessType" placeholder="Business type" required />
                <input className="input" name="weeklyVolumeKg" type="number" placeholder="Weekly volume (kg)" required />
                <select className="input" name="deliveryPreference">
                  <option>Collection</option>
                  <option>Delivery</option>
                </select>
              </>
            )}
            <button className="btn-primary" type="submit">
              {t('register')}
            </button>
          </form>
        ) : (
          <form
            className="card grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const formData = new FormData(event.currentTarget)
              login(String(formData.get('phone') || ''), String(formData.get('pin') || ''))
            }}
          >
            {selectedRole === 'coordinator' && <p>Coordinator account is pre-seeded.</p>}
            <input className="input" name="phone" placeholder="Phone" required />
            <input className="input" name="pin" placeholder="PIN" required />
            <button className="btn-primary" type="submit">
              {t('login')}
            </button>
          </form>
        )}

        <div className="card">
          <p className="mb-2 text-sm">Demo mode</p>
          <div className="grid grid-cols-3 gap-2">
            <button className="pill" onClick={() => login(demoCredentials.farmer.phone, demoCredentials.farmer.pin)}>
              Farmer
            </button>
            <button className="pill" onClick={() => login(demoCredentials.buyer.phone, demoCredentials.buyer.pin)}>
              Buyer
            </button>
            <button className="pill" onClick={() => login(demoCredentials.coordinator.phone, demoCredentials.coordinator.pin)}>
              Coordinator
            </button>
          </div>
        </div>

        {message && <p className="text-sm text-amber-700 mt-3">{message}</p>}
      </main>
    )
  }

  if (!currentUser) return null

  const role = currentUser.role
  const myConnections = data.connections.filter(
    (connection) =>
      role === 'coordinator' ||
      connection.farmerId === currentUser.id ||
      connection.buyerId === currentUser.id,
  )

  const renderMarketplace = () => {
    const [produceFilter, qtyFilter, dateFilter] = ['cabbage', 100, formatDate(new Date().toISOString())]

    if (role === 'farmer') {
      const openOrders = data.orders.filter((order) => ['Requested', 'Matched'].includes(order.status))
      return (
        <section className="grid gap-3">
          {openOrders.map((order) => (
            <article key={order.id} className="card">
              <p className="font-semibold">{produceEmoji[order.produce]} {order.produce} · {order.kgRequested} kg</p>
              <p className="text-sm text-[#6B7B80]">Needed by {formatDate(order.requiredDate)}</p>
              <p className="text-sm">Action: Commit supply from your verified listing</p>
            </article>
          ))}
        </section>
      )
    }

    return (
      <section className="grid gap-3">
        <article className="card text-sm bg-[#CFE8D8]">
          Summary: {qtyFilter} kg requested · ready by {dateFilter} · produce {produceFilter}
        </article>
        {data.listings.map((listing) => {
          const farmer = data.users.find((user) => user.id === listing.farmerId)
          const readyInTime = new Date(listing.readyDate) <= new Date(dateFilter)
          const availability =
            listing.kgAvailable <= 0 || !readyInTime
              ? 'Not available'
              : listing.kgAvailable < 20
                ? 'Low stock'
                : 'Available'
          const verified = farmer?.verificationStatus === 'Verified'
          const disabled = !verified || availability === 'Not available'
          return (
            <article key={listing.id} className={`card ${disabled ? 'opacity-60' : ''}`}>
              <div className="flex justify-between">
                <p className="font-semibold">
                  {produceEmoji[listing.produce]} {listing.produce}
                </p>
                <span className="text-sm">R {listing.pricePerKg.toFixed(2)} / kg</span>
              </div>
              <p className="text-sm">{farmer?.name} · {farmer?.village}</p>
              <p className="text-sm">Available: {listing.kgAvailable} kg</p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                <span className={`chip ${availability === 'Available' ? 'chip-green' : availability === 'Low stock' ? 'chip-amber' : 'chip-red'}`}>{availability}</span>
                <span className={`chip ${verified ? 'chip-green' : ''}`}>{verified ? 'Verified' : 'Not verified'}</span>
                {!readyInTime && <span className="chip chip-red">Not ready by date</span>}
              </div>
              <button disabled={disabled} className="btn-primary mt-3 w-full disabled:opacity-50">
                {verified ? 'Add to order' : 'Verified farmers only'}
              </button>
            </article>
          )
        })}
      </section>
    )
  }

  const renderOrders = () => {
    const myOrders = data.orders.filter((order) => role === 'coordinator' || order.buyerId === currentUser.id)

    return (
      <section className="grid gap-3">
        {role === 'buyer' && (
          <form
            className="card grid gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              createOrder(new FormData(event.currentTarget))
              event.currentTarget.reset()
            }}
          >
            <h3 className="font-semibold">Post buyer order</h3>
            <select className="input" name="produce" defaultValue="cabbage">
              {produceTypes.map((produce) => (
                <option key={produce}>{produce}</option>
              ))}
            </select>
            <input className="input" name="kgRequested" type="number" placeholder="Quantity kg" required />
            <input className="input" name="requiredDate" type="date" required />
            <input className="input" name="location" placeholder="Collection point / location" required />
            <select className="input" name="deliveryPreference">
              <option>Collection</option>
              <option>Delivery</option>
            </select>
            <button className="btn-primary" type="submit">
              Save order
            </button>
          </form>
        )}

        {myOrders.map((order) => {
          const result = matchResults[order.id]
          return (
            <article key={order.id} className="card">
              <div className="flex justify-between">
                <p className="font-semibold">{order.produce} · {order.kgRequested} kg</p>
                <span className="text-sm">{order.status}</span>
              </div>
              <p className="text-sm text-[#6B7B80]">Required: {formatDate(order.requiredDate)} · {order.location}</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button className="pill" onClick={() => matchOrder(order)}>
                  Match order
                </button>
                {order.status === 'Matched' && (
                  <button
                    className="pill pill-active"
                    onClick={() => {
                      data.connections
                        .filter((connection) => connection.orderId === order.id)
                        .forEach((connection) => {
                          if (connection.status === 'Matched') transitionConnection(connection, 'Confirmed')
                        })
                      setSelectedPlanOrderId(order.id)
                    }}
                  >
                    Confirm
                  </button>
                )}
                <button className="pill" onClick={() => setSelectedPlanOrderId(order.id)}>
                  Collection plan
                </button>
              </div>

              {result && (
                <div className="mt-3 rounded-xl bg-[#F4F6F5] p-3 text-sm">
                  <p className="font-semibold">
                    {result.canFulfil
                      ? `This order can be fully met by ${result.selected.length} farmers.`
                      : `Only ${order.kgRequested - result.shortfallKg} kg of ${order.kgRequested} kg is available in time. Shortfall: ${result.shortfallKg} kg.`}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {result.selected.map((item) => (
                      <li key={item.listing.id}>
                        ✅ {item.farmer.name} ({item.kgCommitted} kg @ R {item.listing.pricePerKg.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                  {!!result.excluded.length && (
                    <ul className="mt-2 space-y-1">
                      {result.excluded.map((item) => (
                        <li key={`${order.id}-${item.listing.id}`} className="text-[#6B7B80]">
                          ⛔ {item.farmer?.name || 'Unknown'} ({item.listing.kgAvailable} kg): {item.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </section>
    )
  }

  const renderAvailability = () => {
    const myListings = data.listings.filter((listing) => listing.farmerId === currentUser.id)
    return (
      <section className="grid gap-3">
        <form
          className="card grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const formData = new FormData(event.currentTarget)
            const listing: Listing = {
              id: `listing-${crypto.randomUUID()}`,
              farmerId: currentUser.id,
              produce: String(formData.get('produce')) as ProduceType,
              kgAvailable: Number(formData.get('kgAvailable') || 0),
              pricePerKg: Number(formData.get('pricePerKg') || 0),
              readyDate: String(formData.get('readyDate')),
              createdAt: new Date().toISOString(),
            }
            updateData(
              (prev) => ({ ...prev, listings: [listing, ...prev.listings] }),
              { entity: 'listing', action: 'create' },
            )
            event.currentTarget.reset()
          }}
        >
          <h3 className="font-semibold">My availability</h3>
          <select className="input" name="produce">
            {produceTypes.map((produce) => (
              <option key={produce}>{produce}</option>
            ))}
          </select>
          <input className="input" name="kgAvailable" type="number" placeholder="kg available" required />
          <input className="input" name="pricePerKg" type="number" placeholder="R / kg" required />
          <input className="input" name="readyDate" type="date" required />
          <button className="btn-primary">Save listing</button>
        </form>
        {myListings.map((listing) => (
          <article key={listing.id} className="card">
            {produceEmoji[listing.produce]} {listing.produce} · {listing.kgAvailable} kg · R {listing.pricePerKg.toFixed(2)}
          </article>
        ))}
      </section>
    )
  }

  const renderVerification = () => {
    const me = data.users.find((user) => user.id === currentUser.id)
    if (!me) return null
    return (
      <section className="grid gap-3">
        <article className="card">
          <p>Status: <span className="font-semibold">{me.verificationStatus}</span></p>
          <p className="text-sm text-[#6B7B80]">Stepper: 1 Identity · 2 Farming activity · 3 Documents · 4 Approval</p>
          <p className="text-sm">Masked ID: {me.verification.maskedId || 'Not submitted'}</p>
        </article>

        <form className="card grid gap-2" onSubmit={(e) => { e.preventDefault(); saveVerification(new FormData(e.currentTarget)); }}>
          <input type="hidden" name="step" value="1" />
          <h3 className="font-semibold">Step 1: Identity</h3>
          <select className="input" name="idType"><option value="sa-id">SA ID</option><option value="passport">Passport</option><option value="asylum-permit">Asylum permit</option></select>
          <input className="input" name="idNumber" placeholder="Fake test ID: 8001015009087" required />
          <label className="text-sm"><input name="idConsent" type="checkbox" /> I consent to identity simulation</label>
          <button className="pill">Save step 1</button>
        </form>

        <form className="card grid gap-2" onSubmit={(e) => { e.preventDefault(); saveVerification(new FormData(e.currentTarget)); }}>
          <input type="hidden" name="step" value="2" />
          <h3 className="font-semibold">Step 2: Farming activity</h3>
          <input className="input" name="farmingLocation" placeholder="Farm/village location" defaultValue={me.village} />
          <input className="input" name="landSizeHa" type="number" placeholder="Approximate land size" defaultValue={me.farmSizeHa} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            {produceTypes.map((produce) => (
              <label key={produce} className="chip"><input type="checkbox" name="produceGrown" value={produce} /> {produce}</label>
            ))}
          </div>
          <div className="grid gap-1 text-sm">
            <label><input type="checkbox" name="proofMethods" value="farm visit" /> farm visit</label>
            <label><input type="checkbox" name="proofMethods" value="extension officer" /> extension officer confirmation</label>
            <label><input type="checkbox" name="proofMethods" value="photo evidence" /> photo evidence</label>
          </div>
          <textarea className="input" name="farmingNote" placeholder="No formal document is not disqualifying." />
          <button className="pill">Save step 2</button>
        </form>

        <form className="card grid gap-2" onSubmit={(e) => { e.preventDefault(); saveVerification(new FormData(e.currentTarget)); }}>
          <input type="hidden" name="step" value="3" />
          <h3 className="font-semibold">Step 3: Optional documents</h3>
          <textarea className="input" name="optionalDocs" placeholder="Optional docs, comma separated. Skip if none." />
          <button className="pill">Save/Skip step 3</button>
        </form>

        <form className="card grid gap-2" onSubmit={(e) => { e.preventDefault(); saveVerification(new FormData(e.currentTarget)); }}>
          <input type="hidden" name="step" value="4" />
          <h3 className="font-semibold">Step 4: Submit for approval</h3>
          <button className="btn-primary">Submit to coordinator</button>
        </form>
      </section>
    )
  }

  const renderVerificationQueue = () => {
    const queue = data.users.filter(
      (user) => user.role === 'farmer' && ['Pending review', 'Needs more information'].includes(user.verificationStatus),
    )

    return (
      <section className="grid gap-3">
        {queue.map((farmer) => (
          <article key={farmer.id} className="card grid gap-2">
            <p className="font-semibold">{farmer.name} · {farmer.village}</p>
            <p className="text-sm">ID: {farmer.verification.maskedId || 'not captured'}</p>
            <p className="text-sm">Proof: {(farmer.verification.proofMethods || []).join(', ') || 'none'}</p>
            <textarea className="input" id={`note-${farmer.id}`} placeholder="Reason / request note" />
            <div className="grid grid-cols-3 gap-2">
              <button className="pill chip-green" onClick={() => {
                updateData((prev) => ({
                  ...prev,
                  users: prev.users.map((user) => user.id === farmer.id ? {
                    ...user,
                    verificationStatus: 'Verified',
                    verification: {
                      ...user.verification,
                      reviewerDecision: 'Approve',
                      reviewerName: currentUser.name,
                      reviewerNote: 'Approved',
                      reviewedAt: new Date().toISOString(),
                    },
                  } : user),
                }), { entity: 'verification', action: 'update' })
              }}>Approve</button>
              <button className="pill chip-red" onClick={() => {
                const note = (document.getElementById(`note-${farmer.id}`) as HTMLTextAreaElement | null)?.value || 'Rejected'
                updateData((prev) => ({
                  ...prev,
                  users: prev.users.map((user) => user.id === farmer.id ? {
                    ...user,
                    verificationStatus: 'Rejected',
                    verification: {
                      ...user.verification,
                      reviewerDecision: 'Reject',
                      reviewerName: currentUser.name,
                      reviewerNote: note,
                      reviewedAt: new Date().toISOString(),
                    },
                  } : user),
                }), { entity: 'verification', action: 'update' })
              }}>Reject</button>
              <button className="pill chip-amber" onClick={() => {
                const note = (document.getElementById(`note-${farmer.id}`) as HTMLTextAreaElement | null)?.value || 'Please add more detail'
                updateData((prev) => ({
                  ...prev,
                  users: prev.users.map((user) => user.id === farmer.id ? {
                    ...user,
                    verificationStatus: 'Needs more information',
                    verification: {
                      ...user.verification,
                      reviewerDecision: 'Request more information',
                      reviewerName: currentUser.name,
                      reviewerNote: note,
                      reviewedAt: new Date().toISOString(),
                    },
                  } : user),
                }), { entity: 'verification', action: 'update' })
              }}>Request info</button>
            </div>
          </article>
        ))}
      </section>
    )
  }

  const renderConnections = () => (
    <section className="grid gap-3">
      {selectedPlanOrderId && (
        <article className="card">
          <h3 className="font-semibold mb-2">Collection plan</h3>
          <ul className="text-sm space-y-1">
            {data.connections.filter((connection) => connection.orderId === selectedPlanOrderId && connection.farmerId !== 'shortfall').map((connection) => {
              const farmer = data.users.find((user) => user.id === connection.farmerId)
              return <li key={connection.id}>{farmer?.name}: {connection.kgCommitted} kg via {farmer?.channel}</li>
            })}
          </ul>
          <p className="text-sm mt-2">Message preview: “Order: collect at 08:00 at Ngcobo point. Reply YES to confirm.”</p>
        </article>
      )}

      {myConnections.map((connection) => {
        const farmer = data.users.find((user) => user.id === connection.farmerId)
        const buyer = data.users.find((user) => user.id === connection.buyerId)
        return (
          <article key={connection.id} className="card">
            <p className="font-semibold">{buyer?.name || 'Buyer'} ↔ {farmer?.name || 'Shortfall'}</p>
            <p className="text-sm">{connection.status} · {connection.kgCommitted} kg committed</p>
            {connection.status === 'Sale Completed' && (
              <p className="text-sm">Delivered {connection.kgDelivered} kg @ R {connection.agreedPricePerKg.toFixed(2)}</p>
            )}

            {role === 'coordinator' && connection.farmerId !== 'shortfall' && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(['Confirmed', 'Collected', 'Sale Completed'] as ConnectionStatus[]).map((next) => (
                  <button
                    key={next}
                    disabled={!canTransition(connection.status, next)}
                    className="pill disabled:opacity-40"
                    onClick={() => {
                      if (next === 'Sale Completed') {
                        const field = saleFields[connection.id] || { kg: connection.kgCommitted, price: connection.agreedPricePerKg }
                        transitionConnection(connection, next, {
                          kgDelivered: field.kg,
                          agreedPricePerKg: field.price,
                        })
                        return
                      }
                      transitionConnection(connection, next)
                    }}
                  >
                    {next}
                  </button>
                ))}
                {canTransition(connection.status, 'Sale Completed') && (
                  <>
                    <input
                      className="input max-w-[110px]"
                      type="number"
                      placeholder="kg"
                      value={saleFields[connection.id]?.kg ?? connection.kgCommitted}
                      onChange={(event) =>
                        setSaleFields((prev) => ({
                          ...prev,
                          [connection.id]: {
                            kg: Number(event.target.value),
                            price: prev[connection.id]?.price ?? connection.agreedPricePerKg,
                          },
                        }))
                      }
                    />
                    <input
                      className="input max-w-[120px]"
                      type="number"
                      placeholder="R/kg"
                      value={saleFields[connection.id]?.price ?? connection.agreedPricePerKg}
                      onChange={(event) =>
                        setSaleFields((prev) => ({
                          ...prev,
                          [connection.id]: {
                            kg: prev[connection.id]?.kg ?? connection.kgCommitted,
                            price: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </>
                )}
              </div>
            )}
          </article>
        )
      })}
    </section>
  )

  const renderDashboard = () => {
    const lost = data.connections.filter((connection) => ['Expired', 'Cancelled', 'Shortfall'].includes(connection.status))
    return (
      <section className="grid gap-3 pb-20">
        <article className="card bg-[#CFE8D8]">
          <p className="font-semibold">
            {dashboard.realSales.length} of {dashboard.totalConnections.length} connections became real sales.
          </p>
        </article>

        <article className="grid grid-cols-2 gap-2">
          {[
            ['Registered farmers', dashboard.farmers.length],
            ['Registered buyers', dashboard.buyers.length],
            ['Verified farmers', dashboard.verifiedFarmers.length],
            ['Connections', dashboard.totalConnections.length],
            ['Real sales', dashboard.realSales.length],
            ['Conversion %', dashboard.conversion.toFixed(1)],
            ['KG sold', dashboard.kgSold],
            ['Sales value (R)', dashboard.salesValue.toFixed(2)],
            ['Avg hrs request→sale', dashboard.avgSaleHours.toFixed(1)],
          ].map(([label, value]) => (
            <div key={label} className="card text-sm"><p>{label}</p><p className="text-lg font-semibold">{value}</p></div>
          ))}
        </article>

        <article className="card h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0B7A3B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="card h-64">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={dashboard.funnel} isAnimationActive fill="#5B2A5E" />
            </FunnelChart>
          </ResponsiveContainer>
        </article>

        <article className="card overflow-auto">
          <h3 className="font-semibold mb-2">Connections to sales</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left"><th>Buyer</th><th>Farmer</th><th>Kg req</th><th>Kg delivered</th><th>Value</th><th>Source</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.connections.map((connection) => {
                const order = data.orders.find((item) => item.id === connection.orderId)
                const buyer = data.users.find((item) => item.id === connection.buyerId)
                const farmer = data.users.find((item) => item.id === connection.farmerId)
                const value = connection.kgDelivered * connection.agreedPricePerKg
                return (
                  <tr key={connection.id}>
                    <td>{buyer?.name || '-'}</td>
                    <td>{farmer?.name || 'shortfall'}</td>
                    <td>{order?.kgRequested || connection.kgCommitted}</td>
                    <td>{connection.kgDelivered}</td>
                    <td>R {value.toFixed(2)}</td>
                    <td>{connection.sourceChannel}</td>
                    <td>{connection.status === 'Sale Completed' ? 'Yes ✅' : `No (${connection.status})`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </article>

        <article className="card text-sm">
          <h3 className="font-semibold">Breakdowns</h3>
          <p>By source channel: {[...new Set(data.connections.map((connection) => connection.sourceChannel))].join(', ')}</p>
          <p>By registration type: self {data.connections.filter((connection) => connection.registrationTypeOfFarmer === 'self').length}, coordinator {data.connections.filter((connection) => connection.registrationTypeOfFarmer === 'coordinator').length}</p>
          <p>By verification at match: verified {data.connections.filter((connection) => connection.verificationStatusAtMatch === 'Verified').length}</p>
        </article>

        <article className="card text-sm">
          <h3 className="font-semibold">Lost connections</h3>
          <ul>
            {lost.map((connection) => (
              <li key={connection.id}>{connection.status} - {connection.lostReason || 'n/a'}</li>
            ))}
          </ul>
        </article>
      </section>
    )
  }

  const renderProfile = () => (
    <section className="grid gap-3">
      <article className="card">
        <p className="font-semibold">{currentUser.name}</p>
        <p className="text-sm">{currentUser.phone} · {currentUser.village}</p>
        <p className="text-sm">Role: {currentUser.role} · Registration: {currentUser.registrationType}</p>
      </article>

      {role === 'coordinator' && (
        <form
          className="card grid gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            setSelectedRole('farmer')
            registerUser(new FormData(event.currentTarget), 'coordinator')
            event.currentTarget.reset()
          }}
        >
          <h3 className="font-semibold">Coordinator-assisted farmer registration</h3>
          <input className="input" name="name" placeholder="Farmer name" required />
          <input className="input" name="phone" placeholder="0XX XXX XXXX" required />
          <input className="input" name="pin" placeholder="4-digit PIN" required />
          <select className="input" name="village">
            {villages.map((village) => (<option key={village}>{village}</option>))}
          </select>
          <select className="input" name="channel"><option>App</option><option>SMS</option><option>WhatsApp</option></select>
          <input className="input" name="farmSizeHa" type="number" placeholder="Farm size" required />
          <label className="text-sm"><input name="consentShareContacts" type="checkbox" /> Consent to share matched contact details</label>
          <button className="btn-primary">Register farmer offline/online</button>
        </form>
      )}

      <article className="card text-sm">
        <p>Demo credentials:</p>
        <p>Farmer {demoCredentials.farmer.phone} / {demoCredentials.farmer.pin}</p>
        <p>Buyer {demoCredentials.buyer.phone} / {demoCredentials.buyer.pin}</p>
        <p>Coordinator {demoCredentials.coordinator.phone} / {demoCredentials.coordinator.pin}</p>
      </article>

      <button className="pill chip-red" onClick={() => {
        const seeded = resetData()
        setData(seeded)
        setMatchResults({})
        setSelectedPlanOrderId(null)
      }}>Reset demo data</button>

      <button className="pill" onClick={() => {
        setCurrentUserId(null)
        setAuthStep('splash')
      }}>Log out</button>
    </section>
  )

  const tabView: Record<string, ReactNode> = {
    Marketplace: renderMarketplace(),
    Orders: renderOrders(),
    Availability: renderAvailability(),
    Verification: renderVerification(),
    'Verification Queue': renderVerificationQueue(),
    'My Connections': renderConnections(),
    Dashboard: renderDashboard(),
    Profile: renderProfile(),
  }

  return (
    <main className="min-h-screen bg-white text-[#243238] pb-24">
      <header className="bg-[#1F5E2B] text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-bold text-xl">IFarma</p>
            <p className="text-xs">{t('supporting')}</p>
          </div>
          <button className="pill" onClick={() => setLang(lang === 'en' ? 'xh' : 'en')}>{lang.toUpperCase()}</button>
        </div>
        <div className="flex items-center justify-between mt-3 text-xs">
          <span>{online ? t('synced') : `${t('offline')} · ${data.pendingQueue.length} ${t('pending')}`}</span>
          <div className="flex gap-2 items-center">
            <button className="pill" onClick={() => setForceOffline((prev) => !prev)}>{forceOffline ? 'Go online' : 'Go offline'}</button>
            <button className="pill" disabled={!data.pendingQueue.length || syncing} onClick={runSync}>{syncing ? 'Syncing...' : 'Sync now'}</button>
          </div>
        </div>
      </header>

      <section className="p-4">
        {message && <p className="text-sm mb-2 text-[#1F5E2B]">{message}</p>}
        {tabView[activeTab] || null}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#CFE8D8] p-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${roleTabs[role].length > 5 ? 3 : roleTabs[role].length}, minmax(0, 1fr))` }}>
        {roleTabs[role].map((tab) => (
          <button key={tab} className={`pill ${activeTab === tab ? 'pill-active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </nav>
    </main>
  )
}

export default App
