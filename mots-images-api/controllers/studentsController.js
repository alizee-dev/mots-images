
const {getStudentsByTeacher} = require('../models/studentModel')

const getAllStudents = async (req, res) => {
    const teacher = req.teacherId

    try {
        const response = await getStudentsByTeacher(teacher)
        res.status(200).json(response)

    } catch(error) {
        res.status(500).json(error.message)
    }
    
}

module.exports = { getAllStudents }