const { createSeries, linkWordsToSeries, seriesByTeacher } = require('../models/seriesModel')

const createSeriesController = async (req, res) => {
    try {
    const teacherId = req.teacherId
    const {title} = req.body

    const series = await createSeries(teacherId, title)

    console.log(series);
    
    res.status(201).json(series)

    } catch (error) {
        res.status(500).json(error.message)
    }
}

const linkWordsToSeriesController = async (req, res) => {
    try {
        const seriesId = req.params.seriesId
        const {wordsIds} = req.body
        const association = await linkWordsToSeries(seriesId, wordsIds)
        console.log(association);
        
        res.status(201).json(association)
    } catch (error) {
        res.status(500).json(error.message)
    }
}

const seriesByTeacherController = async (req, res) => {
    const teacherId = req.teacherId

    try {
        const result = await seriesByTeacher(teacherId)
        console.log(result);
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json(error.message)
    }
}

module.exports = { createSeriesController, linkWordsToSeriesController, seriesByTeacherController }