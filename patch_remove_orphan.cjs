const fs = require('fs');
const filePath = 'src/components/CalibrationLaunchModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const CRLF = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(CRLF);

// Lines 577–670 (1-indexed) are the orphan old config block.
// Remove them (convert to 0-indexed: 576 to 669 inclusive)
const removeStart = 576; // line 577 in 1-indexed
const removeEnd = 670;   // line 670 in 1-indexed (inclusive)

console.log(`Removing lines ${removeStart+1} to ${removeEnd}`);
console.log('First line to remove:', JSON.stringify(lines[removeStart]));
console.log('Last line to remove:', JSON.stringify(lines[removeEnd - 1]));

lines.splice(removeStart, removeEnd - removeStart);
fs.writeFileSync(filePath, lines.join(CRLF), 'utf8');
console.log('SUCCESS: orphan block removed. New total lines:', lines.length);
