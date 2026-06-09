import type { TeamworkTicket, TicketStatus } from '../types'

interface Props {
  tickets: TeamworkTicket[]
  customerName?: string
  usersById?: Record<number, string>
  customersById?: Record<number, string>
  statusesById?: Record<number, TicketStatus>
}

// Fallback colours when a custom status has no colour or when statusesById isn't loaded yet
const STATE_COLOUR: Record<string, string> = {
  active:   '#1976d2',
  open:     '#1976d2',
  resolved: '#388e3c',
  closed:   '#757575',
  pending:  '#f57c00',
  spam:     '#d32f2f',
  deleted:  '#9e9e9e',
  archived: '#9e9e9e',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function badge(label: string, colour: string) {
  return (
    <span
      className="badge"
      style={{ backgroundColor: colour + '1a', color: colour, borderColor: colour + '40' }}
    >
      {label}
    </span>
  )
}

export default function TicketsTable({ tickets, customerName, usersById, customersById, statusesById }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="empty-state">
        {customerName
          ? <>No accessible tickets found for <strong>{customerName}</strong>.</>
          : 'No active tickets found.'}
        <span className="empty-state-hint">Archived tickets are not returned by the Teamwork API.</span>
      </div>
    )
  }

  const unreadCount = tickets.filter(t => !t.isRead).length

  return (
    <div className="table-wrapper">
      <p className="result-summary">
        <strong>{tickets.length}</strong> ticket{tickets.length !== 1 ? 's' : ''}
        {customerName && <> for <strong>{customerName}</strong></>}
        {unreadCount > 0 && (
          <span className="unread-count">{unreadCount} new</span>
        )}
      </p>
      <table className="tickets-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Subject</th>
            <th>Requester</th>
            <th>Status</th>
            {usersById && <th>Assigned To</th>}
            <th>Msgs</th>
            <th>Created</th>
            <th>Last updated</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} className={!t.isRead ? 'row-unread' : ''}>
              <td className="ticket-id">
                <a
                  href={`${__TEAMWORK_BASE_URL__}/desk/tickets/${t.id}/messages`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ticket-id-link"
                >
                  {t.id}
                </a>
              </td>
              <td className="ticket-subject">{t.subject}</td>
              <td className="ticket-requester">
                {customersById
                  ? (customersById[t.customer?.id] ?? <span className="unassigned">—</span>)
                  : <span className="unassigned">—</span>}
              </td>
              <td>{(() => {
                const custom = statusesById?.[t.status?.id]
                const label  = custom?.name ?? t.state ?? '—'
                const colour = custom?.color
                  ? custom.color
                  : (STATE_COLOUR[t.state?.toLowerCase()] ?? '#757575')
                return badge(label, colour)
              })()}</td>
              {usersById && (
                <td className="ticket-agent">
                  {t.agent ? (usersById[t.agent.id] ?? '—') : <span className="unassigned">Unassigned</span>}
                </td>
              )}
              <td className="ticket-count">{t.messageCount}</td>
              <td className="ticket-date">{formatDate(t.createdAt)}</td>
              <td className="ticket-date">{formatDate(t.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
