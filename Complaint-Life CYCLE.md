┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPLAINT LIFECYCLE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   RECEIVED   │ ──→ │ IN PROGRESS  │ ──→ │   RESOLVED   │ ──→ │    CLOSED    │
│              │     │              │     │              │     │   (LOCKED)   │
│ • New ticket │     │ • Assigned   │     │ • Work done  │     │ • Positive   │
│ • AI process │     │   to member  │     │ • Awaiting   │     │   feedback   │
│   (optional) │     │ • Being      │     │   feedback   │     │ • Image      │
│ • Notify     │     │   worked on  │     │              │     │   deleted    │
│   admins     │     │              │     │              │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                │
                                                │ If negative feedback
                                                ▼
                                         ┌──────────────┐
                                         │   REOPENED   │
                                         │              │
                                         │ • isReopened │
                                         │   = true     │
                                         │ • Back to    │
                                         │   In Progress│
                                         └──────────────┘