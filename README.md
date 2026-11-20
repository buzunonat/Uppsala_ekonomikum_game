# Gold Peak Challenge

Library quiz game: for each decade (1970s–2010s) a team picks the month they think gold peaked and how many coins to invest there.

- **`index.html`**: public leaderboard (put it on the big screen, share the link or a QR code). Updates live.
- **`clerk.html`**: data-entry desk for the organizers. Needs the clerk passcode. Clerks can add, edit and delete entries, and hide scores until the reveal.
- **`real-gold-price.csv`**: monthly inflation-adjusted gold prices, 1970–2019.
- **`gold_peak_game_final.html`**: the original rules prototype.

## Scoring

For each decade: `coins × price(chosen month) ÷ price(January of that decade)`.
Total value = sum over the five decades. Ranked by total value (ties go to whoever submitted first).
"% of perfect" compares the team to investing the same coins at each decade's real peak month.

## Backend

Data lives in Supabase (project `gold-peak-challenge`). The public key in `app.js` only allows **reading**;
every write goes through database functions that check the clerk passcode. Team names are unique (ignoring capitals and spaces).

To wipe all entries before the real event, run this in the Supabase SQL Editor:

```sql
delete from public.submissions;
```
