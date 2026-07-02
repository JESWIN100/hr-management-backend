
    const express = require('express');
    const router = express.Router();

    const authenticate = require('../middleware/auth');

    const upload = require('../config/multer');
const { chatget, createChat, chatgetforuser, createChatforuser } = require('../controllers/chatController');
    
    
    
router.get('/:projectId', authenticate, chatget);
router.post('/', authenticate, createChat);
router.get('/user/:userId/:receiverId', authenticate, chatgetforuser);
router.post('/user', authenticate, createChatforuser);

    module.exports = router;