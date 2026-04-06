const fs = require('fs');
const path = require('path');

const filesToClear = [
  'clients.json',
  'quotes.json',
  'service_orders.json',
  'calibration_records.json',
  'financial_controls.json',
  'fleet_logs.json',
  'standard_custodies.json',
  'audit_trails.json',
  'calibration_results.json',
  'instrument_cards.json',
  'standard_logs.json',
  'mask_versions.json'
];

const mockDir = 'C:/Users/comer/Downloads/metroflow-erp/mock-db';

filesToClear.forEach(file => {
  const filePath = path.join(mockDir, file);
  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
    console.log(`Cleared ${file}`);
  }
});
