// Fonction permettant de créer lettersPosition pour le prompt sur base des index des lettres sélectionnées
const getLettersPositions = (positions) => {
    if(positions.length === 0) {
        throw new Error('Une lettre minimum doit être sélectionnée')
    }

    for(let i = 1; i < positions.length; i++) {
        if (positions[i-1] +1 !== positions[i]) {
            throw new Error("les lettres sélectionnées doivent être consécutives")
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