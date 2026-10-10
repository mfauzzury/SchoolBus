import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { OperatorLayout } from '@/layouts/OperatorLayout'
import { SettingsLayout } from '@/layouts/SettingsLayout'
import { MarketingLayout } from '@/layouts/MarketingLayout'
import { ParentLayout } from '@/layouts/ParentLayout'
import { SaasAdminLayout } from '@/layouts/SaasAdminLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { FEATURES } from '@/lib/features'
import { Landing } from '@/pages/Landing'
import { Operators } from '@/pages/Operators'
import { About } from '@/pages/About'
import { Contact } from '@/pages/Contact'
import { Terms } from '@/pages/Terms'
import { Privacy } from '@/pages/Privacy'
import { Login } from '@/pages/Login'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { Register } from '@/pages/Register'
import { OperatorSignup } from '@/pages/OperatorSignup'
import { OperatorDashboard } from '@/pages/operator/Dashboard'
import { OperatorLive } from '@/pages/operator/Live'
import { Buses } from '@/pages/operator/Buses'
import { Staff } from '@/pages/operator/Staff'
import { Students } from '@/pages/operator/Students'
import { StudentDetail } from '@/pages/operator/StudentDetail'
import { Applications } from '@/pages/operator/Applications'
import { ApplicationReview } from '@/pages/operator/ApplicationReview'
import { Routes as RoutesPage } from '@/pages/operator/Routes'
import { Finances } from '@/pages/operator/Finances'
import { BillDetail } from '@/pages/operator/BillDetail'
import { Settings } from '@/pages/operator/Settings'
import { BillingSettings } from '@/pages/operator/BillingSettings'
import { ParentDashboard } from '@/pages/parent/Dashboard'
import { ParentTrack } from '@/pages/parent/Track'
import { ParentInvoices } from '@/pages/parent/Invoices'
import { ParentInvoiceDetail } from '@/pages/parent/InvoiceDetail'
import { ParentProfilePage } from '@/pages/parent/Profile'
import { EnrollChild } from '@/pages/parent/EnrollChild'
import { ChildProfile } from '@/pages/parent/ChildProfile'
import { PayInvoices } from '@/pages/parent/PayInvoices'
import { PayReturn } from '@/pages/parent/PayReturn'
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminOperators } from '@/pages/admin/Operators'
import { AdminOperatorPage } from '@/pages/admin/OperatorDetail'
import { AdminTransactions } from '@/pages/admin/Transactions'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/operators" element={<Operators />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/signup" element={<OperatorSignup />} />
          <Route path="/register/:code" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute role="operator" />}>
          <Route element={<OperatorLayout />}>
            <Route path="/operator/dashboard" element={<OperatorDashboard />} />
            <Route
              path="/operator/live"
              element={FEATURES.operatorLive ? <OperatorLive /> : <Navigate to="/operator/dashboard" replace />}
            />
            <Route path="/operator/students" element={<Students />} />
            <Route path="/operator/students/:id" element={<StudentDetail />} />
            <Route path="/operator/applications" element={<Applications />} />
            <Route path="/operator/applications/:id" element={<ApplicationReview />} />
            <Route path="/operator/finances" element={<Finances />} />
            <Route path="/operator/finances/bills/:id" element={<BillDetail />} />
            <Route path="/operator/settings" element={<SettingsLayout />}>
              <Route index element={<Settings />} />
              <Route path="billing" element={<BillingSettings />} />
              <Route path="routes" element={<RoutesPage />} />
              <Route path="buses" element={<Buses />} />
              <Route path="staff" element={<Staff />} />
            </Route>
            <Route path="/operator/routes" element={<Navigate to="/operator/settings/routes" replace />} />
            <Route path="/operator/buses" element={<Navigate to="/operator/settings/buses" replace />} />
            <Route path="/operator/staff" element={<Navigate to="/operator/settings/staff" replace />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="parent" />}>
          <Route element={<ParentLayout />}>
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route
              path="/parent/track"
              element={FEATURES.parentTrack ? <ParentTrack /> : <Navigate to="/parent/dashboard" replace />}
            />
            <Route path="/parent/invoices" element={<ParentInvoices />} />
            <Route path="/parent/invoices/:id" element={<ParentInvoiceDetail />} />
            <Route path="/parent/profile" element={<ParentProfilePage />} />
            <Route path="/parent/enroll" element={<EnrollChild />} />
            <Route path="/parent/children/:id" element={<ChildProfile />} />
            <Route path="/parent/invoices/pay" element={<PayInvoices />} />
            <Route path="/parent/invoices/pay/return/:attemptId" element={<PayReturn />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="saas_admin" />}>
          <Route element={<SaasAdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/operators" element={<AdminOperators />} />
            <Route path="/admin/operators/:id" element={<AdminOperatorPage />} />
            <Route path="/admin/transactions" element={<AdminTransactions />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
