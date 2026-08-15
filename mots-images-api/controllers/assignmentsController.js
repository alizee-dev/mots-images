const { assignStudentsToSeries } = require('../models/assignmentsModel')
const {seriesByTeacher} = require('../models/seriesModel')
const { getStudentsByTeacher } = require('../models/studentModel')

const assignStudentsToSeriesController = async (req, res) => {
    const seriesId = req.params.seriesId
    const {studentsIds} = req.body
    const teacherId = req.teacherId

    const series = await seriesByTeacher(teacherId)
    const students = await getStudentsByTeacher(teacherId)

    const serieIsValid = series.find(series => series.id === Number(seriesId))
    const allStudentsAreValid = studentsIds.every(id => students.find(student => student.id === Number(id)))

    if (serieIsValid && allStudentsAreValid) {
        try {
        
        const result = await assignStudentsToSeries(seriesId, studentsIds)
        console.log(result);
        
        res.status(201).json(result)
        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        res.status(403).json('Forbidden')
    }
}

module.exports = {assignStudentsToSeriesController}