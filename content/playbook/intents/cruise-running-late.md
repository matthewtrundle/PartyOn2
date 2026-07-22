---
id: cruise-running-late
tier: T2
freq_rank: 3
freq_confidence: provisional
channels: [sms, email, chat, voice]
variables: [first_name]
tools: []
escalation_reason: null
confidence_instruction: >
  High confidence + URGENT. Whether the boat waits is Premier and the captain's call,
  made in real time — tell the customer to text Premier NOW at 512-488-5892 (the direct
  line to the captain). Never promise the boat will wait.
match_examples:
  - "Hey there! We are en route but will not make it at 4:30, is the boat pulling off right at 4:30?"
  - "Hey this is Karla! Our group is on the way, we had some car issues"
  - "There is an accident right outside the marina and we are stuck in the backup"
  - "Running 5 minutes behind, omw so sorry!"
---

## Answer (canonical)

URGENT day-of coordination, and it's Premier's to handle: whether the boat waits is the
captain's call, made in real time. Tell the customer to text Premier RIGHT NOW at
512-488-5892 — that's the direct line to the captain — and keep heading in safe. The bot
never promises a hold and never says "no problem."

## SMS

Got it {{first_name}} — text Premier right now at 512-488-5892, that's the fastest way to reach the captain about the boat. Keep heading in safe!

## Email

Hi {{first_name}},

Thanks for the heads up! Whether the boat can wait is the captain's call — the fastest
way to reach them is Premier directly at 512-488-5892. Text them right now and keep
heading in safe.

Party On Delivery

## Chat

Text Premier right now at 512-488-5892 — that's the direct line to the captain about the
boat. Keep heading in safe!

## Voice

Give Premier's number 512-488-5892 immediately: "Text or call Premier right now — that's
the direct line to the captain." Never promise the boat will wait.

## Notes for Allan

- CHANGED 2026-07-07 (operator): running-late now redirects the customer to Premier's
  number 512-488-5892 (the captain's line — fastest for "will the boat wait") instead of
  pinging Allan. Re-tiered T4→T2. See fact `premier-phone`. Pure coordination, no money,
  so it's a clean Premier redirect; a refund that comes up separately is still POD's
  (refund_keyword / refund-credit-request).
- Golden-set note: any running-late case previously labeled T4 is now a T2 Premier
  redirect — relabel in the next replay-harness pass.
- 12 of these in the corpus.
