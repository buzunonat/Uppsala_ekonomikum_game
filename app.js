// Shared code for the leaderboard and clerk pages.
// The anon/publishable key is safe to publish: the database only lets the public READ.
// All writes go through functions that check the clerk passcode.
const SUPABASE_URL = "https://frpbohlwdcfahpmkaqlk.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nco-2TfWYBa2ij9KbJ-pJQ_tqwMVgMR";
const PRICES_URL = "gold-price-history.csv";

const DECADES = [[1970, 1979], [1980, 1989], [1990, 1999], [2000, 2009], [2010, 2019]];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- Prices & scoring ----------
// Rule (from the original game sheet): for each decade, coins invested grow by
// price(chosen day) / price(first trading day of that decade).
// "Perfect" = the same coins invested on that decade's highest day.
// The price file only has trading days. A weekend or holiday pick uses the last
// closing price before it (never earlier than the decade's first trading day).
// Old month-only picks ("YYYY-MM") count as the 1st of that month.
const Game = {
  days: [],   // sorted [{key: "YYYY-MM-DD", price}]
  bases: [],  // first trading day of each decade
  peaks: [],  // highest day of each decade

  async load() {
    const res = await fetch(PRICES_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("Could not load price data (" + res.status + ")");
    const text = await res.text();
    const days = [];
    text.split(/\r?\n/).forEach((line) => {
      const p = line.split(/[,;\t]/).map((s) => s.trim());
      const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/.exec(p[0] || "");
      const price = parseFloat(p[1]);
      if (m && price > 0) days.push({ key: m[1] + "-" + m[2].padStart(2, "0") + "-" + (m[3] || "1").padStart(2, "0"), price });
    });
    days.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
    this.days = days;
    this.bases = DECADES.map(([a, b]) => days.find((d) => d.key >= a + "-01-01" && d.key <= b + "-12-31") || null);
    this.peaks = DECADES.map(([a, b]) => {
      let best = null;
      for (const d of days) if (d.key >= a + "-01-01" && d.key <= b + "-12-31" && (!best || d.price > best.price)) best = d;
      return best;
    });
    if (this.bases.some((x) => !x) || this.peaks.some((x) => !x)) throw new Error("Price data is missing a decade");
  },

  // Price for a picked date in decade i: last trading day on or before it.
  entry(date, i) {
    const key = date && date.length === 7 ? date + "-01" : date;
    if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
    let lo = 0, hi = this.days.length - 1, hit = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.days[mid].key <= key) { hit = this.days[mid]; lo = mid + 1; } else hi = mid - 1;
    }
    const base = this.bases[i];
    return !hit || (base && hit.key < base.key) ? base : hit;
  },

  // Returns {value, invested, profit, perfect, pct, parts[]}
  score(sub) {
    let value = 0, invested = 0, perfect = 0;
    const parts = DECADES.map((_, i) => {
      const amt = Number(sub.amounts[i]) || 0;
      const e = this.entry(sub.dates[i], i);
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
const dateLabel = (key) => { const [y, m, d] = key.split("-"); return (d ? +d + " " : "") + MONTHS[+m - 1] + " " + y; };
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
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
  bad_date: "Each pick must be a real date inside its own decade.",
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
