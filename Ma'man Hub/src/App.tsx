import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./ProtectedRoute.tsx";
import UnauthorizedPage from "./pages/UnauthorizedPage";

// Auth Pages
import AuthCallbackPage from "./pages/auth/AuthCallbackPage.tsx";
import CompleteProfilePage from "./pages/auth/CompleteProfilePage";
import EmailVerificationPage from "./pages/auth/EmailVerificationPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import RegistrationPendingPage from "./pages/auth/RegistrationPendingPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import PublicProfilePage from "./pages/auth/PublicProfilePage.tsx";

import LeaderboardPage from "./pages/LeaderboardPage.tsx";
import FeedPage from "./pages/FeedPage.tsx";
import MyFeedsPage from "./pages/MyFeedsPage.tsx"

// Course Pages
import CartPage from "./pages/courses/CartPage";
import Categoriespage from "./pages/courses/Categoriespage";
import CheckoutPage from "./pages/courses/CheckoutPage";
import CourseDetailPage from "./pages/courses/CourseDetailPage";
import CoursePlayerPage from "./pages/courses/CoursePlayerPage";
import CourseCompletionPage from "./pages/courses/CourseCompletionPage";
import CourseProgressPage from "./pages/courses/CourseProgressPage";
import CoursesCatalogPage from "./pages/courses/CoursesCatalogPage";
import MyCoursesPage from "./pages/courses/MyCoursesPage";
import OrderConfirmationPage from "./pages/courses/OrderConfirmationPage";
import QuizPage from "./pages/courses/QuizPage";
import WishlistPage from "./pages/courses/Wishlistpage.tsx";


// Admin
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import FinancialOverviewPage from "./pages/admin/FinancialOverviewPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import ContentModerationPage from "./pages/admin/ContentModerationPage";
import AdminUserDetailPage from "@/pages/admin/AdminUserDetailPage";

// Creator
import CreatorDashboardPage from "./pages/creator/CreatorDashboardPage";
import CreatorProfilePage from "./pages/creator/CreatorProfilePage";
import GoLivePage from "./pages/creator/GoLivePage";
import LiveSessionPage from "./pages/creator/LiveSessionPage";
import CreatorMyCoursesPage from "@/pages/creator/MyCoursesPage";
import CourseDetailManagementPage from "@/pages/creator/CourseDetailManagementPage";
import CreateCoursePage from "@/pages/creator/CreateCoursePage";
import ContentCreatorListingPage from "@/pages/creator/ContentCreatorListingPage"
// ── Lesson creation & editing ────────────────────────────────────────────────
import LessonEditorPage from "@/pages/creator/LessonEditorPage";
import ChunkReviewPage from "@/pages/creator/ChunkReviewPage";
import SingleLessonReviewPage from "@/pages/creator/SingleLessonReviewPage";
import CoursePreviewPage from "@/pages/creator/CoursePreviewPage";

// Messages Pages
import MessagesPage from "./pages/messages/DirectMessagesPage.tsx";
import GroupChatPage from "./pages/messages/GroupChatPage";
import JoinGroupPage from "./pages/messages/JoinGroupPage";

// Parent
import ParentDashboardPage from "./pages/parent/ParentDashboardPage";
import ChildrenManagementPage from "./pages/parent/ChildrenManagementPage";
import ParentProfilePage from "./pages/parent/ParentProfilePage";

// Specialist
import SpecialistProfilePage from "./pages/specialist/SpecialistProfilePage";
import BookSessionPage from "./pages/specialist/BookSessionPage";
import SpecialistDashboardPage from "./pages/specialist/SpecialistDashboardPage";
import SpecialistListingPage from "./pages/specialist/SpecialistListingPage";
import StudentBookingsPage from "./pages/specialist/StudentBookingsPage";
import ConfirmBookingPage from "./pages/specialist/ConfirmBookingPage";
import SpecialistSessionsPage from "./pages/specialist/SpecialistSessionsPage";

// Student
import StudentProfilePage from "./pages/student/StudentProfilePage";
import StudentDashboardPage from "./pages/student/StudentDashboardPage";
import AcceptInvitePage from "./pages/student/AcceptInvitePage";
import CalendarPage from "./pages/CalendarPage";
const queryClient = new QueryClient();

