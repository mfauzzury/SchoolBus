import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { OperatorLayout } from '@/layouts/OperatorLayout'
import { ParentLayout } from '@/layouts/ParentLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Landing } from '@/pages/Landing'
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
import { PayInvoice } from '@/pages/parent/PayInvoice'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

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
            <Route path="/operator/routes" element={<RoutesPage />} />
            <Route path="/operator/buses" element={<Buses />} />
            <Route path="/operator/staff" element={<Staff />} />
            <Route path="/operator/students" element={<Students />} />
            <Route path="/operator/applications" element={<Applications />} />
            <Route path="/operator/applications/:id" element={<ApplicationReview />} />
            <Route path="/operator/finances" element={<Finances />} />
            <Route path="/operator/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="parent" />}>
          <Route element={<ParentLayout />}>
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route path="/parent/invoices" element={<ParentInvoices />} />
            <Route path="/parent/profile" element={<ParentProfilePage />} />
            <Route path="/parent/enroll" element={<EnrollChild />} />
            <Route path="/parent/invoices/:id/pay" element={<PayInvoice />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
