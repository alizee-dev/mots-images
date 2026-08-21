import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import Layout from './Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import StudentsListPage from './pages/students/StudentsListPage'
import StudentDetailPage from './pages/students/StudentDetailPage'
import SessionDetailPage from './pages/students/SessionDetailPage'
import WordsBankPage from './pages/words/WordsBankPage'
import WordEditorPage from './pages/words/WordEditorPage'
import SeriesListPage from './pages/series/SeriesListPage'
import NewSeriesPage from './pages/series/NewSeriesPage'
import SeriesDetailPage from './pages/series/SeriesDetailPage'
import TestSessionPage from './pages/students/TestSessionPage'
import './index.css'

export default function App() {
  return (
    <>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/students" element={<StudentsListPage />} />
              <Route path="/students/:studentId" element={<StudentDetailPage />} />
              <Route path="/students/:studentId/sessions/:sessionId" element={<SessionDetailPage />} />
              <Route path="/students/:studentId/assignments/:assignmentId/test" element={<TestSessionPage />} />
              <Route path="/words" element={<WordsBankPage />} />
              <Route path="/words/new" element={<WordEditorPage />} />
              <Route path="/words/:wordId" element={<WordEditorPage />} />
              <Route path="/series" element={<SeriesListPage />} />
              <Route path="/series/new" element={<NewSeriesPage />} />
              <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Analytics />
    </>
  )
}