const ADMIN          = ["Admin"] as const;
const CREATOR        = ["ContentCreator", "Admin"] as const;
const SPECIALIST     = ["Specialist", "Admin"] as const;
const PARENT         = ["Parent", "Admin"] as const;
const STUDENT_FAMILY = ["Student", "Parent", "Admin"] as const;
const ALL_AUTHENTICATED = [
  "Student", "Parent", "Specialist", "ContentCreator", "Admin",
] as const;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />

          {/* ── Admin ── */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={[...ADMIN]} element={<AdminDashboardPage />} />} />
          <Route path="/admin/profile"   element={<ProtectedRoute allowedRoles={[...ADMIN]} element={<AdminProfilePage />} />} />
          <Route path="/admin/users"     element={<ProtectedRoute allowedRoles={[...ADMIN]} element={<UserManagementPage />} />} />
          <Route path="/admin/users/:userId" element={<ProtectedRoute allowedRoles={[...ADMIN]} element={<AdminUserDetailPage />} />} />
          <Route path="/admin/moderation" element={<ProtectedRoute allowedRoles={[...ADMIN]} element={<ContentModerationPage />} />} />
          <Route path="/admin/financial"  element={<ProtectedRoute allowedRoles={[...ADMIN]} element={<FinancialOverviewPage />} />} />

          {/* ── Auth ── */}
          <Route path="/auth/callback"        element={<AuthCallbackPage />} />
          <Route path="/complete-profile"     element={<CompleteProfilePage />} />
          <Route path="/verify-email"         element={<EmailVerificationPage />} />
          <Route path="/forgot-password"      element={<ForgotPasswordPage />} />
          <Route path="/login"                element={<LoginPage />} />
          <Route path="/register"             element={<RegisterPage />} />
          <Route path="/registration-pending" element={<RegistrationPendingPage />} />
          <Route path="/reset-password"       element={<ResetPasswordPage />} />
          <Route path="/profile/:userId"      element={<PublicProfilePage />} />
          <Route path="/leaderboard"          element={<LeaderboardPage />} />
          <Route path="/feeds"                element={<FeedPage />} />
          <Route path="/my-feeds"             element={<MyFeedsPage />} />


          {/* ── Courses (student-facing) ── */}
          <Route path="/cart"       element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<CartPage />} />} />
          <Route path="/categories" element={<Categoriespage />} />
          <Route path="/courses"    element={<CoursesCatalogPage />} />
          <Route path="/checkout"   element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<CheckoutPage />} />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          <Route path="/course/:courseId/learn"    element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<CoursePlayerPage />} />} />
          <Route path="/course/:courseId/complete" element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<CourseCompletionPage />} />} />
          <Route path="/course/:courseId/progress" element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<CourseProgressPage />} />} />

          <Route
            path="/course/:courseId/lesson/:lessonId/quiz"
            element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<QuizPage />} />}
          />
          <Route
            path="/course/:courseId/quiz/:quizId"
            element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<QuizPage />} />}
          />

          <Route path="/wishlist" element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<WishlistPage />} />} />

          {/* ── Creator ── */}
          <Route path="/ContentCreator/dashboard" element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<CreatorDashboardPage />} />} />
          <Route path="/ContentCreator/profile"   element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<CreatorProfilePage />} />} />
          <Route path="/ContentCreator/go-live"   element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<GoLivePage />} />} />
          <Route path="/live/:sessionId"           element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<LiveSessionPage />} />} />

          <Route path="/ContentCreator/my-courses"   element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<CreatorMyCoursesPage />} />} />
          <Route path="/creator/courses/new"  element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<CreateCoursePage />} />} />

          <Route
            path="/creator/courses/:courseId"
            element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<CourseDetailManagementPage />} />}
          />

          <Route
            path="/creator/courses/:courseId/sections/:sectionId/lessons/:lessonId"
            element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<LessonEditorPage />} />}
          />

          <Route
            path="/creator/courses/:courseId/chunk-review/:jobId"
            element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<ChunkReviewPage />} />}
          />

          <Route
            path="/creator/courses/:courseId/single-lesson-review/:jobId"
            element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<SingleLessonReviewPage />} />}
          />

          <Route
            path="/creator/courses/:courseId/preview"
            element={<ProtectedRoute allowedRoles={[...CREATOR]} element={<CoursePreviewPage />} />}
          />

          <Route
            path="/instructors"
           element={<ContentCreatorListingPage />} 
          />

          {/* ── Messages ── */}
          <Route path="/messages" element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<MessagesPage />} />} />
          <Route path="/groups"   element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]} element={<GroupChatPage />} />} />
          <Route path="/join/:code" element={<JoinGroupPage />} />

          {/* ── Parent ── */}
          <Route path="/parent/dashboard" element={<ProtectedRoute allowedRoles={[...PARENT]} element={<ParentDashboardPage />} />} />
          <Route path="/parent/children" element={<ProtectedRoute allowedRoles={[...PARENT]} element={<ChildrenManagementPage />} />} />
          <Route path="/parent/profile"   element={<ProtectedRoute allowedRoles={[...PARENT]} element={<ParentProfilePage />} />} />

          {/* ── Specialist ── */}
          <Route path="/specialist/profile"   element={<ProtectedRoute allowedRoles={[...SPECIALIST]} element={<SpecialistProfilePage />} />} />
          <Route path="/specialist/dashboard" element={<ProtectedRoute allowedRoles={[...SPECIALIST]}><SpecialistDashboardPage /></ProtectedRoute>} />
          <Route path="/specialists"          element={<SpecialistListingPage />} />
          <Route path="/specialists/:specialistId/book" element={<ProtectedRoute allowedRoles={[...ALL_AUTHENTICATED]}><BookSessionPage /></ProtectedRoute>} />
          <Route path="/bookings"                        element={<StudentBookingsPage />} />
          <Route path="/bookings/:appointmentId/confirm" element={<ConfirmBookingPage />} />
          <Route path="/specialist/sessions" element={<ProtectedRoute allowedRoles={[...SPECIALIST]}><SpecialistSessionsPage /></ProtectedRoute>} />

          {/* ── Student ── */}
          <Route path="/student/accept-invite" element={<ProtectedRoute allowedRoles={[...STUDENT_FAMILY]} element={<AcceptInvitePage />} />} />
          <Route path="/student/dashboard"     element={<ProtectedRoute allowedRoles={[...STUDENT_FAMILY]} element={<StudentDashboardPage />} />} />
          <Route path="/student/profile"       element={<ProtectedRoute allowedRoles={[...STUDENT_FAMILY]} element={<StudentProfilePage />} />} />
    <Route
      path="/student/my-courses"
       element={<MyCoursesPage />}
    />

    <Route
      path="/calendar"
       element={<CalendarPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*"             element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;