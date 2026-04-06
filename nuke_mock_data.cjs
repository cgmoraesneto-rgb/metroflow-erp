const fs = require('fs');
const path = require('path');

const mockDbPath = 'C:/Users/comer/Downloads/metroflow-erp/mock-db';
const filesToClear = [
  'audit_trails.json',
  'banks.json',
  'calibration_records.json',
  'calibration_results.json',
  'certificate_masks.json',
  'clients.json',
  'employees.json',
  'financial_controls.json',
  'fleet_logs.json',
  'instrument_cards.json',
  'instrument_types.json',
  'mask_versions.json',
  'payment_methods.json',
  'price_tables.json',
  'procedures.json',
  'quotes.json',
  'service_orders.json',
  'standard_custodies.json',
  'standard_instruments.json',
  'standard_logs.json',
  'units_of_measure.json',
  'users.json',
  'vehicles.json'
];

filesToClear.forEach(file => {
  const filePath = path.join(mockDbPath, file);
  if (fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf8');
    console.log(`Cleared: ${file}`);
  }
});

console.log('Production Database ready. All transactional and mock data wiped.');
