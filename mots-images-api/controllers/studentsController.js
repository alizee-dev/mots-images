
const {getStudentsByTeacher, createStudent : createStudentInDb, testSessionsByStudent} = require('../models/studentModel')

// Get all the children of a parent
const getAllStudents = async (req, res) => {
    const teacher = req.teacherId

    try {
        const response = await getStudentsByTeacher(teacher)
        res.status(200).json(response)

    } catch(error) {
        res.status(500).json(error.message)
    }
    
}

//Create a new child
const createStudent = async (req, res) => {
    const {name} = req.body
    const teacher = req.teacherId

    try {
        const response = await createStudentInDb(name, teacher)
        res.status(201).json(response)
    } catch(error) {
        res.status(500).json(error.message)
    }
}

// Get all test sessions of a student
const getTestSessionsByStudent = async (req, res) => {
    const studentId = req.params.studentId
    const teacherId = req.teacherId

    const studentsOfTeacher = await getStudentsByTeacher(teacherId)
    
    if (studentsOfTeacher.find(student => student.id === Number(studentId))) {
        try {
            const response = await testSessionsByStudent(studentId)
            res.status(200).json(response)
        } catch (error) {
            res.status(500).json(error.message)
        }
    } else {
        res.status(403).json('Forbidden')
    }
}

module.exports = { getAllStudents, createStudent, getTestSessionsByStudent}