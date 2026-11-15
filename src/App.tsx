import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Shell } from './components/Shell';
import { Upsell } from './components/Upsell';
import { products } from './content';
import { fallbackConfig, loadPublicConfig, type PublicConfig } from './lib/catalog';
import { ensurePixel, rememberUtm, track } from './lib/meta';

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })));
const NotesPage = lazy(() => import('./pages/NotesPage').then((module) => ({ default: module.NotesPage })));
const AiPage = lazy(() => import('./pages/AiPage').then((module) => ({ default: module.AiPage })));
const Campus = lazy(() => import('./pages/Campus').then((module) => ({ default: module.Campus })));
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })));
const CheckoutSheet = lazy(() => import('./components/CheckoutSheet').then((module) => ({ default: module.CheckoutSheet })));

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [config, setConfig] = useState<PublicConfig>(fallbackConfig);
  const [upsell, setUpsell] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);

  useEffect(() => {
    rememberUtm();
    void loadPublicConfig().then((next) => {
      setConfig(next);
      if (next.pixelId) ensurePixel(next.pixelId);
    });
  }, []);

  useEffect(() => {
    const id = location.pathname === '/notes' ? 'notes' : location.pathname === '/aivakeel' ? 'aivakeel' : '';
    track('PageView');
    if (id === 'notes' || id === 'aivakeel') {
      track('ViewContent', {
        content_ids: [id],
        content_type: 'product',
        currency: 'INR',
        value: config.prices[id],
      });
    }
  }, [location.pathname, config.prices]);

  function onVerified(result: { products: string[] }) {
    void import('canvas-confetti').then(({ default: confetti }) => {
      void confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors: ['#D97706', '#059669', '#F8FAFC'] });
    });
    const ownsAll = ['notes', 'aivakeel', 'cheatsheet'].every((id) => result.products.includes(id));
    if (config.upsellEnabled && !ownsAll) setUpsell(true);
    else navigate('/campus');
  }

  return (
    <>
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Shell><Home /></Shell>} />
        <Route path="/notes" element={<Shell><NotesPage config={config} onVerified={onVerified} /></Shell>} />
        <Route path="/aivakeel" element={<Shell><AiPage config={config} onVerified={onVerified} /></Shell>} />
        <Route path="/campus" element={<Campus />} />
        <Route path="/admin" element={<Shell><Admin /></Shell>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Upsell
        open={upsell}
        onAccept={() => {
          setUpsell(false);
          setBundleOpen(true);
        }}
        onDecline={() => {
          setUpsell(false);
          navigate('/campus');
        }}
      />
      <CheckoutSheet
        open={bundleOpen}
        productId="acceleration"
        title={products.acceleration.name}
        priceLabel={`₹${config.prices.acceleration}`}
        value={config.prices.acceleration}
        onClose={() => {
          setBundleOpen(false);
          navigate('/campus');
        }}
        onVerified={() => {
          setBundleOpen(false);
          navigate('/campus');
        }}
      />
      </Suspense>
    </>
  );
}
