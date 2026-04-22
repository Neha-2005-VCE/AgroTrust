const express = require('express');
const router = express.Router();

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    res.status(200).json({ message: "Project route working" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;