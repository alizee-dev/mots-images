const {
  createWord,
  getWords,
  wordForStudents,
  updateWord,
  deleteWordFromBank,
  getWordById, setPendingStatus, adminGetWords, updateWordStatus, getPendingWords
} = require("../models/wordModel")

const {
  getAiGenerationsCount,
  incrementAiGenerationsCount,
} = require("../models/teacherModel")

const { buildIllustrationPrompt } = require("../prompts/illustrationPrompt")
const { buildConceptPrompt } = require("../prompts/responsesPrompt")
const { getLettersPositions } = require("../utils/getLettersPositions")

require("dotenv").config()
const OpenAI = require("openai").default

const openai = new OpenAI()

const createWordController = async (req, res) => {
  try {
    const { text, sentence } = req.body
    const teacherId = req.teacherId

    const word = await createWord(text, sentence, teacherId)

    //console.log(word)
    res.status(201).json(word)
  } catch (error) {
    res.status(500).json(error.message)
  }
}

const getWordsController = async (req, res) => {
  try {
    const teacher_id = req.teacherId
    const includeCommonWords = req.query.includeCommonWords === "true"

    const words = await getWords(teacher_id, includeCommonWords)

    //console.log(words)
    res.status(200).json(words)
  } catch (error) {
    res.status(500).json(error.message)
  }
}

const postWordForStudentsController = async (req, res) => {
  const wordId = req.params.wordId
  const { studentIds } = req.body
  const teacherId = req.teacherId
  //{ "studentIds": [3, 7, 12] }

  const words = await getWords(teacherId)

  if (words.find((word) => word.id === Number(wordId))) {
    try {
      const result = await wordForStudents(wordId, studentIds)

      //console.log(result)
      res.status(201).json(result)
    } catch (error) {
      res.status(500).json(error.message)
    }
  } else {
    res.status(403).json("Forbidden")
  }
}

const updateWordController = async (req, res) => {
  const wordId = req.params.wordId
  const { zones, sentence } = req.body
  const zonesString = JSON.stringify(zones)
  const teacherId = req.teacherId

  const words = await getWords(teacherId)
  const wordIsValid = words.find((word) => word.id === Number(wordId))

  if (wordIsValid) {
    try {
      const response = await updateWord(
        wordId,
        zonesString,
        sentence,
        teacherId,
      )
      if (!response) {
        return res.status(404).json("Word not found")
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

    if (response.length > 0) {
      res.status(200).json(response)
    } else {
      return res.status(404).json("Word not found")
    }
  } catch (error) {
    res.status(500).json(error.message)
  }
}

const generateIllustrationController = async (req, res) => {
  const wordId = req.params.wordId
  const teacherId = req.teacherId
  const { letters, positions } = req.body

  try {
    const word = await getWordById(wordId, teacherId)
    if (!word) {
      return res.status(403).json("Forbidden")
    }

    const positionsPrompt = getLettersPositions(positions)
    const conceptPrompt = buildConceptPrompt(word.text, letters, positionsPrompt)
    const count = await getAiGenerationsCount(teacherId)

    if (count < 250) {
      const response = await openai.responses.create({
        model: "gpt-5.6-sol",
        input: conceptPrompt,
      })
      
      const concept = response.output_text
      console.log(concept)
      const illustrationPrompt = buildIllustrationPrompt(word.text, letters, positionsPrompt, concept)

      const result = await openai.images.generate({
        model: "gpt-image-2",
        prompt: illustrationPrompt,
        n: 3,
      })

      const illustrations = result.data.map((data, index) => ({
        id: index,
        image: data.b64_json,
      }))

      await incrementAiGenerationsCount(teacherId)
      res.status(200).json({ illustrations })
    } else {
      return res.status(429).json("Vous avez atteint la limite autorisée")
    }
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).json(error.message)
    } else {
      res.status(500).json(error.message)
    }
  }
}

const setPendingStatusController = async (req, res) => {
  const wordId = req.params.wordId
  const teacherId = req.teacherId
  const status = 'pending'

  try {
    const word = await getWordById(wordId, teacherId)
    if (!word) {
      return res.status(403).json("Forbidden")
    }

    const updatedWord = await setPendingStatus(wordId, teacherId, status)
    res.status(200).json(updatedWord)
  } catch (error) {
    res.status(500).json(error.message)
  }
}

const setCommonStatusController = async (req, res) => {
  const wordId = req.params.wordId
  const status = 'common'

  try {
    const validWord = await adminGetWords(wordId)
    if (!validWord) {
    return res.status(404).json("Word not found")
    }

    const updatedWord = await updateWordStatus(wordId, status)
    res.status(200).json(updatedWord)
  } catch (error) {
    res.status(500).json(error.message)
  }
} 

const setPrivateStatusController = async (req, res) => {
  const wordId = req.params.wordId
  const status = 'private'

  try {
    const validWord = await adminGetWords(wordId)
    if (!validWord) {
      return res.status(404).json("Word not found")
    }

    const updatedWord = await updateWordStatus(wordId, status)
    res.status(200).json(updatedWord)
  } catch (error) {
    res.status(500).json(error.message)
  }
}

const getPendingWordsController = async (req, res) => {
  try {
    const pendingWords = await getPendingWords()
    res.status(200).json(pendingWords)
  } catch (error) {
    res.status(500).json(error.message)
  }
}

module.exports = {
  createWordController,
  getWordsController,
  postWordForStudentsController,
  updateWordController,
  deleteWordFromBankController,
  generateIllustrationController, 
  setPendingStatusController, 
  setCommonStatusController, 
  setPrivateStatusController, getPendingWordsController
}
