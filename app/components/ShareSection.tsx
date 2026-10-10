'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Copy, Download, Share2, Smartphone } from 'lucide-react';
import { sitePath } from '../../lib/site-paths';
import { qrUrl, shareUrl } from '../../lib/share-config.json';

export default function ShareSection({ onJoin }: { onJoin: () => void }) {
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (manualCopy) { linkRef.current?.focus(); linkRef.current?.select(); }
  }, [manualCopy]);

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true); setManualCopy(false);
      setMessage('Link copied. Send it to someone whose talent deserves a stage.');
    } catch {
      setCopied(false); setManualCopy(true);
      setMessage('Select and copy the link below to share StarApp.');
      linkRef.current?.focus(); linkRef.current?.select();
    }
  }

  async function share() {
    if (sharing) return;
    if (!navigator.share) { await copyLink(); return; }
    setSharing(true);
    try {
      await navigator.share({ title: 'StarApp — The world stage for every talent', text: 'A new home for creativity is taking shape. Explore StarApp and register your interest in early access.', url: shareUrl });
      setMessage('Thanks for sharing the beginning.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') setMessage('Sharing cancelled. You can try again or copy the link.');
      else await copyLink();
    } finally { setSharing(false); }
  }

  return <section id="share" className="share-section container" aria-labelledby="share-title">
    <div className="share-panel">
      <div className="share-copy">
        <div className="eyebrow blue"><span className="share-spark" aria-hidden="true">✦</span> GOOD THINGS ARE BETTER SHARED</div>
        <h2 id="share-title">Take the stage<br /><span className="serif-word blue">with you.</span></h2>
        <p>Open StarApp on your phone, or pass it on to someone with something to share. Every new beginning starts somewhere.</p>
        <ol className="scan-steps" aria-label="How the QR code works">
          <li><span>01</span><div><strong>Open your phone’s camera</strong><small>Point it at the code and tap the link.</small></div></li>
          <li><span>02</span><div><strong>Meet your next chapter</strong><small>Go straight to the early-access section.</small></div></li>
          <li><span>03</span><div><strong>Make the first move</strong><small>Choose your interest, add your email, and join.</small></div></li>
        </ol>
        <div className="share-actions">
          <button type="button" className="button button-blue" onClick={share} disabled={sharing}><Share2 size={17} />{sharing ? 'Opening share…' : 'Share StarApp'}</button>
          <button type="button" className="share-copy-button" onClick={copyLink}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Link copied' : 'Copy link'}</button>
        </div>
        <p className="share-status" role="status" aria-live="polite" aria-atomic="true">{message}</p>
        {manualCopy && <div className="share-manual-copy"><label htmlFor="starapp-share-url">StarApp early-access link</label><input ref={linkRef} id="starapp-share-url" type="text" readOnly value={shareUrl} onFocus={event => event.currentTarget.select()} /></div>}
      </div>
      <div className="qr-side">
        <div className="qr-card">
          <div className="qr-card-heading"><img src={sitePath('/assets/brand-mark-blue.svg')} width="27" height="27" alt="" /><span>StarApp</span><Smartphone size={19} aria-hidden="true" /></div>
          <a className="qr-code-link" href={qrUrl} aria-label="Open StarApp early access — the same destination as this QR code"><img className="starapp-qr" src={sitePath('/assets/starapp-early-access-qr.svg')} width="240" height="240" alt="QR code to open the StarApp early-access section" loading="lazy" /></a>
          <p className="qr-caption">A SMALL SCAN. A BIG POSSIBILITY.</p>
          <p className="qr-explanation">Opens the StarApp website.<br />No app download required.</p>
          <div className="qr-downloads"><Download size={14} aria-hidden="true" /><span>Save the code</span><a href={sitePath('/assets/starapp-early-access-qr.png')} download="StarApp-early-access-QR.png" aria-label="Download StarApp QR code as PNG">PNG</a><span aria-hidden="true">/</span><a href={sitePath('/assets/starapp-early-access-qr.svg')} download="StarApp-early-access-QR.svg" aria-label="Download StarApp QR code as SVG">SVG</a></div>
        </div>
        <a className="qr-device-link" href="#waitlist" onClick={event => { event.preventDefault(); onJoin(); }}>Already on your phone? Join here <ArrowUpRight size={16} /></a>
      </div>
    </div>
  </section>;
}
