const buildConceptPrompt = (word, letters, positions) => {
    return `
You are a specialist in illustrated spelling, a visuo-semantic method designed to help children with dysorthographia memorize the difficult letters of a word.

The principle: the illustration of the targeted letter(s) must create a strong logical link between the meaning of the word and its spelling difficulty.

Constraints:
- The letter(s) are uppercase, must remain legible, and their shape immediately recognizable.
- The illustration must make immediate sense: the representation of the letter is achieved through an illustration directly linked to the world of the word, from the perspective of a child aged 7 to 12.

Suggestion: be creative by proposing ideas strongly associated with the word within the child's world (emotions play an important role in the memorization process).

Give me one idea to illustrate the letter for the following word:
- Word: ${word}
- Letter(s) to illustrate: ${letters}
- Position of the letter(s): ${positions}

`;
}

module.exports = { buildConceptPrompt }