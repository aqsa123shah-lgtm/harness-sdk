import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { api } from './api.js';
import { useApp } from './context/AppContext.jsx';
import { BottomNav, MobileTopBar, RightRail, Sidebar } from './components/Nav.jsx';
import { Icon, Logo } from './components/Icons.jsx';
import { Modal, Toast } from './components/Modal.jsx';
import AuthPage from './pages/AuthPage.jsx';
import FeedPage from './pages/FeedPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import ReelsPage from './pages/ReelsPage.jsx';
import CreatePage from './pages/CreatePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import PostPage from './pages/PostPage.jsx';
import { cx } from './lib.js';

const SLIDES = [
  {
    icon: 'sparkle',
    title: 'A feed that feels designed',
    body: 'Photos, reels and stories in one calm, fast place — with a light and dark theme.',
  },
  {
    icon: 'send',
    title: 'Talk in real time',
    body: 'Typing indicators, read receipts and instant photo sharing in every conversation.',
  },
  {
    icon: 'shield',
    title: 'You are in control',
    body: 'Private accounts, blocking, reporting and content moderation keep the space safe.',
  },
];

function Splash() {
  return (
    <div className="splash">
      <Logo size={56} />
      <span className="splash-sub">Share your light</span>
      <span className="spinner" />
    </div>
  );
}

function OnboardingGate() {
  const { user, refreshMe } = useApp();
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);
  if (!user || user.onboarded || hidden) return null;
  const slide = SLIDES[index];
  const finish = async () => {
    setHidden(true);
    try {
      await api.post('/auth/onboarded');
      await refreshMe();
    } catch {
      /* the tour stays dismissed for this session */
    }
  };
  return (
    <Modal open onClose={finish} className="onboarding" labelledBy="onboarding-title">
      <div className="onboarding-art">
        <Icon name={slide.icon} size={40} />
      </div>
      <h2 id="onboarding-title">{slide.title}</h2>
      <p>{slide.body}</p>
      <div className="onboarding-dots">
        {SLIDES.map((item, dotIndex) => (
          <span key={item.title} className={dotIndex === index ? 'is-active' : ''} />
        ))}
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={finish}>
          Skip
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (index < SLIDES.length - 1 ? setIndex(index + 1) : finish())}
        >
          {index < SLIDES.length - 1 ? 'Next' : 'Start exploring'}
        </button>
      </div>
    </Modal>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const { user, loading } = useApp();
  const location = useLocation();
  const wide = location.pathname.startsWith('/messages') || location.pathname.startsWith('/reels');

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className={cx('app-shell', wide && 'is-wide')}>
      <Sidebar />
      <MobileTopBar />
      <main className="main-col">
        <Outlet />
      </main>
      {!wide && <RightRail />}
      <BottomNav />
      <OnboardingGate />
    </div>
  );
}

function NotFound() {
  return (
    <div className="page">
      <div className="center-pad">
        <h2>Page not found</h2>
        <p className="muted">That route does not exist in Lumen.</p>
        <a className="btn btn-primary btn-sm" href="/">
          Back to feed
        </a>
      </div>
    </div>
  );
}

export default function App() {
  const { toast } = useApp();
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<AuthPage initialMode="login" />} />
        <Route path="/signup" element={<AuthPage initialMode="signup" />} />
        <Route path="/forgot" element={<AuthPage initialMode="forgot" />} />
        <Route element={<Shell />}>
          <Route path="/" element={<FeedPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/reels" element={<ReelsPage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/messages/:id" element={<MessagesPage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="/p/:id" element={<PostPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toast toast={toast} />
    </>
  );
}
