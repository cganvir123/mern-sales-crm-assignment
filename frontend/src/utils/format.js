// One place for money formatting, so currency can change without editing pages.
// Set VITE_CURRENCY (e.g. INR, USD) in .env.local / Vercel. Defaults to INR.
const CURRENCY = import.meta.env.VITE_CURRENCY || "INR";
const LOCALE = CURRENCY === "INR" ? "en-IN" : undefined; // en-IN gives 1,00,000

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

export const formatMoney = (value) => moneyFormatter.format(Number(value) || 0);
