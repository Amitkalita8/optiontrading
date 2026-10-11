import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './View/Components/Layout/AppLayout';
import { AuthProvider } from './View/Components/UserAuthentication/AuthContext/AuthContext';
import { MarketStatusProvider } from './Controller/MarketStatusContext';
import DashboardSkeleton from './View/Pages/Dashboard/DashboardSkeleton';
import CampaignsSkeleton from './View/Pages/Campaigns/CampaignsSkeleton';
import OpportunitiesSkeleton from './View/Pages/Opportunities/OpportunitiesSkeleton';
import WatchlistsSkeleton from './View/Pages/Watchlist/WatchlistsSkeleton';
import TradeApproachesSkeleton from './View/Pages/TradeApproach/TradeApproachesSkeleton';
import ApproachEditorSkeleton from './View/Pages/TradeApproach/ApproachEditorSkeleton';
import { AddCompanySkeleton, CreateWatchlistSkeleton } from './View/Pages/Watchlist/WatchlistFlowSkeletons';
import StockPageSkeleton from './View/Pages/Stock/StockPageSkeleton';
import PlaceholderPage from './View/Pages/Placeholder/PlaceholderPage';

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

const placeholderRoutes = [
  { path: 'opportunities/:id', title: 'Opportunity details' },
  { path: 'positions', title: 'Existing Positions' },
  { path: 'trade-log', title: 'Trade Log' },
  { path: 'notifications', title: 'Notifications' },
  { path: 'settings', title: 'Settings' },
];

function App() {
  return (
    <AuthProvider>
      <MarketStatusProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route
                index
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
                path="stocks/:symbol"
                element={
                  <Suspense fallback={<StockPageSkeleton />}>
                    <StockPage />
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
    </AuthProvider>
  );
}

export default App;
