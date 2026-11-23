# Den stora Ekonomikumfesten: gold investing game

Library quiz game: for each decade (1970s–2010s) a team picks the day they think gold peaked and how many coins to invest there (0–12 coins per decade).

- **`index.html`**: public leaderboard (put it on the big screen, share the link or a QR code). Updates live.
- **`clerk.html`**: data-entry desk for the organizers. Needs the clerk passcode. Clerks can add, edit and delete entries, and hide scores until the reveal.
  - Fast keyboard entry: team name → <kbd>Enter</kbd> → year digit (`5` = 1975) → month (`3` = Mar, `12` = Dec, `01` = Jan) → day (`14`, or `7` for the 7th) → coins → <kbd>Enter</kbd> to the next decade. <kbd>Enter</kbd> on the last coins box saves. <kbd>Esc</kbd> clears. Chips can also be clicked.
  - A decade with 0 coins needs no date.
- Leaderboard extras: podium celebration when someone breaks into the top 3 (once there are 5+ teams), and a "vault open" reveal when scores are un-hidden. Add `?motion=full` to the leaderboard URL to force all animations on a PC with "reduce motion" enabled.
- **`gold-price-history.csv`**: daily gold closing prices in USD per troy ounce (not inflation-adjusted), 1968–2026. Only trading days are listed. Source: GoldPrice.com (LBMA fixes + Metals.dev), CC BY 4.0, https://goldprice.com/gold-price-history
- **`real-gold-price.csv`**: the older monthly inflation-adjusted prices, no longer used.
- **`gold_peak_game_final.html`**: the original rules prototype.

## Scoring

For each decade: `coins × price(chosen day) ÷ price(first trading day of that decade)`.
A weekend or holiday pick uses the last closing price before it. Older entries saved as just a month count as the 1st of that month.
Total value = sum over the five decades. Ranked by total value (ties go to whoever submitted first).
"% of perfect" compares the team to investing the same coins on each decade's highest day.

## Backend

Data lives in Supabase (project `gold-peak-challenge`). The public key in `app.js` only allows **reading**;
every write goes through database functions that check the clerk passcode. Team names are unique (ignoring capitals and spaces).

To wipe all entries before the real event, run this in the Supabase SQL Editor:

```sql
delete from public.submissions;
```

## Updating the site

When you change `style.css` or `app.js`, bump the `?v=` number where the HTML files link them (for example `style.css?v=4` becomes `style.css?v=5`). Otherwise browsers may keep the old file for a while and the page looks broken.
