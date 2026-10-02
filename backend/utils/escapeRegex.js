// Escapes characters that have special meaning in regular expressions so
// user input is matched literally (prevents regex injection / ReDoS).
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;
