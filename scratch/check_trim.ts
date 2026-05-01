import { z } from 'zod';

const s = z.string().trim();
console.log("Trim exists:", typeof s.trim === 'function');
console.log("Result:", s.parse("  hello  "));
