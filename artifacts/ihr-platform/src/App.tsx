import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewModeProvider } from "@/contexts/ViewModeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "@/pages/not-found";

// Public pages
import Home from "@/pages/index";
import Features from "@/pages/features";
import Pricing from "@/pages/pricing";
import Jobs from "@/pages/jobs";
import JobDetail from "@/pages/job-detail";
import Login from "@/pages/login";
import PlatformLogin from "@/pages/platform-login";
import Register from "@/pages/register";
import Signup from "@/pages/signup";
import RegisterPersonal from "@/pages/register-personal";

// Chat-first main page (replaces all role dashboards)
import ChatMain from "@/pages/ChatMain";

// Role dashboards
import HrDashboard from "@/pages/hr/dashboard";
import CandidateDashboard from "@/pages/candidate/dashboard";
import EmployeeDashboard from "@/pages/employee/dashboard";

// HR document pages
import HrDocumentSettings from "@/pages/hr/document-settings";
import HrDocumentTemplates from "@/pages/hr/document-templates";
import HrDocuments from "@/pages/hr/documents";

// HR sub-pages
import HrRecruitment from "@/pages/hr/recruitment";
import HrJobs from "@/pages/hr/jobs";
import HrEmployees from "@/pages/hr/employees";
import HrEmployeeDetail from "@/pages/hr/employee-detail";
import HrAttendance from "@/pages/hr/attendance";
import HrLeaves from "@/pages/hr/leaves";
import HrPayroll from "@/pages/hr/payroll";
import HrRota from "@/pages/hr/rota";

// Employee sub-pages
import EmployeeDocuments from "@/pages/employee/documents";
import EmployeeAttendance from "@/pages/employee/attendance";
import EmployeeLeaves from "@/pages/employee/leaves";
import EmployeePayslips from "@/pages/employee/payslips";
import EmployeeOrganisation from "@/pages/employee/organisation";

// Admin
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCompanies from "@/pages/admin/companies";
import AdminCompanyDetail from "@/pages/admin/company-detail";
import AdminOrganisations from "@/pages/admin/organisations";

// Candidate sub-pages
import CandidateProfile from "@/pages/candidate/profile";
import CandidateApplications from "@/pages/candidate/applications";
import CandidateOrganizations from "@/pages/candidate/organizations";
import CandidateDataRequest from "@/pages/candidate/data-request";

const queryClient = new QueryClient();

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location]);
  return null;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
      <Route path="/" component={Home} />
      <Route path="/features" component={Features} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/jobs" component={Jobs} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/login" component={Login} />
      <Route path="/platform-login" component={PlatformLogin} />
      <Route path="/signup" component={Signup} />
      <Route path="/register" component={Register} />
      <Route path="/register/personal" component={RegisterPersonal} />

      {/* HR — base route goes to dashboard */}
      <Route path="/hr">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/dashboard">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/ai-chat">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <ChatMain />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/recruitment">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrRecruitment />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/jobs">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrJobs />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/employees">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrEmployees />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/employees/:id">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrEmployeeDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/attendance">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrAttendance />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/leaves">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrLeaves />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/payroll">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrPayroll />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/rota">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrRota />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/document-settings">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrDocumentSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/document-templates">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrDocumentTemplates />
        </ProtectedRoute>
      </Route>
      <Route path="/hr/documents">
        <ProtectedRoute allowedRoles={['owner', 'hr', 'manager', 'admin']}>
          <HrDocuments />
        </ProtectedRoute>
      </Route>

      {/* Employee — base route goes to dashboard */}
      <Route path="/employee">
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeeDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/ai-chat">
        <ProtectedRoute allowedRoles={['employee']}>
          <ChatMain />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/dashboard">
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeeDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/attendance">
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeeAttendance />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/leaves">
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeeLeaves />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/payslips">
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeePayslips />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/organisation">
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeeOrganisation />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/documents">
        <ProtectedRoute allowedRoles={['employee']}>
          <EmployeeDocuments />
        </ProtectedRoute>
      </Route>

      {/* Admin */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={['super_admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/organisations">
        <ProtectedRoute allowedRoles={['super_admin']}>
          <AdminOrganisations />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/companies">
        <ProtectedRoute allowedRoles={['super_admin']}>
          <AdminCompanies />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/companies/:id">
        <ProtectedRoute allowedRoles={['super_admin']}>
          <AdminCompanyDetail />
        </ProtectedRoute>
      </Route>

      {/* Candidate — base route goes to dashboard */}
      <Route path="/candidate">
        <ProtectedRoute>
          <CandidateDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/ai-chat">
        <ProtectedRoute>
          <ChatMain />
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/dashboard">
        <ProtectedRoute>
          <CandidateDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/profile">
        <ProtectedRoute>
          <CandidateProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/applications">
        <ProtectedRoute>
          <CandidateApplications />
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/organizations">
        <ProtectedRoute>
          <CandidateOrganizations />
        </ProtectedRoute>
      </Route>
      <Route path="/candidate/data-requests">
        <ProtectedRoute>
          <CandidateDataRequest />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ViewModeProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </ViewModeProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
