const thresholds = require('../constants/thresholds.json');

function isWithinThreshold(reading) {
  return (
    reading.soilMoisture >= thresholds.soilMoisture.min &&
    reading.soilMoisture <= thresholds.soilMoisture.max &&
    reading.temperature >= thresholds.temperature.min &&
    reading.temperature <= thresholds.temperature.max &&
    reading.humidity >= thresholds.humidity.min &&
    reading.humidity <= thresholds.humidity.max
  );
}

module.exports = { isWithinThreshold };
