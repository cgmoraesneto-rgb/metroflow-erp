const fs = require('fs');
const launchPath = 'src/components/CalibrationLaunchModal.tsx';
let content = fs.readFileSync(launchPath, 'utf8');

// Find and inject groupSettings reset inside mask onChange
const regex = /(setPointsCount\(p\);\r?\n\s+setRowsCount\(r\);\r?\n)/;
const match = content.match(regex);
if (match) {
  const CRLF = match[0].includes('\r\n') ? '\r\n' : '\n';
  const replacement = match[0] + `                        // Initialize per-group settings from the mask${CRLF}                        setGroupSettings(m.measurementGroups.map(mg => ({${CRLF}                          points: mg.numberOfPoints ?? p,${CRLF}                          rows: mg.repetitions ?? r${CRLF}                        })));${CRLF}`;
  content = content.replace(match[0], replacement);
  fs.writeFileSync(launchPath, content, 'utf8');
  console.log('SUCCESS: groupSettings reset injected.');
} else {
  console.error('ERROR: setPointsCount/setRowsCount pattern not matched.');
}
