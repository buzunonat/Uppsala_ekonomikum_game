# Den stora Ekonomikumfesten: gold investing game

Library quiz game: for each decade (1970s–2010s) a team picks the month they think gold peaked and how many coins to invest there.

- **`index.html`**: public leaderboard (put it on the big screen, share the link or a QR code). Updates live.
- **`clerk.html`**: data-entry desk for the organizers. Needs the clerk passcode. Clerks can add, edit and delete entries, and hide scores until the reveal.
  - Fast keyboard entry: team name → <kbd>Enter</kbd> → year digit (`5` = 1975) → month (`3` = Mar, `12` = Dec, `01` = Jan) → coins → <kbd>Enter</kbd> to the next decade. <kbd>Enter</kbd> on the last coins box saves. <kbd>Esc</kbd> clears. Chips can also be clicked.
  - A decade with 0 coins needs no year/month.
- Leaderboard extras: podium celebration when someone breaks into the top 3 (once there are 5+ teams), and a "vault open" reveal when scores are un-hidden. Add `?motion=full` to the leaderboard URL to force all animations on a PC with "reduce motion" enabled.
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

## Updating the site

When you change `style.css` or `app.js`, bump the `?v=` number where the HTML files link them (for example `style.css?v=4` becomes `style.css?v=5`). Otherwise browsers may keep the old file for a while and the page looks broken.
