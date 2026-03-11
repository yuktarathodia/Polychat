const express = require('express');
const router = express.Router(); //taking router from express
const controller = require('./controller'); //imports your logic from another file

router.post('/chat', controller.handleChat);
router.get('/models/status', controller.getModelsStatus);

router.get('/test', (req, res) => {
    res.json({ message: 'API working', status: 'ok' });
});

module.exports = router;
