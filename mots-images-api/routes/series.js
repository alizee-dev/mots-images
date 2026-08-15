const express = require('express')
const router = express.Router()
const { createSeriesController, linkWordsToSeriesController, seriesByTeacherController } = require('../controllers/seriesController')
const { authenticateTeacher } = require('../middleware/auth')
 
router.post('/', authenticateTeacher, createSeriesController)
router.post('/:seriesId/words', authenticateTeacher, linkWordsToSeriesController)
router.get('/', authenticateTeacher, seriesByTeacherController)

module.exports = router