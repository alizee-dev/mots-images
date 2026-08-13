const express = require('express')
const router = express.Router()
const { authenticateTeacher } = require('../middleware/auth')
const { getAllStudents, createStudent } = require('../controllers/studentsController')

router.get('/myStudents', authenticateTeacher, getAllStudents)
router.post('/', authenticateTeacher, createStudent)

module.exports = router