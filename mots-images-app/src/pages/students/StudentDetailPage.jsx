import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { getMyStudents } from '../../api/students'
import StudentProgression from '../../components/StudentProgression'

export default function StudentDetailPage() {
  const { studentId } = useParams()
  const location = useLocation()
  const [studentName, setStudentName] = useState(location.state?.studentName || null)

  useEffect(() => {
    if (studentName) return
    getMyStudents()
      .then((students) => {
        const found = students.find((s) => String(s.id) === studentId)
        setStudentName(found ? found.name : 'Enfant')
      })
      .catch(() => {})
  }, [studentId, studentName])

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/students">← Enfants</Link>
      </p>
      <div className="page-header-row">
        <h2>{studentName || 'Enfant'}</h2>
        {/* Creating an entraînement is the Training section's job now (see
            /training) — this just points there, rather than duplicating
            that action here too. */}
        <Link to={`/training/${studentId}`} className="btn btn-secondary">
          Voir ses entraînements →
        </Link>
      </div>

      <StudentProgression studentId={studentId} studentName={studentName} />
    </div>
  )
}
