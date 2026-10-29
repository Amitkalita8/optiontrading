import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './View/Components/Layout/AppLayout';
import { AuthProvider } from './View/Components/UserAuthentication/AuthContext/AuthContext';
import { MarketStatusProvider } from './Controller/MarketStatusContext';
import { AppearanceProvider } from './Controller/AppearanceContext';
import { LocaleProvider } from './Controller/LocaleContext';
import DashboardSkeleton from './View/Pages/Dashboard/DashboardSkeleton';
import CampaignsSkeleton from './View/Pages/Campaigns/CampaignsSkeleton';
import OpportunitiesSkeleton from './View/Pages/Opportunities/OpportunitiesSkeleton';
import WatchlistsSkeleton from './View/Pages/Watchlist/WatchlistsSkeleton';
import TradeApproachesSkeleton from './View/Pages/TradeApproach/TradeApproachesSkeleton';
import ApproachEditorSkeleton from './View/Pages/TradeApproach/ApproachEditorSkeleton';
import { AddCompanySkeleton, CreateWatchlistSkeleton } from './View/Pages/Watchlist/WatchlistFlowSkeletons';
import StockPageSkeleton from './View/Pages/Stock/StockPageSkeleton';
import AskAISkeleton from './View/Pages/AskAI/AskAISkeleton';
import NotificationsSkeleton from './View/Pages/Notifications/NotificationsSkeleton';
import PlaceholderPage from './View/Pages/Placeholder/PlaceholderPage';
// The landing page is the entry point, so it isn't code-split.
import LandingPage from './View/Pages/Landing/LandingPage';

// Pages are code-split; their skeleton shows while the page bundle downloads.
const DashboardPage = lazy(() => import('./View/Pages/Dashboard/DashboardPage'));
const CampaignsPage = lazy(() => import('./View/Pages/Campaigns/CampaignsPage'));
const OpportunitiesPage = lazy(() => import('./View/Pages/Opportunities/OpportunitiesPage'));
const WatchlistsPage = lazy(() => import('./View/Pages/Watchlist/WatchlistsPage'));
const CreateWatchlistPage = lazy(() => import('./View/Pages/Watchlist/CreateWatchlistPage'));
const AddCompanyPage = lazy(() => import('./View/Pages/Watchlist/AddCompanyPage'));
const StockPage = lazy(() => import('./View/Pages/Stock/StockPage'));
const TradeApproachesPage = lazy(() => import('./View/Pages/TradeApproach/TradeApproachesPage'));
const ApproachEditorPage = lazy(() => import('./View/Pages/TradeApproach/ApproachEditorPage'));
const AskAIPage = lazy(() => import('./View/Pages/AskAI/AskAIPage'));
const PositionsPage = lazy(() => import('./View/Pages/Positions/PositionsPage'));
const PositionOpportunityDetailsPage = lazy(() => import('./View/Pages/Positions/PositionOpportunityDetailsPage'));
const TradeLogPage = lazy(() => import('./View/Pages/TradeLog/TradeLogPage'));
const TradeReportPage = lazy(() => import('./View/Pages/TradeLog/TradeReportPage'));
const NotificationsPage = lazy(() => import('./View/Pages/Notifications/NotificationsPage'));
const OnboardingPage = lazy(() => import('./View/Pages/Onboarding/OnboardingPage'));
const OpportunityDetailsPage = lazy(() => import('./View/Pages/Opportunities/OpportunityDetailsPage'));
const ProfilePage = lazy(() => import('./View/Pages/Profile/ProfilePage'));

const placeholderRoutes = [];

function App() {
  return (
    <AppearanceProvider>
    <AuthProvider>
    <LocaleProvider>
      <MarketStatusProvider>
        <BrowserRouter>
          <Routes>
            <Route index element={<LandingPage />} />
            <Route
              path="onboarding"
              element={
                <Suspense fallback={<div className="loading" />}>
                  <OnboardingPage />
                </Suspense>
              }
            />
            <Route element={<AppLayout />}>
              <Route
                path="dashboard"
                element={
                  <Suspense fallback={<DashboardSkeleton />}>
                    <DashboardPage />
                  </Suspense>
                }
              />
              <Route
                path="campaigns"
                element={
                  <Suspense fallback={<CampaignsSkeleton />}>
                    <CampaignsPage />
                  </Suspense>
                }
              />
              <Route
                path="opportunities"
                element={
                  <Suspense fallback={<OpportunitiesSkeleton />}>
                    <OpportunitiesPage />
                  </Suspense>
                }
              />
              <Route
                path="watchlist"
                element={
                  <Suspense fallback={<WatchlistsSkeleton />}>
                    <WatchlistsPage />
                  </Suspense>
                }
              />
              <Route
                path="watchlist/new"
                element={
                  <Suspense fallback={<CreateWatchlistSkeleton />}>
                    <CreateWatchlistPage />
                  </Suspense>
                }
              />
              <Route
                path="watchlist/:id/add"
                element={
                  <Suspense fallback={<AddCompanySkeleton />}>
                    <AddCompanyPage />
                  </Suspense>
                }
              />
              <Route
                path="trade-approaches"
                element={
                  <Suspense fallback={<TradeApproachesSkeleton />}>
                    <TradeApproachesPage />
                  </Suspense>
                }
              />
              <Route
                path="trade-approaches/new"
                element={
                  <Suspense fallback={<ApproachEditorSkeleton />}>
                    <ApproachEditorPage />
                  </Suspense>
                }
              />
              <Route
                path="trade-approaches/:id/edit"
                element={
                  <Suspense fallback={<ApproachEditorSkeleton existing />}>
                    <ApproachEditorPage key="edit" />
                  </Suspense>
                }
              />
              <Route
                path="ask-ai"
                element={
                  <Suspense fallback={<AskAISkeleton />}>
                    <AskAIPage />
                  </Suspense>
                }
              />
              <Route
                path="stocks/:symbol"
                element={
                  <Suspense fallback={<StockPageSkeleton />}>
                    <StockPage />
                  </Suspense>
                }
              />
              <Route
                path="positions"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <PositionsPage />
                  </Suspense>
                }
              />
              <Route
                path="positions/:id"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <PositionOpportunityDetailsPage />
                  </Suspense>
                }
              />
              <Route
                path="positions/opportunity/:id"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <PositionOpportunityDetailsPage />
                  </Suspense>
                }
              />
              <Route
                path="trade-log"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <TradeLogPage />
                  </Suspense>
                }
              />
              <Route
                path="trade-log/:id"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <TradeReportPage />
                  </Suspense>
                }
              />
              <Route
                path="trade-log/report/:id"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <TradeReportPage />
                  </Suspense>
                }
              />
              <Route
                path="notifications"
                element={
                  <Suspense fallback={<NotificationsSkeleton />}>
                    <NotificationsPage />
                  </Suspense>
                }
              />
              <Route
                path="opportunities/:id"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <OpportunityDetailsPage />
                  </Suspense>
                }
              />
              <Route
                path="profile"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="settings"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="settings/:tab"
                element={
                  <Suspense fallback={<div className="loading" />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              {placeholderRoutes.map((r) => (
                <Route key={r.path} path={r.path} element={<PlaceholderPage title={r.title} />} />
              ))}
              <Route path="*" element={<PlaceholderPage title="Page not found" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MarketStatusProvider>
    </LocaleProvider>
    </AuthProvider>
    </AppearanceProvider>
  );
}

export default App;
