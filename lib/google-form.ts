/** Google Form that stores early-access signups. The website collects answers; a native POST opens Google’s confirmation page. */
export const GOOGLE_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSf_C_S6q5M2an2jii93w2ahhLU5sHkxv7bWZCWk5MzZQv0rSQ/formResponse';

/** Question ids from the live form (entry.<id>). Re-read them if the form's questions are edited. */
export const GOOGLE_FORM_ENTRIES = {
  name: 'entry.387735213',
  email: 'entry.1045781291',
  audience: 'entry.2005620554',
  talent: 'entry.945631955',
  consent: 'entry.1100335222',
} as const;

/** Choice labels exactly as they appear in the Google Form. */
export const GOOGLE_FORM_AUDIENCE = { creator: 'Creator or fan', scout: 'Brand or scout' } as const;

export type GoogleFormSignup = {
  name: string;
  email: string;
  audience: keyof typeof GOOGLE_FORM_AUDIENCE;
  talent: string;
  consentVersion: string;
};

/** Encode a signup as the form-urlencoded body Google Forms expects. */
export function googleFormBody(signup: GoogleFormSignup): URLSearchParams {
  const body = new URLSearchParams();
  body.set(GOOGLE_FORM_ENTRIES.name, signup.name);
  body.set(GOOGLE_FORM_ENTRIES.email, signup.email);
  body.set(GOOGLE_FORM_ENTRIES.audience, GOOGLE_FORM_AUDIENCE[signup.audience]);
  body.set(GOOGLE_FORM_ENTRIES.talent, signup.talent);
  body.set(GOOGLE_FORM_ENTRIES.consent, `Agreed (${signup.consentVersion})`);
  return body;
}
