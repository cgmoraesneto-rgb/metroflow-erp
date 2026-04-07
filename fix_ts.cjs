const fs = require('fs');
const file = 'C:/Users/comer/Downloads/metroflow-erp/src/components/CalibrationRecordModule.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /setAttachments\(prev => \[\.\.\.prev\, ev\.target\.result\]\)\;/g,
  "setAttachments(prev => [...prev, ev.target.result as string]);"
);
fs.writeFileSync(file, content, 'utf8');
