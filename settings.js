const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "manaofc~", //(manaofc~ ) මෙහෙම තියන එක අයින් කරන්නෙ නැතුව සිසන් අයිඩ් එක දාන්න
    OWNER_NUMBER: process.env.OWNER_NUMBER || "94721551183",
    };
    
