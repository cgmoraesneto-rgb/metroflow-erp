const fs = require('fs');
const filePath = 'src/components/CalibrationLaunchModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const CRLF = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(CRLF);
// Lines 328-329 (1-indexed) = duplicate. Remove lines 328 and 329 (0-indexed: 327 and 328)
console.log('Line 328:', JSON.stringify(lines[327]));
console.log('Line 329:', JSON.stringify(lines[328]));
lines.splice(327, 2); // remove 2 lines starting at index 327
fs.writeFileSync(filePath, lines.join(CRLF), 'utf8');
console.log('Removed duplicates. New line count:', lines.length);
