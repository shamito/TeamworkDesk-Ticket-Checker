import type { CustomersResponse, TeamworkCustomer, TeamworkTicket, TicketStatus, TicketStatusesResponse, TicketsResponse } from '../types'

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Teamwork API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function searchCustomers(query: string): Promise<TeamworkCustomer[]> {
  const params = new URLSearchParams({
    search: query.trim(),
    pageSize: '50',
    orderBy: 'firstName',
    orderMode: 'asc',
  })
  const data = await apiFetch<CustomersResponse>(`/desk/api/v2/search/customers.json?${params}`)
  return data.customers ?? []
}

// Per-ID customer cache — avoids re-fetching the same customer across calls
const customerByIdCache: Record<number, TeamworkCustomer> = {}

async function fetchCustomerById(id: number): Promise<TeamworkCustomer | null> {
  if (customerByIdCache[id]) return customerByIdCache[id]
  try {
    const data = await apiFetch<{ customer: TeamworkCustomer }>(`/desk/api/v2/customers/${id}.json`)
    customerByIdCache[id] = data.customer
    return data.customer
  } catch {
    return null
  }
}

async function resolveCustomerNames(ids: number[]): Promise<Record<number, string>> {
  const unique = [...new Set(ids)]
  const results = await Promise.all(unique.map(fetchCustomerById))
  const map: Record<number, string> = {}
  for (const c of results) {
    if (c) {
      map[c.id] = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email
    }
  }
  return map
}

// ── Ticket statuses ──────────────────────────────────────────────────────────

let statusCache: Record<number, TicketStatus> | null = null

export async function fetchTicketStatuses(): Promise<Record<number, TicketStatus>> {
  if (statusCache) return statusCache

  const all: TicketStatus[] = []
  let page = 1
  const PAGE_SIZE = 100

  while (true) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) })
    const data = await apiFetch<TicketStatusesResponse>(`/desk/api/v2/ticketstatuses.json?${params}`)
    const batch = data.ticketstatuses ?? []
    all.push(...batch)
    if (batch.length < PAGE_SIZE || data.meta?.page?.next == null) break
    page++
  }

  statusCache = {}
  for (const s of all) {
    statusCache[s.id] = s
  }
  return statusCache
}

// ── Tickets ──────────────────────────────────────────────────────────────────

export interface ActiveTicketsResult {
  tickets: TeamworkTicket[]
  usersById: Record<number, string>
  customersById: Record<number, string>
}

// The Desk API only has state=active/scheduled/merged/deleted — "Resolved" and "Closed"
// are custom ticketstatus labels on state=active tickets, so one fetch covers everything.
export async function fetchActiveTickets(): Promise<ActiveTicketsResult> {
  const params = new URLSearchParams({
    pageSize: '100',
    orderBy: 'updatedAt',
    orderMode: 'desc',
    includes: 'users',
    status: 'active',
  })
  const data = await apiFetch<TicketsResponse>(`/desk/api/v2/tickets.json?${params}`)
  const tickets = data.tickets ?? []

  const usersById: Record<number, string> = {}
  for (const u of data.included?.users ?? []) {
    usersById[u.id] = [u.firstName, u.lastName].filter(Boolean).join(' ')
  }

  const customerIds = tickets.map(t => t.customer?.id).filter((id): id is number => !!id)
  const customersById = await resolveCustomerNames(customerIds)

  return {
    tickets: [...tickets.filter(t => !t.isRead), ...tickets.filter(t => t.isRead)],
    usersById,
    customersById,
  }
}

export async function fetchTicketsByCustomer(customer: TeamworkCustomer): Promise<TeamworkTicket[]> {
  // Seed the cache so the table can resolve this customer's name without extra calls
  customerByIdCache[customer.id] = customer

  const all: TeamworkTicket[] = []
  let page = 1

  while (true) {
    const params = new URLSearchParams({
      search: customer.email,
      exact: 'true',
      page: String(page),
      pageSize: '50',
    })
    const data = await apiFetch<TicketsResponse>(`/desk/api/v2/search/tickets.json?${params}`)
    all.push(...(data.tickets ?? []))
    const hasMore = data.pagination?.hasMorePages ?? (data.meta?.page?.next != null)
    if (!hasMore) break
    page++
  }

  return all
}
