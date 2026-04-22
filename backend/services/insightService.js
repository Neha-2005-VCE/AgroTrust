// services/insightService.js
// Converts IoT sensor data into human-friendly insights for farmers and investors

/**
 * Analyze sensor data and generate insights.
 * @param {Object} data - Sensor data
 * @param {number} data.soilMoisture - Soil moisture percentage
 * @param {number} data.temperature - Temperature in Celsius
 * @param {number} data.humidity - Humidity percentage
 * @param {number} data.sunlight - Sunlight (arbitrary units or lux)
 * @returns {Object} Insights: farmerMessage, investorSummary, healthScore, riskLevel
 */
function analyzeSensorData({ soilMoisture, temperature, humidity, sunlight }) {
  let healthScore = 100;
  let riskLevel = 'Low';
  let farmerMessage = 'All conditions are optimal.';
  let investorSummary = 'Crop growing normally.';
  let cropHealth = 'Good';
  let investorStatus = 'Crop growing normally.';
  let healthScoreCategory = 'Healthy';
  const farmerActions = [];
  const investorAlerts = [];

  // Thresholds (can be adjusted or loaded from config)
  const thresholds = {
    soilMoisture: { low: 30 }, // %
    temperature: { high: 35 }, // °C
    humidity: { high: 85 },    // %
    sunlight: { low: 2000 }    // lux (example)
  };

  // Analyze soil moisture
  if (soilMoisture < thresholds.soilMoisture.low) {
    farmerActions.push('Soil is dry → Irrigate now');
    investorAlerts.push('Soil moisture is low. Irrigation needed.');
    healthScore -= 30;
    riskLevel = 'Medium';
  }

  // Analyze temperature
  if (temperature > thresholds.temperature.high) {
    farmerActions.push('High temperature → Water in evening');
    investorAlerts.push('High temperature detected. Heat risk for crops.');
    healthScore -= 25;
    riskLevel = 'Medium';
  }

  // Analyze humidity
  if (humidity > thresholds.humidity.high) {
    farmerActions.push('High humidity → Monitor for disease');
    investorAlerts.push('High humidity detected. Disease risk increased.');
    healthScore -= 20;
    riskLevel = 'Medium';
  }

  // Analyze sunlight
  if (sunlight < thresholds.sunlight.low) {
    farmerActions.push('Low sunlight → Check for shade or obstructions');
    investorAlerts.push('Low sunlight detected. Growth may be affected.');
    healthScore -= 15;
    riskLevel = 'Medium';
  }

  // Escalate risk if multiple issues
  if (farmerActions.length >= 2) {
    riskLevel = 'High';
    healthScore -= 10;
  }

  // Determine crop health status
  if (healthScore >= 80) {
    cropHealth = 'Good';
    investorStatus = 'Crop growing normally.';
    healthScoreCategory = 'Healthy';
  } else if (healthScore >= 50) {
    cropHealth = 'Average';
    investorStatus = 'Minor issues detected.';
    healthScoreCategory = 'Moderate';
  } else {
    cropHealth = 'Poor';
    investorStatus = 'Water stress or other risks detected.';
    healthScoreCategory = 'Risk';
  }

  // Clamp healthScore
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Build messages
  if (farmerActions.length > 0) {
    farmerMessage = farmerActions.join(' | ');
    investorSummary = `Status: ${cropHealth} | Risk: ${riskLevel} | ${investorStatus}`;
    if (investorAlerts.length > 0) {
      investorSummary += ' | ' + investorAlerts.join(' ');
    }
  } else {
    investorSummary = `Status: ${cropHealth} | Risk: ${riskLevel} | ${investorStatus}`;
  }

  return {
    farmerMessage,
    investorSummary,
    healthScore,
    healthScoreCategory,
    riskLevel,
    cropHealth,
    investorStatus
  };
}

module.exports = { analyzeSensorData };
