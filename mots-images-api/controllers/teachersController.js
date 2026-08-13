const bcrypt = require('bcrypt')
const {createTeacher} = require('../models/teacherModel')

const register = async (req, res) => {
    try {
        const {name, email, password} = req.body
        const hashedPassword = await bcrypt.hash(password, 10)
        const teacher = await createTeacher(name, email, hashedPassword)

        res.status(201).json(teacher)

    } catch(error) {
        res.status(500).json({error: error.message})
    }
}

module.exports = {register}