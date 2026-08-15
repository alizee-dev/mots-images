const express = require('express')
const router = express.Router()

const { authenticateTeacher } = require('../middleware/auth')
const { createWordController, getWordsController, postWordForStudentsController } = require('../controllers/wordsController')

router.post('/', authenticateTeacher, createWordController)
router.get('/', authenticateTeacher, getWordsController)
router.post('/:wordId/students', authenticateTeacher, postWordForStudentsController)

module.exports = router