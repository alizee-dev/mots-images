const express = require('express')
const router = express.Router()

const { authenticateTeacher } = require('../middleware/auth')
const { createWordController, getWordsController, postWordForStudentsController, updateWordController, deleteWordFromBankController, generateIllustrationController } = require('../controllers/wordsController')

router.post('/', authenticateTeacher, createWordController)
router.get('/', authenticateTeacher, getWordsController)
router.post('/:wordId/students', authenticateTeacher, postWordForStudentsController)
router.put('/:wordId', authenticateTeacher, updateWordController)
router.put('/:wordId/status', authenticateTeacher, deleteWordFromBankController)
router.post('/:wordId/generate-illustration', authenticateTeacher, generateIllustrationController)
module.exports = router