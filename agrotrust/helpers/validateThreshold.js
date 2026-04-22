// Helper to validate sensor readings against thresholds.json
const fs = require('fs');
const path = require('path');

const thresholdsPath = path.join(__dirname, '../constants/thresholds.json');
let thresholds;

function loadThresholds() {
  if (!thresholds) {
    thresholds = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
  }
  return thresholds;
}

/**
 * Validates a sensor value against thresholds for the given sensor type.
 * @param {string} sensorType - e.g. 'temperature', 'humidity', 'soilMoisture'
 * @param {number} value - The sensor reading to validate
 * @returns {{ valid: boolean, message?: string }}
 */
function validateThreshold(sensorType, value) {
  const thresholds = loadThresholds();
  const t = thresholds[sensorType];
  if (!t) {
    return { valid: false, message: `Unknown sensor type: ${sensorType}` };
  }
  if (typeof value !== 'number') {
    return { valid: false, message: 'Sensor value must be a number' };
  }
  if (value < t.min || value > t.max) {
    return {
      valid: false,
      message: `${sensorType} reading ${value} is out of range (${t.min} - ${t.max})`
    };
  }
  return { valid: true };
}

module.exports = { validateThreshold };
