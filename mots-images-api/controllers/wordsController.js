const { createWord } = require('../models/wordModel')

const createWordController = async (req, res) => {
    try {
        const {text, sentence} = req.body
        const teacherId = req.teacherId

        const word = await createWord(text, sentence, teacherId)
        res.status(201).json({word})

    } catch(error) {
        res.status(500).json(error.message)
    }
}

module.exports = { createWordController }