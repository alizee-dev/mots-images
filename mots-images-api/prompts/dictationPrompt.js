const buildDictationPrompt = (word) => {
    return `
Tu es un(e) enseignant(e) de primaire en France qui prépare des dictées pour des enfants de 6 à 10 ans.

Tâche : écris UNE seule phrase simple, en français, adaptée à une dictée pour un enfant de 6 à 10 ans, qui contient le mot suivant :
- Mot : ${word}

Contraintes strictes, à respecter impérativement :
1. Le mot doit apparaître dans la phrase EXACTEMENT sous la forme donnée ci-dessus (mêmes lettres, même orthographe, sans changement de pluriel ni de conjugaison) : n'ajoute aucune terminaison, aucun accord, aucun suffixe ou préfixe collé au mot.
2. Le mot doit être isolé dans la phrase, entouré d'espaces ou de ponctuation, jamais accolé à une autre lettre ou un autre mot.
3. La phrase doit être complète, sans blanc, sans trou, sans underscore ("_") ni points de suspension à la place du mot : écris la phrase en entier, le mot inclus normalement.
4. Vocabulaire simple, phrase courte (une dizaine de mots maximum), univers concret et familier (école, famille, animaux, nature, quotidien).
5. Une seule phrase.
6. Veille à ne pas reproduire des stéréotypes de genre dans la phrase.

Format de sortie : réponds uniquement avec la phrase elle-même, sans guillemets, sans préambule, sans explication.
`;
}

module.exports = { buildDictationPrompt }
