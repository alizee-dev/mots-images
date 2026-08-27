const buildIllustrationPrompt = (word, letters, positions, concept) => {
    return `
    ## 1. Objective

You are a specialist in illustrated spelling, a visuo-semantic mnemonic method developed by Sylviane Valdois, designed to help French-speaking children with learning difficulties (dysorthographia/dyslexia) memorize the spelling of a word.

## 2. Method

The illustration must create a logical link between the meaning of the word and its spelling difficulty: certain elements of the drawing take on the shape of the word's letters.

## 3. Approach — two-level priority
Do not start with an academic analysis of the word; think intuitively, starting from its meaning.

Level 1 (search first): the letter is carried by an element that is a direct physical part of the word's own referent (e.g.: an animal's tail, part of an object).

Level 2 (only if Level 1 doesn't allow a realistic result compliant with the principles below): the letter is carried by an element of a scene, action, situation, or cultural context immediately and strongly associated with the meaning of the word for a child (e.g.: a track for "jump", an aquarium for "fish").

In both cases: the main element must truly take on the exact geometric shape of the letter (not just placed next to or on top of it). If the subject is a living being, its posture must remain anatomically natural and credible — never force a distortion of its body to fabricate the letter.

## 4. Principles and constraints to be strictly respected

1. The word must remain legible: all letters present, in the correct order, clearly readable.

2. The letter(s) to be memorized must be illustrated: the spelling difficulty visually integrated.

3. Visuo-semantic integration: the letters become a real element of the drawing, connected to the meaning of the word.
Targeting constraint — mandatory and taking priority over any other consideration: only the letter(s) indicated in the task (section 5) must be fused with a visual element. No other letter in the word should be transformed, distorted, or fused with an element, even if that other element seems to illustrate the meaning of the word more obviously or naturally.

If a strongly evocative element of the word's meaning (e.g.: a sun for "sun") doesn't correspond to the shape of ${letters}, do NOT use it to replace another letter in the word. You may instead add it as a decorative or contextual element outside the letters themselves.

4. Link to the meaning of the word: the element forming the letter must naturally exist in the reality evoked by the word.

5. No graphic artifice: never a pasted-on or decorative letter, never a distortion of the subject solely to fabricate the letter.

6. Memorable association for a child: intuitive link letter → element → meaning → spelling.

7. Simplicity and clarity: clean illustration, what carries the letter must be visually obvious.

8. Coherence and naturalness: the drawing remains realistic and credible, naturally integrated into the scene.

9. Adapted to the child's level: accessible, warm style.

10. Highlighting the difficult letter: recognizable in its correct form (e.g.: Z stays a Z, not a 2).

11. (added by the user, validated through testing) Fidelity to reality: the depicted elements must retain an appearance similar to reality — only minor, non-jarring distortions are acceptable, including on the parts of the element that do not directly carry the letter.

Key methodological principle, never to be lost: the reasoning must start from the meaning of the word to find an existing shape that matches the letter — never the reverse (starting from the letter's shape and inventing an artificial scene around it).

## 4. Task

Word to illustrate: ${word}

Letter(s) to memorize: ${letters}

Exact position of this/these letter(s) in the word: ${positions}

Generate an illustration that strictly respects the 11 principles above for this specific word and letter(s), at the indicated position.
Only ${letters} must be transformed or fused with a visual element. All OTHER letters in the word must remain in simple, plain black font, unmodified, exactly like the rest of the text — no color, no texture, no element drawn on or through them.

## 5. Output format

Style: simple, colorful, warm illustration, suitable for children. White or very light background. No additional text, title, or caption — only the word itself, written entirely in UPPERCASE LETTERS, in black, integrated into the illustration as described above.;

## 6. Suggested illustration (optional): ${concept}`
}


module.exports = {buildIllustrationPrompt}