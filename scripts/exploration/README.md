# Exploration scripts

The raw investigation trail — one-off probes written while working out what the
API actually does. They are kept because they are the honest record of how the
answers were reached, not because they are correct.

**They are not authoritative, and some of them encode hypotheses that were later
overturned.** In particular:

- `precision_answers.mjs`, `calculate_q6.mjs`, `hunt_anomalies.mjs`,
  `check_2bhk_groups.mjs` and `inspect_anomaly_groups.mjs` treat the eight
  listings priced under ₹50,000 as enquiry bait. They are not. Those eight are
  the only prices in the dataset that are not a multiple of 10,000, and
  multiplying each by 1,000 puts it back at the market rate for its own locality
  and bedroom count — a units error, not fraud. The real bait is 170 listings
  across seven phone numbers, which these scripts predate.
- Several of them also assume the impossible-record set is 40 rather than 56,
  from before the future-dated and thousands-priced classes were identified.

The authoritative derivation of every answer is
[`../generate_submission.mjs`](../generate_submission.mjs), which reads the dump
produced by [`../ingest.mjs`](../ingest.mjs) and writes `submission.json`. If
anything here disagrees with that, that is right and this is stale.

Run order for reproducing everything from scratch:

```bash
node scripts/ingest.mjs
node scripts/generate_submission.mjs
```
