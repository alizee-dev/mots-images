const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {createTeacher, findTeacher} = require('../models/teacherModel')

const register = async (req, res) => {
    try {
        const {name, email, password} = req.body

        if (password.length < 8) {
            return res.status(400).json('Bad request')
        } 
        
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

        if (await bcrypt.compare(password, teacher.password_hash)) {
            const token = jwt.sign(
            {teacherId: teacher.id}, process.env.JWT_SECRET, { expiresIn: "24h"}
        )
            res.status(200).json({message : "Utilisateur connecté", token})
        } else {
            res.status(401).json("Email ou mot de passe incorrect")
        }
    } catch (error) {
        res.status(500).json({error : error.message})
    } 
}

module.exports = {register, login}