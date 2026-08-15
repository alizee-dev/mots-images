const express = require('express')
const router = express.Router()
const { assignStudentsToSeriesController } = require('../controllers/assignmentsController')
const { authenticateTeacher } = require('../middleware/auth')

router.post('/:seriesId/students', authenticateTeacher, assignStudentsToSeriesController )

module.exports = router