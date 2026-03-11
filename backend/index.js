const express = require('express'); //to get the express(framework-set of written codes-backend tool) library which is used to build web servers and api in nodejs,,handles requests and responses
const cors = require('cors'); //allows frontend to talk to backend(different port)allows cross origin request
require('dotenv').config(); //reads .env file converts it into->(puts value inside process.env)
const routes = require('./api/route');

const app = express(); //represents express application object which represents our server,,,server creation
const port = process.env.PORT || 3001; //tries to use port from .env ,,,if not available use 3001

app.use(cors()); //allows requests from diff origins such as frontend from another origin
app.use(express.json());//allows server to read json data from request body';
app.use('/api', routes);//connects route file to main app

app.listen(port, () => {
    console.log('Server running on port ' + port);
});
