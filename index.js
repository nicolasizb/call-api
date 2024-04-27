// Download the helper library from https://www.twilio.com/docs/node/install
// Set environment variables for your credentials
// Read more at http://twil.io/secure

require('dotenv').config()
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.AUTH;

// const client = require("twilio")(accountSid, authToken);

function startServer() {
  console.log('All good')
}

startServer()

// client.calls.create({
//   url: "https://corn-alpaca-7119.twil.io/assets/WhatsApp%20Audio%202024-04-25%20at%205.23.57%20PM.mp3",
//   to: "+573102950378",
//   from: "+12564484110",
// })
// .then(call => console.log(call.sid));