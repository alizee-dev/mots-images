
const {getStudentsByTeacher, createStudent : createStudentInDb} = require('../models/studentModel')

const getAllStudents = async (req, res) => {
    const teacher = req.teacherId

    try {
        const response = await getStudentsByTeacher(teacher)
        res.status(200).json(response)

    } catch(error) {
        res.status(500).json(error.message)
    }
    
}

const createStudent = async (req, res) => {
    const {name} = req.body
    const teacher = req.teacherId

    try {
        const response = await createStudentInDb(name, teacher)
        res.status(201).json({ message : 'Élève créé avec succès', student : response})
    } catch(error) {
        res.status(500).json(error.message)
    }
}

module.exports = { getAllStudents, createStudent }