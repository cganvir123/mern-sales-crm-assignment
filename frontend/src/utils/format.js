// Formatting helpers shared by every page.

// ---------- Money ----------
// Set VITE_CURRENCY (e.g. INR, USD) in .env.local / Vercel. Defaults to INR.
const CURRENCY = import.meta.env.VITE_CURRENCY || "INR";
const LOCALE = CURRENCY === "INR" ? "en-IN" : undefined; // en-IN gives 1,00,000

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

// Short form for chart axes in other currencies: $1.2M
const compactMoneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

export const formatMoney = (value) => moneyFormatter.format(Number(value) || 0);

// Rupees use Indian units: ₹70K, ₹1.5L (lakh), ₹2Cr (crore)
const trim = (n) => Number(n.toFixed(1)).toString();
export const formatMoneyCompact = (value) => {
  const n = Number(value) || 0;
  if (CURRENCY !== "INR") return compactMoneyFormatter.format(n);
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (abs >= 1e3) return `₹${trim(n / 1e3)}K`;
  return `₹${n}`;
};

// ---------- Dates ----------
const pad = (n) => String(n).padStart(2, "0");

// "15 Nov 2026"
export const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// "15 Nov, 3:30 pm"
export const formatDateTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

// Value for <input type="datetime-local"> in the user's own timezone
export const toDateTimeInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

// Today's date as "YYYY-MM-DD" in the user's timezone
export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ---------- Expected close dates (date only, stored as UTC midnight) ----------
// Read them in UTC so "31 Dec" never shows as "30 Dec" in other timezones.

// Value for <input type="date">
export const toCloseDateInput = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export const formatCloseDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

// An open deal whose close date has already passed
export const isCloseDatePast = (deal) =>
  Boolean(deal.expectedCloseDate) &&
  (deal.stage === "Prospect" || deal.stage === "Negotiation") &&
  toCloseDateInput(deal.expectedCloseDate) < todayInput();

// ---------- Follow-up tasks ----------
// "done" | "overdue" | "today" | "upcoming"
export const getDueState = (task) => {
  if (task.completed) return "done";
  const due = new Date(task.dueDate);
  const now = new Date();
  if (due < now) return "overdue";
  if (due.toDateString() === now.toDateString()) return "today";
  return "upcoming";
};
