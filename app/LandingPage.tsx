'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, ArrowRight, ArrowDown, Check, ChevronDown, Globe2, Sparkles, Star, Trophy, Users, Camera, Compass, ShieldCheck, Menu, X, Pause, Play, LoaderCircle, Music2, Palette, Clapperboard, Mic2, Shirt, MoveUpRight } from 'lucide-react';
import BrandScene from './components/BrandScene';
import ShareSection from './components/ShareSection';
import { sitePath } from '../lib/site-paths';
import { onMediaQueryChange } from '../lib/media-query';
import { GOOGLE_FORM_ACTION, googleFormBody } from '../lib/google-form';
import { normalizeSignupEmail, WAITLIST_CONSENT_VERSION } from '../lib/waitlist';
import { channelUrl } from '../lib/share-config.json';

type Audience = 'creator' | 'scout';
const categories = ['Music', 'Dance', 'Art & design', 'Film & photography', 'Fashion', 'Comedy', 'Other'];
const chapters = [
  { tag: '01 / CREATE', title: 'Let your work do the talking.', text: 'The song you stayed up writing. The move you finally mastered. The idea only you could see. Give it a home built around your talent.', image: 'creator-community', alt: 'StarApp concept showing a creator discovering other artists', small: 'A space for what makes you, you.', icon: Camera, details: ['Video and image showcases', 'Profiles shaped around your craft', 'Discovery by talent category'] },
  { tag: '02 / CONNECT', title: 'Find people who see your vision.', text: 'Find your kind of creative. Follow the work that moves you, share encouragement, and grow a community around what you love doing.', image: 'creator-insights', alt: 'StarApp concept showing a creator connecting with a community', small: 'Good things happen together.', icon: Users, details: ['Follow and support creators', 'Conversations through comments', 'A community beyond your usual circle'] },
  { tag: '03 / GROW', title: 'Turn your next step into your next chapter.', text: 'Take on creative challenges, build recognition, and make your work easier to discover. There is always somewhere new to go.', image: 'creator-growth', alt: 'StarApp concept illustrating a creator’s progress and recognition', small: 'Keep creating. Keep becoming.', icon: Sparkles, details: ['Monthly creative challenges', 'Star Points and creator milestones', 'A visible story of your progress'] },
];
const questions = [
  { q: 'What is StarApp?', a: 'StarApp is a mobile-first talent discovery platform in development. It brings creative showcases, community, monthly challenges, and professional discovery into one place, with a planned release for iOS and Android.' },
  { q: 'Who is it for?', a: 'People with something to share: musicians, dancers, artists, photographers, filmmakers, fashion creatives, comedians, and more. You can also join to discover and support talent, or register interest as a company looking for creators.' },
  { q: 'Is the app available yet?', a: 'Not yet. We’re building StarApp and gathering our early-access community. Join the list to register your interest in launch news and beta opportunities. Launch timing and supported regions will be announced as plans are confirmed.' },
  { q: 'How will challenges and rewards work?', a: 'The plan is to run monthly challenges by talent category, with published entry rules, deadlines, rankings, and results. Eligibility, judging, and any prizes will be specified for each challenge. Joining the waitlist does not enter you into a competition or guarantee a reward.' },
  { q: 'How can brands and scouts get involved?', a: 'Choose “I’m a brand or scout” in the early-access form. The planned Scout Marketplace will help verified companies discover relevant creators and send professional requests. Creators will choose whether to accept contact.' },
  { q: 'What happens when I join the waitlist?', a: 'Your name, email, interest, and chosen talent category are saved for the StarApp team to manage early access and launch communication. You are not creating an app account, paying for a subscription, or guaranteed a beta invitation.' },
];

