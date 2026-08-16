const express = require('express')
const router = express.Router()
const { assignStudentsToSeriesController, assignmentsToDoController } = require('../controllers/assignmentsController')
const { authenticateTeacher } = require('../middleware/auth')

router.post('/:seriesId/students', authenticateTeacher, assignStudentsToSeriesController )
router.get('/:studentId', authenticateTeacher, assignmentsToDoController)

module.exports = router