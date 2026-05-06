# Company Status — State Diagram & Operations Matrix

## Status Flow

```
                          +--------+
                          |  LEAD  |
                          +---+----+
                              |
                     [Send Contract]
                              |
                          +---v------+
                          | PROSPECT |
                          +---+------+
                              |
                     [Send Contract]
                              |
                      +-------v--------+
                      | CONTRACT_SENT  |
                      +---+--------+---+
                          |        |
               [DocuSign  |        | [DocuSign
                 signs]   |        |  declines]
                          |        |
              +-----------v--+     +---v------+
              |CONTRACT_SIGN.|     | PROSPECT |
              |   (manual)   |     | (revert) |
              +------+-------+     +----------+
                     |
           [Activate Portal]
                     |                  +-------v--------+
                     |    [auto via     | ACTIVE_CLIENT  |
                     +--- DocuSign]--->  | (auto-promoted)|
                     |                  +-------+--------+
                 +---v---+                      |
                 | ACTIVE |         [Admin sets in_cycle]
                 |(legacy)|                     |
                 +---+----+              +------v-----+
                     |                   |  IN_CYCLE   |
                     |                   +------+------+
                     |                          |
                     +---------+----------------+
                               |
                      [Archive (if no
                       active cases)]
                               |
                         +-----v-----+
                         |  ARCHIVED  |
                         +-----------+
```

## Status Descriptions

| Status | Description |
|---|---|
| **Lead** | First contact. Company just entered the system. |
| **Prospect** | Qualified lead. Ready for contract discussion. |
| **Contract Sent** | Service agreement + BAA generated and sent via DocuSign. |
| **Contract Signed** | DocuSign completed (if not auto-promoted to Active Client). |
| **Active** | Legacy status. Portal activated manually via admin. |
| **Active Client** | Modern flow. Auto-promoted when DocuSign envelope is signed. |
| **In Cycle** | Active client with review cycles running. Admin-set. |
| **Archived** | Deactivated. No operations allowed. Requires no active cases. |

## Transition Triggers

| From | To | Trigger | Endpoint |
|---|---|---|---|
| Lead | Contract Sent | Admin clicks "Send Contract" | `POST /api/contracts/generate` |
| Prospect | Contract Sent | Admin clicks "Send Contract" | `POST /api/contracts/generate` |
| Contract Sent | Active Client | DocuSign envelope signed | `POST /api/webhooks/docusign` (auto) |
| Contract Sent | Prospect | DocuSign envelope declined | `POST /api/webhooks/docusign` (auto) |
| Contract Signed | Active | Admin clicks "Activate Portal" | `POST /api/companies/{id}/activate` |
| Any | Archived | Admin archives (no active cases) | `PATCH /api/companies/{id}` |
| Any | Any | Admin direct status change | `PATCH /api/companies/{id}` |

## Operations Matrix by Status

| Operation | Lead | Prospect | Contract Sent | Contract Signed | Active | Active Client | In Cycle | Archived |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Edit Company** | Y | Y | Y | Y | Y | Y | Y | Y* |
| **Add Providers** | Y | Y | Y | Y | Y | Y | Y | Y |
| **Import Providers (CSV)** | Y | Y | Y | Y | Y | Y | Y | Y |
| **Create Forms** | Y | Y | Y | Y | Y | Y | Y | Y |
| **Send Contract** | Y | Y | - | - | - | - | - | - |
| **Activate Portal** | - | - | - | Y | - | - | - | - |
| **Upload Batches** | - | - | - | - | Y | Y | Y | - |
| **Suggest Assignments** | - | - | - | - | Y | Y | Y | - |
| **Generate Invoices** | - | - | - | - | Y | Y | Y | - |
| **Generate Reports** | - | - | - | - | Y | Y | Y | - |
| **Download All Reports** | - | - | - | - | Y | Y | Y | - |
| **Archive Company** | Y | Y | Y | Y | Y** | Y** | Y** | - |

**Legend:** Y = Allowed, - = Blocked

\* Archived: Edit allowed but cannot re-archive with active cases.
\** Active/Active Client/In Cycle: Archive blocked if company has active review cases (unassigned, assigned, in_progress). Must complete or reassign all cases first.

## UI Elements by Status

### Prospect Pipeline Card Buttons

| Status | Button | Style |
|---|---|---|
| Lead | _(no action button)_ | — |
| Prospect | Generate Contract | Blue |
| Contract Sent | Resend / View | Amber outline (warns if >7 days) |
| Contract Signed | Grant Portal Access | Green |
| Active Client | View | Blue outline |
| In Cycle | _(managed from detail page)_ | — |

### Company Detail Page Header Buttons

| Status | Buttons Shown |
|---|---|
| Lead | Send Contract, Edit Company |
| Prospect | Send Contract, Edit Company |
| Contract Sent | Edit Company |
| Contract Signed | Activate Portal, Edit Company |
| Active / Active Client / In Cycle | Edit Company |
| Archived | _(no buttons)_ |

### Status Badge Colors

| Status | Badge Color |
|---|---|
| Lead | Gray (ink) |
| Prospect | Blue |
| Contract Sent | Amber |
| Contract Signed | Cobalt |
| Active | Mint (green) |
| Active Client | Mint (green) |
| In Cycle | Purple |
| Archived | Muted gray |

## Dropdown Visibility

| Dropdown Location | Lead | Prospect | Contract Sent | Contract Signed | Active* | Archived |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Companies List Page | Y | Y | Y | Y | Y | Y |
| Dashboard Filter | - | Y | Y | Y | Y | - |
| Forms Company Picker | - | Y | Y | Y | Y | - |
| Batch Wizard | - | Y | Y | Y | Y | - |
| Invoices Dropdown | - | Y | Y | Y | Y | - |
| Reports Page | - | - | - | - | Active only | - |

\* "Active" column includes Active, Active Client, and In Cycle.

## Guard Implementation

The status guards are implemented in `lib/utils/company-guard.ts`:

- **`requireActiveCompany(companyId)`** — Returns true only for `['active', 'active_client', 'in_cycle']`. Used by batches, invoices, reports, and assignment APIs.
- **`requireNonArchivedCompany(companyId)`** — Returns true for all statuses except `'archived'`. Used for general write operations.

## Notes

1. **Legacy "active" vs "active_client"**: Both are treated identically for operational purposes. Legacy `active` rows from before DocuSign integration are grandfathered in.
2. **Setup before activation**: Providers and forms can be configured from the Lead stage onward, so companies are ready to go when they reach Active.
3. **DocuSign auto-promotion**: When DocuSign webhook fires with a signed envelope, the company jumps directly from Contract Sent to Active Client, skipping Contract Signed.
4. **Archival safety**: Companies with in-flight cases (unassigned, assigned, or in_progress) cannot be archived until all cases are completed or reassigned.
