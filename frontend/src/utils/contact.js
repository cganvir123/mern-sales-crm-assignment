// Builds Call / WhatsApp / Email links for a lead.

// Country code added to 10-digit numbers that don't have one.
// Set VITE_DEFAULT_COUNTRY_CODE in .env.local (defaults to 91 for India).
const DEFAULT_COUNTRY_CODE = import.meta.env.VITE_DEFAULT_COUNTRY_CODE || "91";

// "+91 98765-43210" -> "+919876543210" (keeps a leading +)
const cleanPhone = (phone = "") => {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
};

export const telLink = (phone) => `tel:${cleanPhone(phone)}`;

// wa.me needs the full international number with digits only
export const whatsappLink = (phone) => {
  let digits = cleanPhone(phone).replace("+", "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 10) digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
};

export const mailtoLink = (email) => `mailto:${email}`;
