const express = require('express')
const router = express.Router()

const { authenticateTeacher } = require('../middleware/auth')
const { createWordController } = require('../controllers/wordsController')

router.post('/', authenticateTeacher, createWordController)

module.exports = router