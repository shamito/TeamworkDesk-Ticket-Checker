export interface TeamworkCustomer {
  id: number
  firstName: string
  lastName: string
  email: string
  organization: string
  jobTitle: string | null
  phone: string
  mobile: string
  numTickets: number
  numVisibleTickets: number
  standing: string
  avatarURL: string
  state: string
  createdAt: string
  updatedAt: string
}

export interface TeamworkTicket {
  id: number
  subject: string
  summary: string
  state: string
  messageCount: number
  previewText: string
  isRead: boolean
  customer: { id: number; type: string }
  contact: { id: number; type: string }
  status: { id: number; type: string }
  agent?: { id: number; type: string }
  createdAt: string
  updatedAt: string
}

export interface TicketStatus {
  id: number
  name: string
  color?: string
  order?: number
  default?: boolean
}

export interface TicketStatusesResponse {
  ticketstatuses: TicketStatus[]
  meta?: {
    count?: number
    page?: { current?: number; next?: number | null }
  }
}

export interface CustomersResponse {
  customers: TeamworkCustomer[]
  meta?: {
    count?: number
    page?: { current?: number; next?: number | null }
  }
}

export interface TeamworkUser {
  id: number
  firstName: string
  lastName: string
  avatarURL?: string
}

export interface TicketsResponse {
  tickets: TeamworkTicket[]
  included?: {
    users?: TeamworkUser[]
    customers?: TeamworkCustomer[]
  }
  meta?: {
    count?: number
    page?: { current?: number; next?: number | null }
  }
  pagination?: {
    records: number
    pageSize: number
    pages: number
    page: number
    hasMorePages: boolean
  }
}
