const fs = require('fs');
const filePath = 'src/components/CalibrationLaunchModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const CRLF = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(CRLF);

// Line 577 (1-indexed) = index 576 (0-indexed) is the lone orphan: "                </div>"
console.log('Line to delete:', JSON.stringify(lines[576]));
lines.splice(576, 1);
fs.writeFileSync(filePath, lines.join(CRLF), 'utf8');
console.log('Done. New count:', lines.length);
