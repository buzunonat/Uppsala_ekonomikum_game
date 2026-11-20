// Shared code for the leaderboard and clerk pages.
// The anon/publishable key is safe to publish: the database only lets the public READ.
// All writes go through functions that check the clerk passcode.
const SUPABASE_URL = "https://frpbohlwdcfahpmkaqlk.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nco-2TfWYBa2ij9KbJ-pJQ_tqwMVgMR";
const PRICES_URL = "real-gold-price.csv";

const DECADES = [[1970, 1979], [1980, 1989], [1990, 1999], [2000, 2009], [2010, 2019]];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- Prices & scoring ----------
// Rule (from the original game sheet): for each decade, coins invested grow by
// price(chosen month) / price(first month of that decade).
// "Perfect" = the same coins invested at that decade's peak month.
const Game = {
  prices: new Map(), // "YYYY-MM" -> real price
  bases: [],         // first month of each decade
  peaks: [],         // highest month of each decade

  async load() {
    const res = await fetch(PRICES_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load price data (" + res.status + ")");
    const text = await res.text();
    text.split(/\r?\n/).forEach((line) => {
      const p = line.split(/[,;\t]/).map((s) => s.trim());
      const m = /^(\d{4})-(\d{1,2})/.exec(p[0] || "");
      const price = parseFloat(p[1]);
      if (m && price > 0) this.prices.set(m[1] + "-" + m[2].padStart(2, "0"), price);
    });
    this.bases = DECADES.map(([a]) => this.entry(a + "-01"));
    this.peaks = DECADES.map(([a, b]) => {
      let best = null;
      for (let y = a; y <= b; y++) for (let mo = 1; mo <= 12; mo++) {
        const e = this.entry(y + "-" + String(mo).padStart(2, "0"));
        if (e && (!best || e.price > best.price)) best = e;
      }
      return best;
    });
    if (this.bases.some((x) => !x) || this.peaks.some((x) => !x)) throw new Error("Price data is missing a decade");
  },

  entry(key) {
    const price = this.prices.get(key);
    return price ? { key, price } : null;
  },

  // Returns {value, invested, profit, perfect, pct, parts[]}
  score(sub) {
    let value = 0, invested = 0, perfect = 0;
    const parts = DECADES.map((_, i) => {
      const amt = Number(sub.amounts[i]) || 0;
      const e = this.entry(sub.dates[i]);
      const growth = e ? e.price / this.bases[i].price : 0;
      const v = amt * growth;
      value += v;
      invested += amt;
      perfect += amt * (this.peaks[i].price / this.bases[i].price);
      return { amt, date: sub.dates[i], growth, value: v };
    });
    return { value, invested, profit: value - invested, perfect, pct: perfect ? (100 * value) / perfect : 0, parts };
  },

  rank(subs) {
    return subs
      .map((s) => ({ ...s, ...this.score(s) }))
      .sort((a, b) => b.value - a.value || new Date(a.created_at) - new Date(b.created_at));
  },
};

// ---------- Live data ----------
// Calls onChange({subs, settings}) whenever anything changes.
// Uses Supabase Realtime, plus a slow poll as a safety net.
function watchGame(onChange, onStatus) {
  let subs = [], settings = { scores_hidden: false };
  let timer = null;

  async function refresh() {
    const [a, b] = await Promise.all([
      sb.from("submissions").select("*").order("created_at"),
      sb.from("game_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (a.error) throw a.error;
    subs = a.data || [];
    if (b.data) settings = b.data;
    onChange({ subs, settings });
  }
  const safeRefresh = () => refresh().catch((e) => { console.error(e); onStatus && onStatus(false); });
  const debounced = () => { clearTimeout(timer); timer = setTimeout(safeRefresh, 150); };

  sb.channel("game")
    .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, debounced)
    .on("postgres_changes", { event: "*", schema: "public", table: "game_settings" }, debounced)
    .subscribe((status) => {
      onStatus && onStatus(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") safeRefresh();
    });

  safeRefresh();
  setInterval(safeRefresh, 20000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) safeRefresh(); });
  return { refresh: safeRefresh };
}

// ---------- Helpers ----------
const fmt = (v, d = 2) => v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtSigned = (v) => (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v));
const monthLabel = (key) => { const [y, m] = key.split("-"); return MONTHS[+m - 1] + " " + y; };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const teamKey = (s) => s.trim().toLowerCase();

function setLive(el, on) {
  if (!el) return;
  el.classList.toggle("on", !!on);
  el.lastChild.textContent = on ? " Live" : " Connecting…";
}

const ERRORS = {
  wrong_passcode: "Wrong passcode.",
  team_taken: "That team name is already taken. Pick another name.",
  bad_team: "Team name must be 1–40 characters.",
  bad_date: "Each pick must be a month inside its own decade.",
  bad_amount: "Coins must be whole numbers, 0 or more.",
  bad_sheet: "The sheet needs all five decades.",
  not_found: "That entry no longer exists (someone may have deleted it).",
};
function errText(e) {
  const m = (e && (e.message || e.details)) || String(e);
  for (const k in ERRORS) if (m.includes(k)) return ERRORS[k];
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "No connection. Check the internet and try again.";
  return "Something went wrong: " + m;
}
