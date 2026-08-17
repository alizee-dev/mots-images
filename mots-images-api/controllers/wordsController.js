const { createWord, getWords, wordForStudents, updateWord, deleteWordFromBank } = require('../models/wordModel')

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
    const wordId = req.params.wordId
    const {studentIds} = req.body
    const teacherId = req.teacherId
    //{ "studentIds": [3, 7, 12] }

    const words = await getWords(teacherId)

    if (words.find(word => word.id === Number(wordId))) {
        try {
        const result = await wordForStudents(wordId, studentIds)

        console.log(result)
        res.status(201).json(result)

        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        res.status(403).json('Forbidden')
    }    
}

const updateWordController = async (req, res) => {
    const wordId = req.params.wordId
    const { zones, sentence } = req.body
    const zonesString = JSON.stringify(zones)
    const teacherId = req.teacherId

    const words = await getWords(teacherId)
    const wordIsValid = words.find(word => word.id === Number(wordId))

    if(wordIsValid) {
        try {
            const response = await updateWord(wordId, zonesString, sentence, teacherId)
            if (!response) {
                return res.status(404).json('Word not found')
            }
            res.status(200).json(response)
        } catch (error) {
            res.status(500).json(error.message)
        }        
    } else {
        res.status(403).json("Forbidden")
    }
}

const deleteWordFromBankController = async (req, res) => {
    const wordId = req.params.wordId
    const teacherId = req.teacherId

    try {
        const response = await deleteWordFromBank(wordId, teacherId)

        if(response.length > 0) {
            res.status(200).json(response)
        } else {
            return res.status(404).json('Word not found')
        }
        
    } catch (error) {
        res.status(500).json(error.message)
    }
}

module.exports = { createWordController, getWordsController, postWordForStudentsController, updateWordController, deleteWordFromBankController}