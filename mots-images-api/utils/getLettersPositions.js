// Fonction permettant de créer lettersPosition pour le prompt sur base des index des lettres sélectionnées
const getLettersPositions = (positions) => {
    if(positions.length === 0) {
        const error = new Error('Une lettre minimum doit être sélectionnée')
        error.name = 'ValidationError'
        throw error
    }

    for(let i = 1; i < positions.length; i++) {
        if (positions[i-1] +1 !== positions[i]) {
            const error = new Error('Les lettres sélectionnées doivent être consécutives')
            error.name = 'ValidationError'
            throw error
        } 
    }

    const ordinaux = positions.map((position) => {
        if (position === 1) {
            return `${position}ère`
        } else {
            return `${position}ème`
        }
    })
    return `${ordinaux.join(' et ')} lettres`
}

module.exports = { getLettersPositions }