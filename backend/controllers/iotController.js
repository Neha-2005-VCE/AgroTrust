


const IoTReading = require('../models/IoTReading');
const Project = require('../models/Project');
const Investment = require('../models/Investment');


exports.analyzeData = async (req, res) => {
  const { soilMoisture, temperature, humidity, sunlight, project_id, investment_id } = req.body;

  // Validate project_id and investment_id
  if (!project_id || !investment_id) {
    return res.status(400).json({ error: 'project_id and investment_id are required' });
  }

  // Validate existence in DB
  let project, investment;
  try {
    project = await Project.findById(project_id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    investment = await Investment.findById(investment_id);
    if (!investment) return res.status(404).json({ error: 'Investment not found' });
  } catch (err) {
    return res.status(500).json({ error: 'Database error during validation' });
  }

  let farmerMessage = [];
  let healthScore = 100;
  let riskLevel = "Low";
  let investorSummary = "";


  // Soil moisture
  if (soilMoisture < 30) {
    farmerMessage.push("Soil is dry → Irrigate now");
    healthScore -= 30;
  }

  // Temperature
  if (temperature > 35) {
    farmerMessage.push("High temperature → Water in evening");
    healthScore -= 20;
  }

  // Humidity
  if (humidity > 80) {
    farmerMessage.push("High humidity → Disease risk");
    healthScore -= 20;
  }

  // Sunlight
  if (sunlight > 3000) {
    farmerMessage.push("Excess sunlight → Consider shading");
    healthScore -= 10;
  }

  // Clamp healthScore to 0 minimum
  if (healthScore < 0) healthScore = 0;


  // Risk level
  if (healthScore < 50) {
    riskLevel = "High";
  } else if (healthScore <= 80) {
    riskLevel = "Medium";
  }

  // Smart investor summary
  if (farmerMessage.length > 1) {
    investorSummary = "Multiple environmental risks detected";
  } else if (farmerMessage.length === 1) {
    investorSummary = "Minor environmental stress detected";
  } else if (healthScore > 80) {
    investorSummary = "Crop growing normally";
  } else if (healthScore >= 50) {
    investorSummary = "Moderate stress detected";
  } else {
    investorSummary = "High risk: Immediate attention needed";
  }

  try {
    // Save to DB
    const reading = new IoTReading({
      soilMoisture,
      temperature,
      humidity,
      sunlight,
      healthScore,
      riskLevel,
      project_id,
      investment_id
    });
    await reading.save();

    return res.status(200).json({
      farmer: {
        message: farmerMessage.join(". ")
      },
      investor: {
        summary: investorSummary,
        healthScore,
        riskLevel
      },
      project_id,
      investment_id
    });
  } catch (err) {
    console.error('Error saving IoT reading:', err);
    return res.status(500).json({ error: 'Failed to save IoT reading' });
  }
};
