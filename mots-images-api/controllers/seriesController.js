const { createSeries, linkWordsToSeries, seriesByTeacher, getSeriesDetail, getSeriesById, editSeriesTitle, updateSeriesStatus, deleteWordFromSeries, changeOrderOfWords } = require('../models/seriesModel')

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
    const teacherId = req.teacherId
    const seriesId = req.params.seriesId
    const {wordsIds} = req.body

    const series = await seriesByTeacher(teacherId)
    
    if (series.find(series => series.id === Number(seriesId))) {
        try {
        
        const association = await linkWordsToSeries(seriesId, wordsIds)
        console.log(association);
        
        res.status(201).json(association)
        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        res.status(403).json('Forbidden')
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

const getSeriesDetailController = async (req, res) => {
    const teacherId = req.teacherId
    const seriesId = req.params.seriesId

    const validSeries = await getSeriesById(teacherId, seriesId)
    
    if(validSeries.length > 0) {
        try {
            const detail = await getSeriesDetail(seriesId, teacherId)
            res.status(200).json(detail)
        } catch (error) {
            res.status(500).json(error.message)
        }        
    } else {
        res.status(404).json('Not found')
    }
}

const editSeriesTitleController = async (req, res) => {
    const seriesId = req.params.seriesId
    const {title} = req.body
    const teacherId = req.teacherId

    try {
        const result = await editSeriesTitle(seriesId, title, teacherId)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json(error.message)
    }
}

const updateSeriesStatusController = async (req, res) => {
    const seriesId = req.params.seriesId
    const teacherId = req.teacherId

    try {
        const result = await updateSeriesStatus(seriesId, teacherId)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json(error.message)
    }
}

const deleteWordFromSeriesController = async (req, res) => {
    const {wordId, seriesId} = req.params
    const teacherId = req.teacherId

    const validSeries = await getSeriesById(teacherId, seriesId)

    if(validSeries.length > 0) {
        try {
            const result = await deleteWordFromSeries(wordId, seriesId)
            res.status(200).json(result)
        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        return res.status(404).json('Not found')
    }
}

const changeOrderOfWordsController = async (req, res) => {
    const {wordsDetails} = req.body
    const seriesId = req.params.seriesId
    const teacherId = req.teacherId

    const series = await getSeriesById(teacherId, seriesId)
    
    if(series.length > 0) {
        try {
            const response = await changeOrderOfWords(wordsDetails, seriesId)
            res.status(200).json(response)
        } catch (error) {
            res.status(500).json(error.message)
        }

    } else {
        res.status(404).json('Not found')
    }
}

module.exports = { createSeriesController, linkWordsToSeriesController, seriesByTeacherController, getSeriesDetailController, editSeriesTitleController, updateSeriesStatusController, deleteWordFromSeriesController, changeOrderOfWordsController}