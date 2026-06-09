# TeamworkDesk Ticket Checker

An internal tool for **Awesomate.ai** to look up Teamwork Desk support tickets by customer name or email. Built for quick access to a customer's full ticket history without having to dig through the Teamwork UI.

## What it does

- **Customer search** — search by first name, last name, full name, or email address. If multiple customers match, pick from a list.
- **Ticket history** — fetches all tickets linked to that customer across all statuses (Active, Solved, Closed, Waiting on Customer).
- **Dashboard** — on load, shows the 100 most recently updated tickets across the board, filterable by tab:
  - **Active** — open tickets with the Active custom status
  - **Waiting** — tickets waiting on customer response
  - **Resolved** — tickets marked as Solved (custom status ID 5)
  - **Closed** — tickets marked as Closed (custom status ID 6)
  - **All** — everything unfiltered
- **Custom status labels** — status badges show the real Teamwork custom status name (e.g. "Waiting On Customer") fetched from `/desk/api/v2/ticketstatuses.json`, not just the raw API state.
- **Clickable ticket IDs** — each ticket ID links directly to the ticket in Teamwork Desk.
- **Sort & filter** — customer results can be sorted by last updated or created date, ascending or descending.

## Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| API proxy | Vite dev server proxy (injects Bearer auth header server-side) |
| Styling | Plain CSS (no framework) |
| API | Teamwork Desk API v2 |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Teamwork API key:

```bash
cp .env.example .env
```

```env
TEAMWORK_API_KEY=tkn.v1_your_key_here
VITE_TEAMWORK_BASE_URL=your_URL
```

The API key is injected by the Vite proxy at the server level — it never reaches the browser bundle.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Project structure

```text
src/
├── App.tsx                   # Root layout, search state, dashboard
├── App.css                   # All styles
├── types.ts                  # TypeScript interfaces for API responses
├── components/
│   ├── SearchForm.tsx         # Search input with clear button
│   ├── CustomerPicker.tsx     # Multi-match customer selector
│   └── TicketsTable.tsx       # Tickets table with status badges
└── services/
    └── teamwork.ts            # All Teamwork API calls + caching
```

## Notes

- The Teamwork Desk API `state` field only has `active`, `scheduled`, `merged`, `deleted` — there is no `resolved` or `closed` state. Tickets shown as "Solved" or "Closed" in the UI are `state=active` tickets with a custom `ticketstatus` applied.
- Customer name lookups are cached in memory per session to avoid redundant API calls.
- The `.env` file is gitignored — never commit your API key.
