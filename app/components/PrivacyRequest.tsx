'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, LoaderCircle } from 'lucide-react';

export default function PrivacyRequest() {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state === 'success') statusRef.current?.focus();
  }, [state]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    const form = new FormData(event.currentTarget);
    setState('sending');
    setError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ email: form.get('email'), message: form.get('message') || '', website: form.get('website') || '' }),
      });
      const result = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
      if (!response.ok || result?.ok !== true) throw new Error(result?.error || 'We could not record your request. Please try again.');
      setState('success');
    } catch (reason) {
      setError(reason instanceof TypeError ? 'We couldn’t connect to the request service. Please check your connection and try again.' : reason instanceof Error && reason.name !== 'AbortError' ? reason.message : 'The connection took too long. Please try again.');
      setState('error');
    } finally {
      clearTimeout(timeout);
    }
  }

  if (state === 'success') return (
    <div id="privacy-request" role="status" ref={statusRef} tabIndex={-1} className="privacy-request-success" style={{ padding: 24, border: '1px solid #cad5ec', borderRadius: 8, marginBlock: 24 }}>
      <Check size={24} color="#2549f5" aria-hidden="true" />
      <p><strong>Your request has been recorded for the StarApp team to review.</strong></p>
      <p>This has not automatically removed any records. The team may need to confirm that you own the email address before acting. This confirmation does not reveal whether that address is on the waitlist.</p>
    </div>
  );

  return (
    <form id="privacy-request" onSubmit={submit} className="waitlist-form privacy-request" style={{ padding: 24, border: '1px solid #d7deeb', borderRadius: 8, marginBlock: 24 }} aria-labelledby="privacy-request-title">
      <h3 id="privacy-request-title">Request removal from the waitlist</h3>
      <p id="privacy-request-help">Use an email address you own. This records a request for the team to review; it does not remove data automatically.</p>
      <label className="field-label" htmlFor="privacy-email">Your email address</label>
      <input id="privacy-email" type="email" name="email" autoComplete="email" maxLength={254} required disabled={state === 'sending'} aria-describedby={error ? 'privacy-request-help privacy-request-error' : 'privacy-request-help'} style={{ fontSize: 16 }} />
      <label className="field-label" htmlFor="privacy-message">Anything else? <span>(optional)</span></label>
      <textarea id="privacy-message" name="message" rows={3} maxLength={1000} disabled={state === 'sending'} aria-describedby="privacy-message-help" style={{ width: '100%', padding: 12, border: '1px solid #d7deeb', borderRadius: 5, resize: 'vertical', font: 'inherit', fontSize: 16, color: '#313d5a', background: '#fff' }} />
      <p id="privacy-message-help" style={{ fontSize: 12 }}>Up to 1,000 characters. Please do not include passwords, identity documents, or sensitive information.</p>
      <div className="honeypot" aria-hidden="true"><label htmlFor="privacy-website">Website</label><input id="privacy-website" type="text" name="website" autoComplete="off" tabIndex={-1} /></div>
      {error && <p id="privacy-request-error" className="form-error" role="alert">{error}</p>}
      <button className="button button-blue form-submit" type="submit" disabled={state === 'sending'}>{state === 'sending' ? <>Recording request <LoaderCircle size={18} className="spinner" aria-hidden="true" /></> : <>Request removal <ArrowUpRight size={18} aria-hidden="true" /></>}</button>
    </form>
  );
}
