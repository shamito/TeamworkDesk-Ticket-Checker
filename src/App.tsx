import { useEffect, useMemo, useState } from 'react'
import SearchForm from './components/SearchForm'
import CustomerPicker from './components/CustomerPicker'
import TicketsTable from './components/TicketsTable'
import { searchCustomers, fetchTicketsByCustomer, fetchActiveTickets, fetchTicketStatuses } from './services/teamwork'
import type { ActiveTicketsResult } from './services/teamwork'
import type { TeamworkCustomer, TeamworkTicket, TicketStatus } from './types'
import './App.css'

type AppState =
  | { phase: 'idle' }
  | { phase: 'loading'; message: string }
  | { phase: 'pickCustomer'; customers: TeamworkCustomer[] }
  | { phase: 'results'; tickets: TeamworkTicket[]; customer: TeamworkCustomer }
  | { phase: 'error'; message: string }

type SortKey = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc'

const DASHBOARD_TABS = [
  { value: 'active',   label: 'Active' },
  { value: 'waiting',  label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed',   label: 'Closed' },
  { value: 'all',      label: 'All' },
]

const RESULTS_TABS = [
  { value: 'all',      label: 'All' },
  { value: 'active',   label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed',   label: 'Closed' },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'updated_desc', label: 'Last updated ↓' },
  { value: 'updated_asc',  label: 'Last updated ↑' },
  { value: 'created_desc', label: 'Created ↓' },
  { value: 'created_asc',  label: 'Created ↑' },
]

// Maps tab values to name substrings for custom status lookup.
// "Solved" (ID 5) doesn't contain "resolved", so we use "solv" to match both.
const TAB_PATTERN: Record<string, string> = {
  resolved: 'solv',   // matches "Solved" and "Resolved"
  closed:   'clos',   // matches "Closed"
}

function statusIdsByPattern(statusesById: Record<number, TicketStatus>, tabValue: string): Set<number> {
  const pattern = TAB_PATTERN[tabValue] ?? tabValue
  return new Set(
    Object.values(statusesById)
      .filter(s => s.name.toLowerCase().includes(pattern))
      .map(s => s.id)
  )
}

type DashboardSets = Record<'active' | 'waiting' | 'resolved' | 'closed' | 'all', TeamworkTicket[]>

export default function App() {
  const [state, setState] = useState<AppState>({ phase: 'idle' })
  const [statusesById, setStatusesById] = useState<Record<number, TicketStatus>>({})

  // Dashboard
  const [dashboard, setDashboard] = useState<ActiveTicketsResult | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)
  const [dashboardStatus, setDashboardStatus] = useState('active')

  // Customer results filters (client-side)
  const [resultsStatus, setResultsStatus] = useState('all')
  const [resultsSort, setResultsSort] = useState<SortKey>('updated_desc')

  useEffect(() => {
    fetchTicketStatuses().then(setStatusesById).catch(() => {})
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setDashboardLoading(true)
    try {
      const result = await fetchActiveTickets()
      setDashboard(result)
    } catch {
      setDashboard({ tickets: [], usersById: {}, customersById: {} })
    } finally {
      setDashboardLoading(false)
    }
  }

  // All tickets are state=active — "Resolved"/"Closed" are custom statuses, not API states.
  // Filter each tab by matching the custom status name.
  const dashboardSets = useMemo((): DashboardSets => {
    const empty: DashboardSets = { active: [], waiting: [], resolved: [], closed: [], all: [] }
    if (!dashboard) return empty
    const { tickets } = dashboard
    const activeIds   = statusIdsByPattern(statusesById, 'active')
    const waitingIds  = statusIdsByPattern(statusesById, 'waiting')
    const resolvedIds = statusIdsByPattern(statusesById, 'resolved')
    const closedIds   = statusIdsByPattern(statusesById, 'closed')
    return {
      active:   tickets.filter(t => activeIds.size === 0 || activeIds.has(t.status?.id)),
      waiting:  tickets.filter(t => waitingIds.size > 0 && waitingIds.has(t.status?.id)),
      resolved: tickets.filter(t => resolvedIds.size > 0 && resolvedIds.has(t.status?.id)),
      closed:   tickets.filter(t => closedIds.size > 0 && closedIds.has(t.status?.id)),
      all:      tickets,
    }
  }, [dashboard, statusesById])

  const currentDashboardTickets = dashboardSets[dashboardStatus as keyof DashboardSets] ?? dashboardSets.all

  async function handleSearch(query: string) {
    setState({ phase: 'loading', message: 'Loading customers…' })
    try {
      const customers = await searchCustomers(query)
      if (customers.length === 0) {
        setState({ phase: 'error', message: `No customers found matching "${query}".` })
      } else if (customers.length === 1) {
        await loadTickets(customers[0])
      } else {
        setState({ phase: 'pickCustomer', customers })
      }
    } catch (err) {
      setState({ phase: 'error', message: (err as Error).message })
    }
  }

  async function loadTickets(customer: TeamworkCustomer) {
    setState({ phase: 'loading', message: 'Fetching all tickets…' })
    setResultsStatus('all')
    setResultsSort('updated_desc')
    try {
      const tickets = await fetchTicketsByCustomer(customer)
      setState({ phase: 'results', tickets, customer })
    } catch (err) {
      setState({ phase: 'error', message: (err as Error).message })
    }
  }

  function reset() {
    setState({ phase: 'idle' })
  }

  // Client-side filter + sort for customer results — filter by custom status name
  const filteredTickets = useMemo(() => {
    if (state.phase !== 'results') return []
    let list = [...state.tickets]
    if (resultsStatus !== 'all') {
      const ids = statusIdsByPattern(statusesById, resultsStatus)
      list = ids.size > 0
        ? list.filter(t => ids.has(t.status?.id))
        : list.filter(t => t.state?.toLowerCase() === resultsStatus)
    }
    list.sort((a, b) => {
      const field = resultsSort.startsWith('updated') ? 'updatedAt' : 'createdAt'
      const diff = new Date(a[field]).getTime() - new Date(b[field]).getTime()
      return resultsSort.endsWith('asc') ? diff : -diff
    })
    return list
  }, [state, resultsStatus, resultsSort, statusesById])

  const isLoading = state.phase === 'loading'

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <button className="title-btn" onClick={reset}>Teamwork Ticket Lookup</button>
        </h1>
        <p className="app-subtitle">Find support tickets by customer name or email</p>
      </header>

      <main className="app-main">
        <SearchForm onSearch={handleSearch} loading={isLoading} />

        {state.phase === 'loading' && (
          <div className="loading-state">
            <div className="spinner" />
            <span>{state.message}</span>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="error-state">
            <strong>Error:</strong> {state.message}
            <button className="reset-btn" onClick={reset}>Try again</button>
          </div>
        )}

        {state.phase === 'pickCustomer' && (
          <CustomerPicker customers={state.customers} onSelect={loadTickets} />
        )}

        {state.phase === 'results' && (
          <>
            <div className="toolbar">
              <div className="filter-tabs">
                {RESULTS_TABS.map(tab => {
                  let count: number | undefined
                  if (tab.value !== 'all') {
                    const ids = statusIdsByPattern(statusesById, tab.value)
                    count = ids.size > 0
                      ? state.tickets.filter(t => ids.has(t.status?.id)).length
                      : state.tickets.filter(t => t.state?.toLowerCase() === tab.value).length
                  }
                  return (
                    <button
                      key={tab.value}
                      className={`filter-tab ${resultsStatus === tab.value ? 'active' : ''}`}
                      onClick={() => setResultsStatus(tab.value)}
                    >
                      {tab.label}
                      {count !== undefined && (
                        <span className="tab-count">{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <select
                className="sort-select"
                value={resultsSort}
                onChange={e => setResultsSort(e.target.value as SortKey)}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <TicketsTable
              tickets={filteredTickets}
              customerName={`${state.customer.firstName} ${state.customer.lastName}`}
              customersById={{ [state.customer.id]: [state.customer.firstName, state.customer.lastName].filter(Boolean).join(' ') || state.customer.email }}
              statusesById={statusesById}
            />
            <button className="reset-btn secondary" onClick={reset}>New search</button>
          </>
        )}

        {state.phase === 'idle' && (
          <section className="dashboard">
            <div className="section-header">
              <h2 className="dashboard-title">Tickets</h2>
              <div className="filter-tabs">
                {DASHBOARD_TABS.map(tab => {
                  const count = tab.value !== 'all'
                    ? dashboardSets[tab.value as keyof DashboardSets].length
                    : undefined
                  return (
                    <button
                      key={tab.value}
                      className={`filter-tab ${dashboardStatus === tab.value ? 'active' : ''}`}
                      onClick={() => setDashboardStatus(tab.value)}
                    >
                      {tab.label}
                      {count !== undefined && (
                        <span className="tab-count">{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                className="refresh-btn"
                onClick={loadDashboard}
                disabled={dashboardLoading}
                title="Refresh tickets"
              >
                ↻
              </button>
            </div>

            {dashboardLoading || dashboard === null ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading tickets…</span>
              </div>
            ) : (
              <TicketsTable
                tickets={currentDashboardTickets}
                usersById={dashboard.usersById}
                customersById={dashboard.customersById}
                statusesById={statusesById}
              />
            )}
          </section>
        )}
      </main>
    </div>
  )
}
