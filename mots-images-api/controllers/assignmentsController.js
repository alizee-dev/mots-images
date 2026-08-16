const { assignStudentsToSeries, assignmentsToDo, assignmentsByTeacher, getStudentsBySeriesId } = require('../models/assignmentsModel')
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

    // Ne pas attribuer une série à un student qui a déja reçu cette série
    const nonEligibleStudents = await getStudentsBySeriesId(seriesId)
    const eligibleStudentsIds = studentsIds.filter(student => !nonEligibleStudents.some(ne => ne.student_id === student))

    if (serieIsValid && allStudentsAreValid) {
        if (eligibleStudentsIds.length === 0) {
            return res.status(409).json('Tous les élèves sélectionnés ont déjà cette série')
        }
        try {
        const result = await assignStudentsToSeries(seriesId, eligibleStudentsIds)
        console.log(result);
        
        res.status(201).json(result)
        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        res.status(403).json('Forbidden')
    }
}

const assignmentsToDoController = async (req, res) => {
    const studentId = req.params.studentId
    const teacherId = req.teacherId
    const students = await getStudentsByTeacher(teacherId)
    const studentIsValid = students.find(student => student.id === Number(studentId))
    
    if(studentIsValid) {
        try {
        const result = await assignmentsToDo(studentId)
        res.status(200).json(result)
        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        res.status(403).json('Forbidden')
    } 
}

module.exports = {assignStudentsToSeriesController, assignmentsToDoController}