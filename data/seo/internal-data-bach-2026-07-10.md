# Internal bach-party data pull (2026-07-10, read-only)

Source: prod Postgres via read-only aggregates. Bach = `group_orders_v2` where `party_type IN (BACH, BACHELOR, BACHELORETTE)` OR name matches `bach`. All GroupOrderV2 data is 2026-only (system launched this year).

| Metric | Value |
|---|---|
| Bach dashboards created (Jan–Jul 2026) | **532** (of which 66 are BOAT-typed with bach names) |
| Paid orders linked to bach dashboards | 57 |
| Revenue on those orders | $18,755 |
| Avg / median order | $329 / $253 |
| Avg / median spend per group | $368 / $286 |
| Lead time (order → delivery) | **median 2 days**, avg 5.5 days |
| Avg sub-orders per dashboard | 1.1 |

Top products at bach parties (units): High Noon Variety 12pk **52**, Surfside Starter 8pk **38**, High Noon Tequila Seltzer 8pk **24**, Bottled Water 32pk **22**, Ice 20lb **21**, Wycliff Brut **21**, Michelob Ultra 24pk **20**, Solo Cups **18**, Miller Lite 16, Tito's 1.75L 15, White Claw 24pk 13, Surfside Lemonade 13, Topo Chico 12, Coors Light 11, Modelo 10, prosecco (Amor Di Amanti 10 + La Marca 9), Espolon 1.75L 9, Mom Water 8.

Reads:
- **Seltzers won the bach party**: High Noon + Surfside + White Claw + Mom Water ≈ 148 units vs ~57 for all beer — >2:1.
- Hydration is a real category: water + Topo + Rambler in the top 20; ice top-5.
- Bubbly culture confirmed: Wycliff + proseccos ≈ 40 bottles (mimosas/towers).
- Groups order LAST-MINUTE: half within ~48h of delivery.

Caveats for public claims: "532" counts dashboards *created* (not all converted to paid orders — 57 paid orders attached); per-group spend covers what they order through us, not their total alcohol budget. Claims in the script that use these numbers are flagged for Allan's approval.
