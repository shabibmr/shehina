---
status: accepted
---

# A Shipment's Stage is set by its Steps, not by hand

Investors follow a fixed Stage sequence (Goods purchased to Goods sold), while the actual work is tracked as a per-Shipment Step plan. Instead of letting ops advance Stages by hand next to the Steps, a Step can carry a Stage tag. A Shipment reaches a Stage once every Step tagged with it, or an earlier one, is done (and verified where required), or skipped with a reviewer's approval. A Stage never goes backwards. This means the Stage investors see can never disagree with the documented work behind it.

## Considered options

- **Two unlinked tracks**, with ops advancing Stages by hand and the Steps shown alongside. Rejected: the two could disagree.
- **Five fixed milestone Steps**, one per Stage, that can't be removed. Rejected in favour of tagging, which lets the Manager and the reviewer shape the plan freely as long as every Stage has at least one tagged Step.
- **Ops advances Stages, but only once the related Steps are done.** Rejected as a manual step that adds nothing.
