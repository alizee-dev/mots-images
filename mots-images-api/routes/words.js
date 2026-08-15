const express = require('express')
const router = express.Router()

const { authenticateTeacher } = require('../middleware/auth')
const { createWordController, getWordsController, postWordForStudentsController, updateWordController } = require('../controllers/wordsController')

router.post('/', authenticateTeacher, createWordController)
router.get('/', authenticateTeacher, getWordsController)
router.post('/:wordId/students', authenticateTeacher, postWordForStudentsController)
router.put('/:wordId', authenticateTeacher, updateWordController)

module.exports = router