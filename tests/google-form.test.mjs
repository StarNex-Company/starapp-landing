import assert from "node:assert/strict";
import { test } from "node:test";
import { GOOGLE_FORM_ACTION, GOOGLE_FORM_AUDIENCE, GOOGLE_FORM_ENTRIES, googleFormBody } from "../lib/google-form.ts";

test("posts to the form's public formResponse endpoint", () => {
  assert.match(GOOGLE_FORM_ACTION, /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/formResponse$/);
});

test("every answer has a distinct live entry id", () => {
  const ids = Object.values(GOOGLE_FORM_ENTRIES);
  for (const id of ids) assert.match(id, /^entry\.\d+$/);
  assert.equal(new Set(ids).size, ids.length);
});

test("encodes each answer under its own entry with the form's choice labels", () => {
  for (const audience of ["creator", "scout"]) {
    const body = googleFormBody({ name: "Ada Obi", email: "a@example.com", audience, talent: "Art & design", consentVersion: "waitlist-v1" });
    assert.deepEqual(Object.fromEntries(body), {
      [GOOGLE_FORM_ENTRIES.name]: "Ada Obi",
      [GOOGLE_FORM_ENTRIES.email]: "a@example.com",
      [GOOGLE_FORM_ENTRIES.audience]: GOOGLE_FORM_AUDIENCE[audience],
      [GOOGLE_FORM_ENTRIES.talent]: "Art & design",
      [GOOGLE_FORM_ENTRIES.consent]: "Agreed (waitlist-v1)",
    });
  }
});
