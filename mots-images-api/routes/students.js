const express = require('express')
const router = express.Router()
const { authenticateTeacher } = require('../middleware/auth')
const { getAllStudents, createStudent, getTestSessionsByStudent } = require('../controllers/studentsController')

router.get('/myStudents', authenticateTeacher, getAllStudents)
router.post('/', authenticateTeacher, createStudent)
router.get('/:studentId/test-sessions', authenticateTeacher, getTestSessionsByStudent)

module.exports = router