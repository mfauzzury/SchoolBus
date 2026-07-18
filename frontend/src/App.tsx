import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { OperatorLayout } from '@/layouts/OperatorLayout'
import { ParentLayout } from '@/layouts/ParentLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { OperatorSignup } from '@/pages/OperatorSignup'
import { OperatorDashboard } from '@/pages/operator/Dashboard'
import { Buses } from '@/pages/operator/Buses'
import { Staff } from '@/pages/operator/Staff'
import { Students } from '@/pages/operator/Students'
import { Routes as RoutesPage } from '@/pages/operator/Routes'
import { Finances } from '@/pages/operator/Finances'
import { Settings } from '@/pages/operator/Settings'
import { ParentDashboard } from '@/pages/parent/Dashboard'
import { EnrollChild } from '@/pages/parent/EnrollChild'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
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
            <Route path="/operator/finances" element={<Finances />} />
            <Route path="/operator/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute role="parent" />}>
          <Route element={<ParentLayout />}>
            <Route path="/parent/dashboard" element={<ParentDashboard />} />
            <Route path="/parent/enroll" element={<EnrollChild />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
