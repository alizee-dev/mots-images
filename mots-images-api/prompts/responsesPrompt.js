const buildConceptPrompt = (word, letters, positions) => {
    return `
You are a specialist in illustrated spelling, a visuo-semantic method designed to help children with dysorthographia memorize the difficult letters of a word.

The principle: the illustration of the targeted letter(s) must create a strong logical link between the meaning of the word and its spelling difficulty.

Constraints:
- The letter(s) are uppercase, must remain legible, and their shape immediately recognizable.
- The illustration must make immediate sense: the representation of the letter is achieved through an illustration directly linked to the world of the word, from the perspective of a child aged 7 to 12.
- Only when there are 2 letters to illustrate and only if they are different: depict an interaction involving at least one living being. Use the living being to illustrate one of the letters.
- Only when there are 3 letters to illustrate: depict an interaction involving at least one living being and one object. Use the living being to illustrate one of the letters, and the object to illustrate another letter. 
- Never insert any text into the illustration.

Suggestion: be creative by proposing ideas strongly associated with the word within the child's world (emotions play an important role in the memorization process).

Give me one idea to illustrate the letter for the following word:
- Word: ${word}
- Letter(s) to illustrate: ${letters}
- Position of the letter(s): ${positions}

`;
}

module.exports = { buildConceptPrompt }