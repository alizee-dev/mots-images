import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import Layout from './Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import EvaluationsHubPage from './pages/EvaluationsHubPage'
import StudentEvaluationsPage from './pages/StudentEvaluationsPage'
import StudentsListPage from './pages/students/StudentsListPage'
import StudentDetailPage from './pages/students/StudentDetailPage'
import SessionDetailPage from './pages/students/SessionDetailPage'
import WordsBankPage from './pages/words/WordsBankPage'
import WordEditorPage from './pages/words/WordEditorPage'
import TrainingHubPage from './pages/series/TrainingHubPage'
import StudentTrainingListPage from './pages/series/StudentTrainingListPage'
import NewSeriesPage from './pages/series/NewSeriesPage'
import SeriesDetailPage from './pages/series/SeriesDetailPage'
import PracticeSessionPage from './pages/series/PracticeSessionPage'
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
              <Route path="/training" element={<TrainingHubPage />} />
              <Route path="/training/:studentId" element={<StudentTrainingListPage />} />
              <Route path="/training/:studentId/new" element={<NewSeriesPage />} />
              <Route path="/series/:seriesId" element={<SeriesDetailPage />} />
              <Route path="/series/:seriesId/practice" element={<PracticeSessionPage />} />
              <Route path="/evaluations" element={<EvaluationsHubPage />} />
              <Route path="/evaluations/:studentId" element={<StudentEvaluationsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <Analytics />
    </>
  )
}
