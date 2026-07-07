---
id: spam-vendor
tier: T1
freq_rank: 29
freq_confidence: provisional
channels: [sms, email, chat]
variables: []
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence for cold B2B sales blasts, OTP/verification codes, phishing, and
  marketing spam. The correct action is NO REPLY — replying to spam confirms a live
  number/inbox.
match_examples:
  - "Hi! Would you like to simplify earnings & track inventory with our Point of Sales system? Reply YES for a demo"
  - "542038 is your Amazon OTP. Don't share it with anyone."
  - "Your Facebook account will be disabled for violating Community Standards"  # phishing
  - "I work with Half Price Packaging, we help brands with custom packaging"
---

## Answer (canonical)

No reply. Ever. Mark/skip and move on. Distinguish carefully from
partner-affiliate-inquiry: a named local business proposing something specific to POD is
a partner lead; a template blast that could have been sent to any business is spam. When
genuinely unsure → unknown-low-confidence (T3), not a reply.

## SMS

(no reply)

## Email

(no reply)

## Chat

(no reply — end chat politely only if a human is present: "This looks automated, so I'll
close this chat. If you're a real person with a Party On question, just say so!")

## Notes for Allan

- 69+ in the corpus (OTPs, POS-system blasts, packaging vendors, phishing). The card
  exists so the classifier has a home for these and the golden set can verify the
  no-reply behavior.
