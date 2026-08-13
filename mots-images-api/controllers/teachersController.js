const bcrypt = require('bcrypt')
const {createTeacher, findTeacher} = require('../models/teacherModel')

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

const login = async (req, res) => {
    try {
        const {email, password} = req.body
        const teacher = await findTeacher(email)

        if(!teacher) {
            res.status(401).json("Email ou mot de passe incorrect")
            return
        }

        if(await bcrypt.compare(password, teacher.password_hash)) {
            res.status(200).json("Utilisateur connecté")
        } else {
            res.status(401).json("Email ou mot de passe incorrect")
        }
    } catch (error) {
        res.status(500).json({error : error.message})
    } 
}

module.exports = {register, login}