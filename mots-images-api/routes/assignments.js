const express = require('express')
const router = express.Router()
const { assignStudentsToSeriesController, assignmentsToDoController, getAllAssignmentsByStudentIdController } = require('../controllers/assignmentsController')
const { authenticateTeacher } = require('../middleware/auth')

router.post('/:seriesId/students', authenticateTeacher, assignStudentsToSeriesController )
router.get('/:studentId', authenticateTeacher, assignmentsToDoController)
router.get('/all/:studentId', authenticateTeacher, getAllAssignmentsByStudentIdController)

module.exports = router