import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { OperatorLayout } from '@/layouts/OperatorLayout'
import { SettingsLayout } from '@/layouts/SettingsLayout'
import { MarketingLayout } from '@/layouts/MarketingLayout'
import { ParentLayout } from '@/layouts/ParentLayout'
import { SaasAdminLayout } from '@/layouts/SaasAdminLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
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
import { Buses } from '@/pages/operator/Buses'
import { Staff } from '@/pages/operator/Staff'
import { Students } from '@/pages/operator/Students'
import { Applications } from '@/pages/operator/Applications'
import { ApplicationReview } from '@/pages/operator/ApplicationReview'
import { Routes as RoutesPage } from '@/pages/operator/Routes'
import { Finances } from '@/pages/operator/Finances'
import { Settings } from '@/pages/operator/Settings'
import { ParentDashboard } from '@/pages/parent/Dashboard'
import { ParentInvoices } from '@/pages/parent/Invoices'
import { ParentProfilePage } from '@/pages/parent/Profile'
import { EnrollChild } from '@/pages/parent/EnrollChild'
import { PayInvoices } from '@/pages/parent/PayInvoices'
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
            <Route path="/operator/students" element={<Students />} />
            <Route path="/operator/applications" element={<Applications />} />
            <Route path="/operator/applications/:id" element={<ApplicationReview />} />
            <Route path="/operator/finances" element={<Finances />} />
            <Route path="/operator/settings" element={<SettingsLayout />}>
              <Route index element={<Settings />} />
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
            <Route path="/parent/invoices" element={<ParentInvoices />} />
            <Route path="/parent/profile" element={<ParentProfilePage />} />
            <Route path="/parent/enroll" element={<EnrollChild />} />
            <Route path="/parent/invoices/pay" element={<PayInvoices />} />
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
