# Batch Status — State Diagram & Operations Matrix

## Status Flow

```
                    ┌──────────┐
                    │ PENDING  │ ← Batch created via admin upload
                    └────┬─────┘
                         │
                   [Cases uploaded +
                    AI assignment run]
                         │
                    ┌────v────────┐
                    │ IN PROGRESS │ ← At least one case assigned/being reviewed
                    └────┬────────┘
                         │
                   [All cases completed]
                         │
                    ┌────v──────┐
                    │ COMPLETED │ ← All reviews submitted
                    └───────────┘

    Special status:
    ┌─────────────────────┐
    │ PENDING ADMIN REVIEW│ ← Client-submitted batch (from client portal)
    └─────────────────────┘
```

## Status Descriptions

| Status | Description |
|---|---|
| **Pending** | Batch created by admin. Cases uploaded but not yet assigned or AI analysis not started. |
| **In Progress** | Cases are being actively reviewed. At least some cases are assigned to peers. |
| **Completed** | All cases in the batch have been reviewed and submitted. |
| **Pending Admin Review** | Batch submitted by a client (from client portal). Admin needs to review before processing. |

## How Status Changes

Unlike companies and peers, batch status transitions are **not fully automated**. Key observations:

### Status is set at creation (line 94 of batches/route.ts):
```
const batchStatus = status || 'pending';
```
- Admin-created batches start as `pending`
- Client-submitted batches start as `pending_admin_review`

### Status is NOT automatically updated when:
- Cases get assigned → batch stays `pending` (should be `in_progress`)
- Cases get completed → batch stays `in_progress` (should check if all done)

### What IS automatically updated:
- `totalCases` — refreshed after case creation
- `completedCases` — incremented when a peer submits a review
- `projectedCompletion` — recalculated when assignments are approved
- `assignedCases` — tracked but not auto-updated by all paths

## Batch Fields

| Field | Description |
|---|---|
| `batch_name` | Display name (auto-filled from cadence period, e.g., "Q1 2026") |
| `company_id` | Which company this batch belongs to |
| `specialty` | Single specialty for the batch (or "Mixed" for multi-specialty) |
| `company_form_id` | The review form attached to this batch |
| `total_cases` | Total number of chart files uploaded |
| `assigned_cases` | Number of cases assigned to peers |
| `completed_cases` | Number of cases where review is submitted |
| `status` | pending / in_progress / completed / pending_admin_review |
| `projected_completion` | Estimated completion date based on due dates |
| `date_uploaded` | When the batch was created |

## Batch Progress Tracking

Progress is tracked by comparing `completed_cases` to `total_cases`:

```
Progress = completed_cases / total_cases × 100%
```

| Condition | Visual |
|---|---|
| `completed_cases = 0` | 0% — no reviews done |
| `0 < completed_cases < total_cases` | Partial — in progress |
| `completed_cases = total_cases` | 100% — all done |

## Operations Available on Batches

| Operation | Description |
|---|---|
| **Create batch** | Upload PDFs, select company + specialty + form |
| **Run AI Assignment** | AI suggests peer assignments for unassigned cases |
| **View AI Queue** | Navigate to approval queue for pending_approval cases |
| **Change form** | Switch the attached review form |
| **Upload additional PDFs** | Add more chart files to an existing batch |
| **View case detail** | Click Case Ref to see individual case |
| **Approve/Reassign/Unassign** | Per-case actions from the batch detail page |

## Batch Creation Flow

1. **Step 1** — Select company
2. **Step 2** — Select specialty (or Mixed)
3. **Step 3** — Select review form (auto-attached if only one exists)
4. **Step 4** — Enter batch name (auto-filled from cadence period) + upload PDFs
   - AI extracts provider name and encounter date from each PDF
   - Filename parsing matches provider to company's provider list
5. **Step 5** — Review summary + submit
6. **After creation** — AI assignment auto-runs, cases go to `pending_approval`

## Mixed Specialty Batches

When "Mixed" is selected in Step 2:
- Each uploaded file gets its own specialty assignment (from filename or AI extraction)
- Server splits into separate batches per specialty
- Each sub-batch gets its own form attached

## Notes

1. **Status gap**: Batch status doesn't automatically transition from `pending` → `in_progress` → `completed`. This should be automated based on case statuses within the batch.
2. **`assigned_cases` counter**: Not consistently updated across all assignment paths. `completed_cases` is more reliable (updated in the peer submit flow).
3. **Client-submitted batches**: Come through the client portal upload flow and start as `pending_admin_review`. Admin must review and approve before cases are processed.
4. **Projected completion**: Calculated from the due dates of assigned cases. Updated when assignments are approved.
