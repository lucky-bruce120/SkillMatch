import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'sonner';
import ScrollToTop from './components/ScrollToTop';
import { AuthProvider } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';

// Public Pages
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import JobListingsPage from './pages/JobListingsPage.jsx';
import JobDetailsPage from './pages/JobDetailsPage.jsx';

// Job Seeker Pages
import DashboardPage from './pages/DashboardPage.jsx';
import ProfileSettingsPage from './pages/ProfileSettingsPage.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';
import SavedJobsPage from './pages/SavedJobsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import CVAnalyzerPage from './pages/CVAnalyzerPage.jsx';
import CVAnalysisResultsPage from './pages/CVAnalysisResultPage.jsx';
import CourseRecommendationsPage from './pages/CourseRecommendationsPage.jsx';
import JobMarketAnalyticsPage from './pages/JobMarketAnalyticsPage.jsx';
import InterviewPrepPage from './pages/InterviewPrepPage.jsx';
import CareerPathPage from './pages/CareerPathPage.jsx';
import SkillGapAnalysisPage from './pages/SkillGapAnalysisPage.jsx';
import BookmarkedCoursesPage from './pages/BookmarkedCoursesPage.jsx';
import ApplicationWorkflowPage from './pages/ApplicationWorkflowPage.jsx';

// Employer Pages
import EmployerDashboard from './pages/employer/EmployerDashboard.jsx';
import PostJobPage from './pages/employer/PostJobPage.jsx';
import ManageJobsPage from './pages/employer/ManageJobsPage.jsx';
import JobApplicantsPage from './pages/employer/JobApplicantsPage.jsx';
import CandidateProfilePage from './pages/employer/CandidateProfilePage.jsx';
import EmployerApplicationDashboard from './pages/employer/EmployerApplicationDashboard.jsx';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import UserManagementPage from './pages/admin/UserManagementPage.jsx';
import JobModerationPage from './pages/admin/JobModerationPage.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/jobs" element={<JobListingsPage />} />
              <Route path="/job/:id" element={<JobDetailsPage />} />

              {/* Job Seeker Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Job Seeker']}><DashboardPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute allowedRoles={['Job Seeker']}><ProfileSettingsPage /></ProtectedRoute>} />
              <Route path="/applications" element={<ProtectedRoute allowedRoles={['Job Seeker']}><ApplicationsPage /></ProtectedRoute>} />
              <Route path="/apply/:jobId" element={<ProtectedRoute allowedRoles={['Job Seeker']}><ApplicationWorkflowPage /></ProtectedRoute>} />
              <Route path="/saved-jobs" element={<ProtectedRoute allowedRoles={['Job Seeker']}><SavedJobsPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              
              {/* Career Tools */}
              <Route path="/cv-analyzer" element={<ProtectedRoute allowedRoles={['Job Seeker']}><CVAnalyzerPage /></ProtectedRoute>} />
              <Route path="/cv-analysis/:id" element={<ProtectedRoute allowedRoles={['Job Seeker']}><CVAnalysisResultsPage /></ProtectedRoute>} />
              <Route path="/courses" element={<ProtectedRoute allowedRoles={['Job Seeker']}><CourseRecommendationsPage /></ProtectedRoute>} />
              <Route path="/job-market-analytics" element={<ProtectedRoute><JobMarketAnalyticsPage /></ProtectedRoute>} />
              <Route path="/interview-prep" element={<ProtectedRoute allowedRoles={['Job Seeker']}><InterviewPrepPage /></ProtectedRoute>} />
              <Route path="/career-path" element={<ProtectedRoute allowedRoles={['Job Seeker']}><CareerPathPage /></ProtectedRoute>} />
              <Route path="/skill-gap" element={<ProtectedRoute allowedRoles={['Job Seeker']}><SkillGapAnalysisPage /></ProtectedRoute>} />
              <Route path="/bookmarked-courses" element={<ProtectedRoute allowedRoles={['Job Seeker']}><BookmarkedCoursesPage /></ProtectedRoute>} />
              
              {/* Employer Protected Routes */}
              <Route path="/employer/dashboard" element={<ProtectedRoute allowedRoles={['Employer']}><EmployerDashboard /></ProtectedRoute>} />
              <Route path="/employer/jobs" element={<ProtectedRoute allowedRoles={['Employer']}><ManageJobsPage /></ProtectedRoute>} />
              <Route path="/employer/jobs/new" element={<ProtectedRoute allowedRoles={['Employer']}><PostJobPage /></ProtectedRoute>} />
              <Route path="/employer/jobs/:id/applicants" element={<ProtectedRoute allowedRoles={['Employer']}><JobApplicantsPage /></ProtectedRoute>} />
              <Route path="/employer/candidate/:id" element={<ProtectedRoute allowedRoles={['Employer']}><CandidateProfilePage /></ProtectedRoute>} />
              <Route path="/employer/applications" element={<ProtectedRoute allowedRoles={['Employer']}><EmployerApplicationDashboard /></ProtectedRoute>} />
              <Route path="/employer/interviews" element={<ProtectedRoute allowedRoles={['Employer']}><div className="container mx-auto py-8 text-center">Interviews Page Coming Soon</div></ProtectedRoute>} />

              {/* Admin Protected Routes */}
              <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['Admin']}><UserManagementPage /></ProtectedRoute>} />
              <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={['Admin']}><JobModerationPage /></ProtectedRoute>} />

              {/* Catch all */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                  <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
                  <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
                  <p className="text-muted-foreground mb-8">The page you are looking for doesn't exist or has been moved.</p>
                  <a href="/" className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors">
                    Back to Home
                  </a>
                </div>
              } />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  );
}

export default App;