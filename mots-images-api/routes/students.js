const express = require('express')
const router = express.Router()
const { authenticateTeacher } = require('../middleware/auth')
const { getAllStudents } = require('../controllers/studentsController')

router.get('/myStudents', authenticateTeacher, getAllStudents)

module.exports = router