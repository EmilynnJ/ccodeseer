import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';

// Layout
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Eager loaded pages
import Home from './pages/Home';
import About from './pages/About';
import Readers from './pages/Readers';

// Lazy loaded pages
const ReaderProfile = lazy(() => import('./pages/ReaderProfile'));
const Live = lazy(() => import('./pages/Live'));
const Shop = lazy(() => import('./pages/Shop'));
const Community = lazy(() => import('./pages/Community'));
const Messages = lazy(() => import('./pages/Messages'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Session = lazy(() => import('./pages/Session'));

// Get Clerk publishable key
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="card p-8 max-w-md text-center">
          <h2 className="text-xl text-white mb-4">Configuration Required</h2>
          <p className="text-gray-400">
            Please add your Clerk Publishable Key to the .env file:
          </p>
          <code className="block mt-4 p-3 bg-dark-700 rounded text-sm text-primary-400">
            VITE_CLERK_PUBLISHABLE_KEY=pk_...
          </code>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Main layout routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="readers" element={<Readers />} />
              <Route
                path="readers/:slug"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ReaderProfile />
                  </Suspense>
                }
              />
              <Route
                path="live"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Live />
                  </Suspense>
                }
              />
              <Route
                path="shop"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Shop />
                  </Suspense>
                }
              />
              <Route
                path="community"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Community />
                  </Suspense>
                }
              />
              <Route
                path="messages"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Messages />
                  </Suspense>
                }
              />
              <Route
                path="dashboard/*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Dashboard />
                  </Suspense>
                }
              />
              <Route
                path="session/:sessionId"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <Session />
                  </Suspense>
                }
              />

              {/* Auth pages */}
              <Route
                path="sign-in/*"
                element={
                  <div className="min-h-screen flex items-center justify-center py-12">
                    <SignIn routing="path" path="/sign-in" />
                  </div>
                }
              />
              <Route
                path="sign-up/*"
                element={
                  <div className="min-h-screen flex items-center justify-center py-12">
                    <SignUp routing="path" path="/sign-up" />
                  </div>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
    </ErrorBoundary>
  );
}

export default App;
