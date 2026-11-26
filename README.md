# Den stora Ekonomikumfesten: gold investing game

Library quiz game: for each decade (1970s–2010s) a team picks the day they think gold peaked and how many coins to invest there (0–12 coins per decade).

- **`index.html`**: public leaderboard (put it on the big screen, share the link or a QR code). Updates live.
- **`clerk.html`**: data-entry desk for the organizers. Needs the clerk passcode. Clerks can add, edit and delete entries, and hide scores until the reveal.
  - Fast keyboard entry: team name → <kbd>Enter</kbd> → day (`14`, or `7` for the 7th) → month (`3` = Mar, `12` = Dec, `01` = Jan) → year digit (`5` = 1975) → coins → <kbd>Enter</kbd> to the next decade. <kbd>Enter</kbd> on the last coins box saves. <kbd>Esc</kbd> clears. Chips can also be clicked.
  - A decade with 0 coins needs no date.
  - Click a team in the entries list for a short stats panel to read out: place, score, best decade, closest guess, and how they did against the RAs.
  - Deleting an entry moves it to **Recently deleted** (bottom of the page), where it can be restored. The delete toast also has an Undo button.
- **The RA line** (just a joke, not a prize threshold): the entry named "Tha Big RAs" (the economics department RAs) is not ranked as a team. The leaderboard draws a dashed joke line in the list below the podium, right above the first team that did worse than the RAs. Every newly entered team gets a pop-up saying whether it passed the RAs or did worse.
  - The RA sheet is adjusted to the current rules (4 coins endowment + 4 questions per round, hint = best **year** only for 2 coins). The RAs played the old rules (5 + 5 questions, exact best day for 3 coins) and bought the hint in the 1970s, 1980s and 1990s.
  - Coins: they spent 37 coins (28 invested + 3 hints × 3), so at least 12 of 25 questions right (48%). The same hit rate under the new rules is 10 of 20 right: 20 + 10 = 30 coins. 3 hints × 2 = 6 go to the information, which leaves 24 to invest, spread like their original sheet. Per round that is spend 5 / 7 / 8 / 5 / 5 against income 5 / 7 / 8 / 5 / 5 (1, 3, 4, 1, 1 right), so it fits the 4-question limit.
  - Dates: the new hint only gives the year, so a pick within a week of the decade's peak (1979 and 1980) got a random day and month in the same year (one random draw). The other picks are their own.
  - Adjusted sheet: 31 May 1979 (3), 10 Nov 1980 (5), 17 Jan 1990 (6), 15 Nov 2005 (5), 6 Jun 2011 (5) = 121.58.
  - Original sheet: 28 Dec 1979 (4), 21 Jan 1980 (6), 17 Jan 1990 (7), 15 Nov 2005 (6), 6 Jun 2011 (5).
- Leaderboard extras: podium celebration when someone breaks into the top 3 (once there are 5+ teams), and a "vault open" reveal when scores are un-hidden. Add `?motion=full` to the leaderboard URL to force all animations on a PC with "reduce motion" enabled.
- **`cpi-u.csv`**: US CPI-U index (all items, 1982-84=100, not seasonally adjusted), monthly from 1968. Source: U.S. Bureau of Labor Statistics via FRED, series CPIAUCNS. Used to turn the nominal gold prices into real ones. Oct 2025 was never published (government shutdown), so it uses Sep 2025.
- **`gold-price-history.csv`**: daily gold closing prices in USD per troy ounce (not inflation-adjusted), 1968–2026. Only trading days are listed. Source: GoldPrice.com (LBMA fixes + Metals.dev), CC BY 4.0, https://goldprice.com/gold-price-history
- **`real-gold-price.csv`**: the older monthly inflation-adjusted prices, no longer used.
- **`gold_peak_game_final.html`**: the original rules prototype.

## Scoring

For each decade: `coins × price(chosen day) ÷ price(2 Jan 1970, the first trading day of the game)`, using **real** gold prices: `nominal × CPI(latest month) ÷ CPI(month of that day)`, so in today's dollars. Put differently: a real gold index with 2 Jan 1970 = 100, and each coin is worth index ÷ 100.
A weekend or holiday pick uses the last closing price before it. Older entries saved as just a month count as the 1st of that month.
Total value = sum over the five decades. Ranked by total value (ties go to whoever submitted first).
"% of perfect" compares the team to investing the same coins on each decade's highest day.

## Backend

Data lives in Supabase (project `gold-peak-challenge`). The public key in `app.js` only allows **reading**;
every write goes through database functions that check the clerk passcode. Team names are unique (ignoring capitals and spaces).

To wipe all entries before the real event, run this in the Supabase SQL Editor:

```sql
delete from public.submissions;
delete from private.deleted_submissions; -- empties "Recently deleted"
```

## Updating the site

When you change `style.css` or `app.js`, bump the `?v=` number where the HTML files link them (for example `style.css?v=4` becomes `style.css?v=5`). Otherwise browsers may keep the old file for a while and the page looks broken.
