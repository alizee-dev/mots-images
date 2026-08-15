const { createWord, getWords, wordForStudents } = require('../models/wordModel')

const createWordController = async (req, res) => {
    try {
        const {text, sentence} = req.body
        const teacherId = req.teacherId

        const word = await createWord(text, sentence, teacherId)

        console.log(word);
        res.status(201).json(word)

    } catch(error) {
        res.status(500).json(error.message)
    }
}

const getWordsController = async (req, res) => {
    try {
        const teacher_id = req.teacherId

        const words = await getWords(teacher_id)

        console.log(words);
        res.status(200).json(words)    

    } catch (error) {
        res.status(500).json(error.message)
    }
}

const postWordForStudentsController = async (req, res) => {
    try {
        const wordId = req.params.wordId
        const {studentIds} = req.body
        //{ "studentIds": [3, 7, 12] }

        const result = await wordForStudents(wordId, studentIds)

        console.log(result)
        res.status(201).json(result)

    } catch (error) {
        res.status(500).json(error.message)
    }
}

module.exports = { createWordController, getWordsController, postWordForStudentsController}