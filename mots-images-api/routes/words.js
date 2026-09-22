const express = require('express')
const router = express.Router()

const { authenticateTeacher, requireAdmin } = require('../middleware/auth')
const { createWordController, getWordsController, postWordForStudentsController, updateWordController, deleteWordFromBankController, generateIllustrationController, setPendingStatusController, setCommonStatusController, setPrivateStatusController, getPendingWordsController, getWordsForSentenceEditingController, updateWordSentenceController, requestManualIllustrationController, getIllustrationRequestsController, generateAdminIllustrationController, acceptAdminIllustrationController } = require('../controllers/wordsController')

router.post('/', authenticateTeacher, createWordController)
router.get('/', authenticateTeacher, getWordsController)

//router.post('/:wordId/students', authenticateTeacher, postWordForStudentsController)

router.put('/:wordId', authenticateTeacher, updateWordController)
// in_bank is set to false instead of deleting the word from the database
router.put('/:wordId/status', authenticateTeacher, deleteWordFromBankController)
router.put('/:wordId/sentence', authenticateTeacher, requireAdmin, updateWordSentenceController)
router.post('/:wordId/generate-illustration', authenticateTeacher, generateIllustrationController)
router.post('/:wordId/request-manual-illustration', authenticateTeacher, requestManualIllustrationController)
router.post('/:wordId/admin/generate-illustration', authenticateTeacher, requireAdmin, generateAdminIllustrationController)
router.put('/:wordId/admin/illustration', authenticateTeacher, requireAdmin, acceptAdminIllustrationController)

// routes to set the status of a word (pending, common, private)
router.put('/:wordId/status/pending', authenticateTeacher, setPendingStatusController)
router.put('/:wordId/status/common', authenticateTeacher, requireAdmin, setCommonStatusController)
router.put('/:wordId/status/private', authenticateTeacher, requireAdmin, setPrivateStatusController)

router.get('/status/pending', authenticateTeacher, requireAdmin, getPendingWordsController)
router.get('/admin/sentences', authenticateTeacher, requireAdmin, getWordsForSentenceEditingController)
router.get('/admin/illustration-requests', authenticateTeacher, requireAdmin, getIllustrationRequestsController)
module.exports = router