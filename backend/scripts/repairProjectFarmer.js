// Script to repair missing farmer field in Project for a given gapRequest
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const GapRequest = require('../models/GapRequest');
const Project = require('../models/Project');

async function repairProjectFarmer(gapRequestId) {
  await mongoose.connect(process.env.MONGO_URI);
  const gapRequest = await GapRequest.findById(gapRequestId);
  console.log('Loaded gapRequest:', gapRequest);
  if (!gapRequest) {
    console.error('GapRequest not found:', gapRequestId);
    return;
  }
  const project = await Project.findById(gapRequest.campaignId);
  console.log('Loaded project:', project);
  if (!project) {
    console.error('Project not found for campaignId:', gapRequest.campaignId);
    return;
  }
  if (!project.farmer && gapRequest.farmerId) {
    project.farmer = gapRequest.farmerId;
    await project.save();
    console.log('Patched project:', project._id, 'with farmer:', project.farmer);
  } else {
    console.log('Project already has farmer:', project.farmer);
  }
  // Print final state
  const updatedProject = await Project.findById(gapRequest.campaignId);
  console.log('Final project state:', updatedProject);
  mongoose.disconnect();
}

// Replace with your gapRequest _id
repairProjectFarmer('69de1273f4ea42f4e862bebc');
