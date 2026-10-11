import PrivacyRequest from '../components/PrivacyRequest';
import type { Metadata } from 'next';
import { sitePath } from '../../lib/site-paths';

export const metadata: Metadata = { title: 'Privacy notice — StarApp', description: 'How the StarApp early-access page handles your signup information.', alternates: {canonical:'/privacy'} };
export default function PrivacyPage() {
 return <div className="legal-page"><header className="legal-header container"><a href={sitePath('/')} className="brand"><img src={sitePath('/assets/brand-mark-blue.svg')} width="35" height="35" alt="" /><span>StarApp<span className="brand-dot">.</span></span></a><a href={sitePath('/')}>Back to StarApp ↗</a></header><main className="legal-content"><div className="eyebrow">STARAPP EARLY ACCESS</div><h1>A little clarity<br />about your privacy.</h1>
  <p>This notice covers the StarApp prelaunch website and its interest list. It does not describe a launched StarApp application or an app account.</p>
  <h2>What the signup saves</h2>
  <p>When you join, the website sends your name, email address, whether you are interested as a creator or a brand/scout, your chosen talent category, and your consent to the StarApp team’s Google Form. Google Forms records accepted responses and their submission time. The talent category is optional; an unselected category is sent as “Other”.</p>
  <h2>Why we collect it</h2>
  <p>The StarApp team can use these details to organize the early-access community and contact interested people about the launch and beta opportunities they requested. Signing up does not create an app account, start a paid subscription, enter a competition, or guarantee an invitation.</p>
  <h2>Where information is held</h2>
  <p>The public landing page is hosted on GitHub Pages, with a version also available through Sites hosting. Submitting the signup form takes you to Google Forms in the same tab, where Google displays the result of your submission. Current signup responses are held in the StarApp team’s Google Form. A confirmation there does not mean a confirmation email has been sent.</p>
  <p>Any registrations collected through the earlier StarApp service, and removal requests accepted by that service, remain in its database on Cloudflare infrastructure through Sites hosting. The StarApp website does not publish signup records or provide visitors with a list of registrants.</p>
  <h2>Website preferences and abuse prevention</h2>
  <p>Your animation preference may be saved in your browser so the site can remember it on your next visit. The signup form has a hidden field intended to filter automated submissions. The separate removal-request service uses temporary hashed network identifiers to limit repeated requests. GitHub, Google, and Cloudflare may process technical request information, including IP addresses, to operate and secure their services.</p>
  <h2>Your choice</h2>
  <p>Joining is optional. Use an email address you own. We do not ask for passwords, payment information, identity documents, or uploaded creative work on this page.</p>
  <p><strong>The removal-request form below is currently unavailable to public visitors while access is being configured.</strong> Once available, it will record your email, optional message, and request time for the StarApp team to review. The team may need to verify that you own the address before acting. Recording a request does not automatically delete a registration from Google Forms or the earlier database.</p>
  <PrivacyRequest />
  <h2>About the images</h2>
  <p>The supplied StarApp campaign images communicate a product vision. Profiles, follower counts, prizes, and interface examples shown within them are illustrative and do not represent verified users, current results, or guaranteed outcomes.</p>
  <p><a href={sitePath('/#waitlist')}>Back to the early-access list →</a></p>
 </main></div>;
}
