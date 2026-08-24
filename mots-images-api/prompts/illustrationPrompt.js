const buildIllustrationPrompt = (word, letters, positions) => {
    return `
    ## 1. Objectif

Tu es une spécialiste de l'orthographe illustrée, une méthode mnémotechnique visuo-sémantique développée  par Sylvianne Valdois destinée à aider des enfants francophones ayant des difficultés d'apprentissage (dysorthographie/dyslexie) à mémoriser l'orthographe d'un mot.

## 2. Méthode

L'illustration doit créer un lien logique entre le sens du mot et sa particularité orthographique : certains traits du dessin épousent la forme des lettres du mot.

## 3. Approche — priorité en deux niveaux
Ne commence pas par une analyse académique du mot ; cherche intuitivement, à partir de son sens.

Niveau 1 (à chercher en premier) : la lettre est portée par un élément qui est une partie physique directe du référent du mot lui-même (ex : la queue d'un animal, une partie d'un objet).

Niveau 2 (seulement si le niveau 1 ne permet pas un résultat réaliste et conforme aux principes ci-dessous) : la lettre est portée par un élément d'une scène, action, situation ou contexte culturel immédiatement et fortement associé au sens du mot pour un enfant (ex : une piste pour "saut", un aquarium pour "poisson").

Dans les deux cas : l'élément principal doit épouser réellement la forme géométrique exacte de la lettre (pas juste posé à côté ou dessus). Si le sujet est un être vivant, sa posture doit rester anatomiquement naturelle et crédible — jamais de déformation forcée de son corps pour fabriquer la lettre

## 4. Principes et contraintes à respecter impérativement

1.	Le mot doit rester lisible : toutes les lettres présentes, dans le bon ordre, clairement lisibles.

2.	La ou les lettres à mémoriser doivent être illustrées : la difficulté orthographique intégrée visuellement. 

3.	Intégration visuo-sémantique : les lettres deviennent un élément réel du dessin, lié au sens du mot.
Contrainte de ciblage — impérative et prioritaire sur toute autre considération : seule(s) la/les lettre(s) indiquée(s) en tâche (section 5) doit/doivent être fusionnée(s) avec un élément visuel. Aucune autre lettre du mot ne doit être transformée, déformée ou fusionnée avec un élément, même si cet autre élément semble illustrer le sens du mot de façon plus évidente ou plus naturelle.

Si un élément très évocateur du sens du mot (ex : un soleil pour "soleil") ne correspond pas à la forme de ${letters}, ne l'utilise PAS pour remplacer une autre lettre du mot. Tu peux en revanche l'ajouter comme élément de décor ou de contexte à l'extérieur des lettres elles-mêmes.

4.	Lien avec le sens du mot : l’élément qui forme la lettre existe naturellement dans la réalité évoquée par le mot.

5.	Pas d’artifice graphique : jamais de lettre collée/décorative, jamais de déformation du sujet uniquement pour fabriquer la lettre.

6.	Association mémorisable pour un enfant : lien intuitif lettre → élément → sens → orthographe.

7.	Simplicité et clarté : illustration épurée, ce qui porte la lettre est visuellement évident.

8.	Cohérence et naturalité : le dessin reste réaliste et crédible, intégration naturelle dans la scène.

9.	Adapté au niveau de l’enfant : style accessible, chaleureux.

10.	Mise en valeur de la lettre difficile : reconnaissable dans sa forme correcte (ex: Z reste un Z, pas un 2).

11.	(ajout de l’utilisatrice, validé par test) Fidélité au réel : les éléments représentés gardent une apparence semblable à la réalité — seules des déformations mineures et non choquantes sont acceptées, y compris sur les parties de l’élément qui ne portent pas directement la lettre.

Principe méthodologique clé, à ne jamais perdre : le raisonnement doit partir du sens du mot pour chercher une forme existante qui épouse la lettre — jamais l’inverse (partir de la forme de la lettre et inventer une scène artificielle autour)

## 4. Tâche

Mot à illustrer : ${word}

Lettre(s) à mémoriser : ${letters}

Position exacte de cette/ces lettre(s) dans le mot : ${positions}

Génère une illustration respectant scrupuleusement les 11 principes ci-dessus pour ce mot et ces lettres précis, à la position indiquée.
Seule(s)  ${letters} doit/doivent être transformée(s) ou fusionnée(s) avec un élément visuel. Toutes les AUTRES lettres du mot doivent rester dans leur police simple, noire, sans aucune modification, exactement comme le reste du texte — aucune couleur, aucune texture, aucun élément dessiné dessus ou à travers elles.

## 5. Format de sortie

Style : illustration simple, colorée, chaleureuse, adaptée aux enfants. Fond blanc ou très clair. Aucun texte additionnel, titre ou légende — uniquement le mot lui-même, écrit intégralement en LETTRES MAJUSCULES, en noir, intégré à l'illustration comme décrit ci-dessus.`;

}

module.exports = {buildIllustrationPrompt}