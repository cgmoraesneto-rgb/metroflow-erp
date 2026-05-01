const fs = require('fs');
const filePath = 'src/components/CalibrationLaunchModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');
const CRLF = content.includes('\r\n') ? '\r\n' : '\n';
const lines = content.split(CRLF);

// Lines 577 to 591 (1-indexed) → 576 to 590 (0-indexed) are the orphan fragment.
// Line 577: "                </div>"   <- orphan start
// Line 578: "                <div className="flex items-end">"   <- orphan
// Line 579: "            <div className="bg-slate-50 border-b...  <- this is the start of isSubmitted block BUT without the {isSubmitted && ...} wrap
// Line 591: "          )}"   <- this closes the misplaced isSubmitted condition that was deleted before

// Let's see exactly what's there
console.log('Lines 576-592:');
for (let i = 575; i <= 592; i++) {
  console.log(`${i+1}: ${JSON.stringify(lines[i])}`);
}

// Strategy: Remove lines 577-578 (the 2 orphan lines), 
// and restore the {isSubmitted && (...)} wrapper around lines 579-591
// Currently 579 is: '            <div className="bg-slate-50 border-b...'
// and 590 is: '            </div>'
// and 591 is: '          )}'

// Remove lines 577 and 578 (0-indexed: 576 and 577), and fix line 579 (now 577) to have the proper wrapper
const orphanLines = [576, 577]; // 0-indexed

// Check what they actually are
console.log('\nOrphan lines to delete:');
orphanLines.forEach(i => console.log(i+1, JSON.stringify(lines[i])));