function Brand({ light = false }: { light?: boolean }) {
  return <a href={sitePath('/')} className={`brand ${light ? 'brand-light' : ''}`} aria-label="StarApp home"><img src={sitePath('/assets/brand-mark-blue.svg')} width="38" height="38" alt="" /><span>StarApp<span className="brand-dot">.</span></span></a>;
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [audience, setAudience] = useState<Audience>('creator');
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [formState, setFormState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [talent, setTalent] = useState('');
  const [scanArrival, setScanArrival] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const chapterPanel = useRef<HTMLDivElement>(null);
  const active = chapters[chapter];

  useEffect(() => {
    setFormReady(true);
    if (new URLSearchParams(window.location.search).get('via') !== 'qr' || window.location.hash !== '#waitlist') return;
    setScanArrival(true);
    let cancelled = false;
    let frame = 0;
    const align = () => {
      if (!cancelled) frame = requestAnimationFrame(() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'instant', block: 'start' }));
    };
    const stop = () => { cancelled = true; cancelAnimationFrame(frame); };
    const events = ['pointerdown', 'wheel', 'touchstart', 'keydown'] as const;
    events.forEach(event => window.addEventListener(event, stop, { passive: true }));
    align();
    // Font swaps can move the anchor; never realign after the visitor interacts.
    void document.fonts.ready.then(align);
    return () => { stop(); events.forEach(event => window.removeEventListener(event, stop)); };
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); const unsubscribe = onMediaQueryChange(query, update);
    try {
      if (localStorage.getItem('starapp-motion-paused') === 'true') setPaused(true);
    } catch { /* Browsers may disable preference storage. */ }
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = paused || reducedMotion ? 'paused' : 'on';
    return () => { delete document.documentElement.dataset.motion; };
  }, [paused, reducedMotion]);

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible')); return;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    elements.forEach(el => { el.classList.add('will-reveal'); observer.observe(el); });
    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (formState === 'success') successRef.current?.focus();
  }, [formState]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') { setMenuOpen(false); document.getElementById('menu-button')?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [menuOpen]);

  function join(role: Audience = 'creator') {
    setAudience(role); setMenuOpen(false);
    document.getElementById('waitlist')?.scrollIntoView({ behavior: paused || reducedMotion ? 'instant' : 'smooth', block: 'start' });
    (formState === 'success' ? successRef.current : emailRef.current)?.focus({ preventScroll: true });
  }
  function toggleMotion() {
    const next = !paused; setPaused(next);
    try { localStorage.setItem('starapp-motion-paused', String(next)); } catch { /* Motion works without storage. */ }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formState === 'sending') return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const name = String(data.get('name') ?? '').trim();
    setFormState('sending'); setError('');
    // AbortController is missing on Safari before iOS 12.2; the request still works without a timeout there.
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeout = controller ? window.setTimeout(() => controller.abort(), 15000) : 0;
    try {
      const normalized = normalizeSignupEmail(email);
      if (!name) throw new Error('Please enter your name.');
      if (!normalized) throw new Error('Please enter a valid email address.');
      if (data.get('consent') !== 'on') throw new Error('Please confirm you’d like early-access updates.');
      // Bots fill the hidden field; show them success without storing anything.
      if (!String(data.get('website') ?? '').trim()) {
        // Google Forms stores the answers in the background; visitors stay on StarApp and see its own confirmation.
        await fetch(GOOGLE_FORM_ACTION, {
          method: 'POST', mode: 'no-cors', signal: controller?.signal,
          body: googleFormBody({ name, email: normalized, audience, talent: talent || 'Other', consentVersion: WAITLIST_CONSENT_VERSION }),
        });
      }
      setSubmittedEmail(normalized); setFormState('success');
    } catch (e) {
      setError(e instanceof TypeError ? 'We couldn’t connect to the signup service. Please check your connection and try again.' : e instanceof Error && e.name !== 'AbortError' ? e.message : 'The connection took a little too long. Please try again.');
      setFormState('error');
    } finally { window.clearTimeout(timeout); }
  }

  return <div className="site-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="header-inner container">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#discover">The idea</a><a href="#how-it-works">How it works</a><a href="#opportunities">For brands <ArrowUpRight size={13} /></a>
        </nav>
        <div className="header-actions"><button className="button button-dark header-cta" onClick={() => join()}>Get early access <ArrowUpRight size={16} /></button><button id="menu-button" className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X /> : <Menu />}</button></div>
      </div>
      {menuOpen && <nav id="mobile-nav" className="mobile-nav" aria-label="Mobile navigation"><a href="#discover" onClick={() => setMenuOpen(false)}>The idea</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#opportunities" onClick={() => setMenuOpen(false)}>For brands</a><button onClick={() => join()}>Get early access <ArrowUpRight size={18} /></button></nav>}
    </header>

    <main id="main">
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow"><span className="status-dot" /> A NEW STAGE IS TAKING SHAPE</div>
          <h1 id="hero-title">The world is<br />your <span className="hero-word">stage<svg viewBox="0 0 370 20" aria-hidden="true"><path d="M4 12 Q164 -5 365 9 M35 18 Q190 3 323 16" /></svg></span><span className="blue">.</span></h1>
          <p className="hero-description">You bring the talent. We’re building the place.<br className="desktop-break" /> Showcase your creativity, find your people, and make room for what comes next.</p>
          <div className="hero-buttons"><button className="button button-blue" onClick={() => join()}>Join the waitlist <ArrowUpRight size={20} /></button><a className="text-button" href="#discover"><span className="round-arrow"><ArrowDown size={17} /></span>Meet StarApp</a></div>
          <div className="hero-note"><span className="tiny-star">✦</span> Coming to iOS & Android <span className="note-divider" /> Made for every talent.</div>
        </div>
        <div className="hero-art" aria-label="StarApp brand and creator concept imagery">
          <div className="hero-art-grid" aria-hidden="true" />
          <div className="orbit orbit-one" aria-hidden="true" /><div className="orbit orbit-two" aria-hidden="true" />
          <div className="hero-art-top"><span>LIMITLESS BY NATURE</span><Globe2 size={17} strokeWidth={1.3} /></div>
          <div className="brand-scene"><BrandScene paused={paused || reducedMotion} /></div>
          <figure className="floating-photo photo-one"><img src={sitePath('/assets/creator-community-700.webp')} alt="Creator using StarApp in a brand concept" width="700" height="938" fetchPriority="high" /><figcaption><span className="photo-dot" /> Your kind of people.</figcaption></figure>
          <figure className="floating-photo photo-two"><img src={sitePath('/assets/creator-opportunity-700.webp')} alt="StarApp concept of a creator finding opportunities" width="700" height="938" fetchPriority="high" /><figcaption><Sparkles size={12} /> Your next chapter.</figcaption></figure>
          <div className="floating-note"><span className="note-icon"><Star size={17} /></span><div>Talent has no limits.<small>Neither should your stage.</small></div></div>
          <div className="hero-art-bottom"><span className="crosshair">+</span><span>CREATE. CONNECT. GROW.</span><span className="crosshair">+</span></div>
        </div>
      </section>

      <div className="talent-strip" aria-label="A stage for music, dance, art, film, fashion, comedy and you"><div className="container talent-strip-inner"><span>A STAGE FOR</span><div><Music2 /> Music</div><span className="strip-star">✦</span><div>Dance</div><span className="strip-star">✦</span><div><Palette /> Art</div><span className="strip-star">✦</span><div><Clapperboard /> Film</div><span className="strip-star">✦</span><div><Shirt /> Fashion</div><span className="strip-star">✦</span><div>Comedy</div><span className="strip-star">✦</span><div className="strip-you">You.</div></div></div>

      <section id="discover" className="intro-section container section-space" aria-labelledby="intro-title">
        <div className="intro-top" data-reveal><div className="section-label"><span>01</span> THE BIG IDEA</div><p className="small-statement">Talent is everywhere.<br />Opportunity should be, too.</p></div>
        <div className="intro-grid" data-reveal><h2 id="intro-title">You weren’t made<br />to blend <span className="serif-word">in.</span></h2><div className="intro-body"><p>There’s a whole world of creativity waiting to be seen. StarApp is being built to bring it into the spotlight.</p><p>A home for your work. A community around your craft. A path from “look what I made” to “look what’s possible.”</p><a href="#how-it-works" className="inline-link">This is where it begins <ArrowDown size={18} /></a></div></div>
        <div className="editorial-banner" data-reveal><img src={sitePath('/assets/cover-world-stage-1400.webp')} srcSet={sitePath('/assets/cover-world-stage-700.webp') + ' 700w' + ', ' + sitePath('/assets/cover-world-stage-1400.webp') + ' 1400w'} sizes="(max-width: 700px) 94vw, 90vw" alt="StarApp campaign: a creator looking toward a city, the world stage for every talent" width="1400" height="521" loading="lazy" /><div className="banner-caption"><span>THE FUTURE LOOKS LIKE YOU.</span><span>STARAPP / COMING SOON</span></div></div>
      </section>

      <section id="how-it-works" className="journey-section section-space" aria-labelledby="journey-title">
        <div className="container">
          <div className="section-heading" data-reveal><div><div className="section-label"><span>02</span> YOUR NEXT CHAPTER</div><h2 id="journey-title">Big things start<br />with <span className="blue">being you.</span></h2></div><p>From your first post to your next possibility.<br />Here’s the experience we’re building.</p></div>
          <div className="journey-tabs" role="tablist" aria-label="Explore the StarApp experience">{chapters.map((item, i) => <button key={item.tag} id={`chapter-tab-${i}`} role="tab" aria-selected={chapter === i} aria-controls="chapter-panel" tabIndex={chapter === i ? 0 : -1} onKeyDown={e => { let next = i; if(e.key === 'ArrowRight') next=(i+1)%3; else if(e.key==='ArrowLeft') next=(i+2)%3; else if(e.key==='Home') next=0; else if(e.key==='End') next=2; else return; e.preventDefault();setChapter(next);document.getElementById(`chapter-tab-${next}`)?.focus(); }} onClick={() => setChapter(i)}><span>0{i + 1}</span>{['Create', 'Connect', 'Grow'][i]}<ArrowUpRight size={20} /></button>)}</div>
          <div ref={chapterPanel} id="chapter-panel" className="chapter-panel" role="tabpanel" aria-labelledby={`chapter-tab-${chapter}`} tabIndex={0}>
            <div className="chapter-image" key={active.image}><img src={sitePath(`/assets/${active.image}-1400.webp`)} srcSet={`${sitePath(`/assets/${active.image}-700.webp`)} 700w, ${sitePath(`/assets/${active.image}-1400.webp`)} 1400w`} sizes="(max-width: 760px) 90vw, 48vw" alt={active.alt} width="1400" height="1875" loading="lazy" /><span className="concept-label">STARAPP VISION / CONCEPT IMAGE</span><div className="chapter-image-title"><active.icon size={24} strokeWidth={1.4} /><span>{active.small}</span></div></div>
            <div className="chapter-copy" key={active.tag}><span className="eyebrow blue">{active.tag}</span><h3>{active.title}</h3><p>{active.text}</p><ul>{active.details.map(detail => <li key={detail}><Check size={17} />{detail}</li>)}</ul><button className="inline-link" onClick={() => join()}>Be part of it from the start <ArrowUpRight size={19} /></button></div>
          </div>
        </div>
      </section>

      <section className="challenge-section container section-space" aria-labelledby="challenge-title">
        <div className="challenge-copy" data-reveal><div className="section-label"><span>03</span> A LITTLE SPARK. A BIG NEXT STEP.</div><h2 id="challenge-title">Put your talent<br />in the <span className="serif-word blue">spotlight.</span></h2><p>A fresh creative challenge. A reason to try something new. A chance for your work to reach people who haven’t found you yet.</p><div className="challenge-points"><div><Trophy size={21} /><span><strong>Monthly challenges</strong><small>New prompts, clear rules, and a stage for your category.</small></span></div><div><Star size={21} /><span><strong>Recognition that grows with you</strong><small>Star Points and creator tiers celebrate your progress.</small></span></div><div><ShieldCheck size={21} /><span><strong>Your work, with a story behind it</strong><small>A planned Talent Passport to carry your best work forward.</small></span></div></div><p className="planned-note">Planned features. Challenge eligibility and any rewards will be announced with each challenge.</p></div>
        <div className="challenge-art" data-reveal><img src={sitePath('/assets/flyer-every-talent.webp')} alt="StarApp campaign showing a creator standing on a blue-lit stage" width="1000" height="1000" loading="lazy" /><div className="challenge-art-label"><span><span className="status-dot" /> THE SPOTLIGHT IS OPENING UP</span><ArrowUpRight size={25} /></div></div>
      </section>

      <section id="opportunities" className="opportunity-section" aria-labelledby="opportunity-title"><div className="container opportunity-grid"><div className="opportunity-photo" data-reveal><img src={sitePath('/assets/creator-opportunity-1400.webp')} srcSet={sitePath('/assets/creator-opportunity-700.webp') + ' 700w' + ', ' + sitePath('/assets/creator-opportunity-1400.webp') + ' 1400w'} sizes="(max-width: 760px) 90vw, 45vw" alt="StarApp concept showing a creator exploring professional opportunities" width="1400" height="1875" loading="lazy" /><span className="concept-label">A LOOK AT WHAT’S POSSIBLE / CONCEPT IMAGE</span><div className="photo-quote">Good talent.<br /><span>Great possibilities.</span></div></div><div className="opportunity-copy" data-reveal><div className="section-label section-label-light"><span>04</span> FOR BRANDS & SCOUTS</div><h2 id="opportunity-title">Find the person<br />behind the<br /><span>possibility.</span></h2><p>Discover the work first. Meet the talent behind it. Our planned Scout Marketplace will help companies find creators whose skills and vision fit what comes next.</p><div className="opportunity-features"><span><Compass size={17} /> Discover by talent and location</span><span><ShieldCheck size={17} /> Verified company profiles</span><span><Users size={17} /> Connections creators choose</span></div><button className="button button-white" onClick={() => join('scout')}>Let’s discover what’s next <ArrowUpRight size={19} /></button><small className="opportunity-footnote">Scout Marketplace is on the roadmap. Register your company’s interest for future updates.</small></div></div></section>

      <section className="faq-section container section-space" aria-labelledby="faq-title"><div className="faq-intro" data-reveal><div className="section-label"><span>05</span> A FEW THINGS TO KNOW</div><h2 id="faq-title">Curious?<br /><span className="serif-word">Good.</span></h2><p>Every new chapter starts<br />with a few questions.</p><div className="faq-spark" aria-hidden="true">✳</div></div><div className="faq-list" data-reveal>{questions.map((item, i) => <div className={`faq-item ${openFaq === i ? 'is-open' : ''}`} key={item.q}><h3><button aria-expanded={openFaq === i} aria-controls={`faq-answer-${i}`} id={`faq-question-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>{item.q}<span><ChevronDown size={20} /></span></button></h3><div id={`faq-answer-${i}`} role="region" aria-labelledby={`faq-question-${i}`} hidden={openFaq !== i}><p>{item.a}</p></div></div>)}</div></section>

      <section id="waitlist" className="waitlist-section container" aria-labelledby="waitlist-title"><div className="waitlist-inner"><div className="waitlist-copy"><div className="eyebrow"><span className="status-dot" /> YOUR STORY STARTS HERE</div><h2 id="waitlist-title">Be seen.<br />Be heard.<br /><span>Be early.</span></h2><p>The stage is taking shape.<br />Put your name on the list for what’s next.</p><div className="waitlist-brand-art" aria-hidden="true"><img src={sitePath('/assets/brand-mark-blue.svg')} alt="" width="170" height="170" /></div></div><div className="waitlist-form-wrap">{scanArrival && <p className="scan-arrival" role="status"><Check size={17} aria-hidden="true" /><span>You’re in the right place.<br /><strong>StarApp early access starts here.</strong></span></p>}{formState === 'success' ? <div className="signup-success" role="status" tabIndex={-1} ref={successRef}><span className="success-icon"><Check size={32} /></span><span className="eyebrow blue">YOU’RE ON THE LIST</span><h3>Your next chapter<br />looks good on you.</h3><p>Your interest has been saved for <strong>{submittedEmail}</strong>. You’re part of the beginning.</p><p className="success-note">We’re preparing early access. Joining the list doesn’t guarantee a beta invitation or create an app account.</p><button className="inline-link" onClick={() => { setFormState('idle'); setSubmittedEmail(''); requestAnimationFrame(() => emailRef.current?.focus({ preventScroll: true })); }}>Register another email <ArrowRight size={17} /></button><a className="success-share-link" href="#share">Know another creator? Share StarApp <ArrowUpRight size={15} /></a><div className="success-channel"><div className="success-channel-copy"><span className="eyebrow blue">STAY IN THE LOOP</span><p>Follow the StarApp WhatsApp Channel for app progress, launch news and early-access updates.</p><a className="button channel-button" href={channelUrl} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3c.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>Follow on WhatsApp <ArrowUpRight size={16} /></a></div><figure className="channel-qr"><img src={sitePath('/assets/starapp-whatsapp-channel-qr.svg')} width="112" height="112" alt="QR code that opens the StarApp WhatsApp Channel" loading="lazy" /><figcaption>Scan with your phone</figcaption></figure></div></div> : <form onSubmit={submit} method="post" className="waitlist-form"><noscript className="waitlist-noscript">Please enable JavaScript to join early access. Your details have not been submitted.</noscript><h3>A little about you.</h3><p className="form-subtitle">One small step. A world of possibility.</p><fieldset className="role-fieldset"><legend>I’m here as a</legend><div className="role-options"><label className={audience === 'creator' ? 'selected' : ''}><input type="radio" name="audience" value="creator" checked={audience === 'creator'} onChange={() => setAudience('creator')} /><Star size={16} /> Creator or fan</label><label className={audience === 'scout' ? 'selected' : ''}><input type="radio" name="audience" value="scout" checked={audience === 'scout'} onChange={() => setAudience('scout')} /><Compass size={16} /> Brand or scout</label></div></fieldset><label className="field-label" htmlFor="signup-name">Your name</label><input id="signup-name" type="text" name="name" placeholder="Your full name" autoComplete="name" maxLength={100} required disabled={formState === 'sending'} /><label className="field-label" htmlFor="signup-email">Email address</label><input ref={emailRef} id="signup-email" type="email" name="email" placeholder="you@example.com" autoComplete="email" maxLength={254} required disabled={formState === 'sending'} aria-describedby={error ? 'signup-error' : undefined} /><label className="field-label" htmlFor="signup-talent">{audience === 'scout' ? 'Talent you’re interested in' : 'What’s your kind of creative?'} <span>(optional)</span></label><div className="select-wrap"><select id="signup-talent" name="talent" value={talent} onChange={e => setTalent(e.target.value)} disabled={formState === 'sending'}><option value="">Choose a category</option>{categories.map(category => <option key={category}>{category}</option>)}</select><ChevronDown size={17} /></div><div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input type="text" name="website" id="website" tabIndex={-1} autoComplete="off" /></div><label className="consent-label"><input type="checkbox" name="consent" required disabled={formState === 'sending'} /><span>I’d like StarApp early-access and launch updates. I’ve read the <a href={sitePath('/privacy/')}>privacy notice</a>.</span></label>{error && <p id="signup-error" className="form-error" role="alert">{error}</p>}<button className="button button-blue form-submit" disabled={!formReady || formState === 'sending'} type="submit">{formState === 'sending' ? <>Saving your place <LoaderCircle size={19} className="spinner" /></> : <>Count me in <ArrowUpRight size={20} /></>}</button><p className="form-footnote"><ShieldCheck size={13} /> No payment. No app account. Just a first step.</p></form>}</div></div></section>
      <ShareSection onJoin={() => join(audience)} />
    </main>

    <footer className="site-footer container"><div className="footer-top"><Brand /><p>A brighter tomorrow.<br /><span>For every talent.</span></p><a href="#main" className="back-top" aria-label="Back to top"><ArrowUpRight size={24} /></a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} StarApp. Made for what’s next.</span><div><a href={sitePath('/privacy/')}>Privacy</a><a href="#faq-title">FAQs</a><a href="#share">Share StarApp</a><button onClick={toggleMotion} aria-pressed={paused} className="motion-toggle" aria-label={paused ? 'Enable decorative animation' : 'Pause decorative animation'}>{paused || reducedMotion ? <Play size={12} /> : <Pause size={12} />}{paused ? 'Motion paused' : reducedMotion ? 'Reduced motion' : 'Pause motion'}</button></div></div><p className="concept-disclosure">Campaign visuals illustrate the StarApp vision. Depicted profiles, metrics, rewards, and screens are concepts, not live results or guaranteed outcomes.</p></footer>
  </div>;
}
