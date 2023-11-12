const express = require('express');
const project_route = express()
const bodyParser = require('body-parser');
const project_controller = require('../controllers/projectController')

project_route.use(bodyParser.json());
project_route.use(bodyParser.urlencoded({ extended: true }));
const userMiddleware = require('../middleware/UserAuth')


project_route.get('/', (req, res) => {
    res.send("Project routes are working!")
})
project_route.post('/newproject', userMiddleware.verifyToken, project_controller.newProject);

project_route.post('/getprojects', userMiddleware.verifyToken, project_controller.getProjects);

project_route.put('/updateproject', userMiddleware.verifyToken, project_controller.updateProject);

module.exports = project_route
