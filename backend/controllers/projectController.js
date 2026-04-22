// Example controller for Project
exports.createProject = (req, res) => {
    // Example: extract data from req.body
    const { name, description } = req.body;
    // Here you would normally save to DB
    // For demo, just return the data
    res.status(201).json({
        message: 'Project created successfully',
        project: { name, description }
    });
};
