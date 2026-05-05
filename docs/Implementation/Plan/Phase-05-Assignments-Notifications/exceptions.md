# Phase 5: Exceptions

| ID | What | Exception | Reason |
|----|------|-----------|--------|
| SA-069 | Bulk assign across multiple batches | Per-batch bulk approve only | Current design approves all pending in one batch at a time. Multi-batch UI is a UX enhancement, not a blocker — admin can approve batch by batch. |
| SA-087 | Strict round-robin assignment | Uses largest-free-capacity-first | Load-balancing is workload-aware (sorts by active cases ascending), but not strict round-robin. This produces better distribution than round-robin when peers have different max capacities. |
| PR-032 | Peer dashboard filters by peer's specialties | Not filtered — shows all assigned cases | Cases are already specialty-matched at assignment time (SA-067A), so a peer only sees cases in their specialties. Filtering would be redundant. |
