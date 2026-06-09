import type { TeamworkCustomer } from '../types'

interface Props {
  customers: TeamworkCustomer[]
  onSelect: (customer: TeamworkCustomer) => void
}

export default function CustomerPicker({ customers, onSelect }: Props) {
  return (
    <div className="customer-picker">
      <p className="picker-label">
        {customers.length} customer{customers.length !== 1 ? 's' : ''} found — select one:
      </p>
      <ul className="customer-list">
        {customers.map((c) => (
          <li key={c.id}>
            <button className="customer-item" onClick={() => onSelect(c)}>
              <span className="customer-name">
                {[c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)'}
              </span>
              <span className="customer-meta">
                <span className="customer-email">{c.email}</span>
                {c.numTickets > 0 && (
                  <span className="customer-ticket-count">
                    {c.numTickets} ticket{c.numTickets !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
