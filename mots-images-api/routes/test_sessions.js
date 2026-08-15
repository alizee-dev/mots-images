const express = require('express')
const router = express.Router()
const { testSessionsController, wordsFromSessionController} = require('../controllers/test_sessionsController')
const { authenticateTeacher } = require('../middleware/auth')

router.post('/:assignmentId', authenticateTeacher, testSessionsController)
router.get('/:testSessionId/words', authenticateTeacher, wordsFromSessionController)

module.exports = router