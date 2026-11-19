/**
 * Lead form rules. The server is the authority; the download page runs the
 * same checks so visitors see problems before submitting.
 */

export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

export type Lead = { name: string; email: string };
export type LeadErrors = Partial<Record<keyof Lead, string>>;

// Local part per RFC 5322 "atext" plus dots; domain of dot-separated labels with a 2+ letter TLD.
const EMAIL =
  /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;
const CONTROL = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/;

export function normalizeName(value: string) {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function validateLead(input: { name?: unknown; email?: unknown }):
  | { ok: true; lead: Lead }
  | { ok: false; errors: LeadErrors } {
  const errors: LeadErrors = {};

  const name = typeof input.name === "string" ? normalizeName(input.name) : "";
  if (!name) errors.name = "Enter your name.";
  else if (name.length > NAME_MAX) errors.name = `Use ${NAME_MAX} characters or fewer.`;
  else if (CONTROL.test(name) || !/\p{L}/u.test(name)) errors.name = "Enter your name using letters.";

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > EMAIL_MAX || !EMAIL.test(email) || email.includes(".."))
    errors.email = "Enter an email address like name@example.com.";

  if (errors.name || errors.email) return { ok: false, errors };
  return { ok: true, lead: { name, email } };
}
