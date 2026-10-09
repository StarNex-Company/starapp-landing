import { hydrateRoot } from 'react-dom/client';
import LandingPage from '../app/LandingPage';
import PrivacyPage from '../app/privacy/page';
import '@fontsource-variable/manrope';
import '../app/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('The StarApp page container is missing.');
const isPrivacy = document.documentElement.dataset.page === 'privacy';
hydrateRoot(root, isPrivacy ? <PrivacyPage /> : <LandingPage />);
