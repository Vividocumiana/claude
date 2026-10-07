// One codebase, one card per person. CARD (env var, set per Vercel project) picks
// whose card a deploy renders and whose details the email uses. Default: Samuele.
import samuele from './samuele/person.js';
import alessandro from './alessandro/person.js';

export const PEOPLE = { samuele, alessandro };

export function getPerson(id = process.env.CARD || 'samuele') {
  const person = PEOPLE[id];
  if (!person) throw new Error(`Unknown CARD "${id}". Known: ${Object.keys(PEOPLE).join(', ')}`);
  return person;
}
