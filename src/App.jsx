import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from '@/config/pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import PageNotFound from '@/components/common/PageNotFound';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import UserNotRegisteredError from '@/components/common/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Pages that don't require authentication
const publicPages = ['Login'];

// Protected route wrapper component
const ProtectedRoute = ({ children }) => {
  const { isLoadingAuth, isAuthenticated, authError, navigateToLogin, user } = useAuth();
  const navigate = useNavigate();


  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      );
    }
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate("/login", { replace: true });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return children;
};

// Public route wrapper (for login page)
const PublicRoute = ({ children }) => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If already authenticated, redirect to main app
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Routes>
            {/* Public routes - accessible without authentication */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Pages.Login />
                </PublicRoute>
              } 
            />
            
            {/* Protected routes - require authentication */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <LayoutWrapper currentPageName={mainPageKey}>
                    <MainPage />
                  </LayoutWrapper>
                </ProtectedRoute>
              } 
            />
            {Object.entries(Pages).map(([path, Page]) => {
              if (publicPages.includes(path)) return null;
              return (
                <Route
                  key={path}
                  path={`/${path}`}
                  element={
                    <ProtectedRoute>
                      <LayoutWrapper currentPageName={path}>
                        <Page />
                      </LayoutWrapper>
                    </ProtectedRoute>
                  }
                />
              );
            })}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App