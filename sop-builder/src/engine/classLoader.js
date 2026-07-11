import powerClasses from '../data/classes.json';
import mightClasses from '../data/mightClasses.json';
import guileClasses from '../data/guileClasses.json';

export const allClasses = [...powerClasses, ...mightClasses, ...guileClasses];
export const classesById = Object.fromEntries(allClasses.map((c) => [c.id, c]));

// Grouped for <optgroup> rendering in the class picker.
export const classesByCategory = allClasses.reduce((acc, c) => {
  (acc[c.category] = acc[c.category] || []).push(c);
  return acc;
}, {});
