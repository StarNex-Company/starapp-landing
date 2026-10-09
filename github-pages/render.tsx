import { renderToString } from 'react-dom/server';
import LandingPage from '../app/LandingPage';
import PrivacyPage from '../app/privacy/page';

export function render(page: 'home' | 'privacy'): string {
  return renderToString(page === 'privacy' ? <PrivacyPage /> : <LandingPage />);
}
