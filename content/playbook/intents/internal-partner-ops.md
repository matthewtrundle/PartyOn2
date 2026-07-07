---
id: internal-partner-ops
tier: T4
freq_rank: 30
freq_confidence: provisional
channels: [sms, email]
variables: []
tools: []
escalation_reason: low_confidence
confidence_instruction: >
  Always output CONFIDENCE: 0.2 — these are not customers. Premier staff/captains,
  vendors, lenders, our own team coordinating. The bot must NOT roleplay customer
  service at colleagues; route silently.
match_examples:
  - "Emily should almost be there at the marina. I won't be there but Brett will be"
  - "Just to confirm, you're authorizing me to run the full $12,665.84 today to cover both installments?"
  - "Give captain Kramer a call when you arrive and he will help direct you"
  - "Thank you so much for reaching out to Simply XO Events! Our team is out of office for this weekend's weddings"  # vendor OOO
---

## Answer (canonical)

NO auto-reply. Route to Allan's attention (standard; urgent if day-of boat coordination).
A bot cheerfully answering the captain, a lender, or a vendor OOO with customer-service
copy is the fastest way to look broken — silence + human routing is correct. Known
internal senders should eventually be allow-listed out of the pipeline entirely.

## SMS

(no auto-reply — route to Allan)

## Email

(no auto-reply — route to Allan)

## Notes for Allan

- 29 in the corpus incl. captains, Premier coordination (Kenny/Brian), PeopleFund loan
  threads, vendor OOO bots. When the CRM is live, an allow-list of internal/partner
  numbers+domains should bypass the AI inbox entirely — flagged in the review package.
- Finance-sensitive threads (loans!) must never get an AI reply — extra reason this is
  T4 hard-routed.
