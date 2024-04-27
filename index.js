require('dotenv').config()
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.AUTH;
const port = process.env.PORT;

const express = require('express')
const cors = require('cors')
const router = require('./src/routes/routes.js')
const app = express()

// const client = require("twilio")(accountSid, authToken);

function startServer() {
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))
  app.use(router)

  const port = process.env.PORT;
  app.listen(port, "0.0.0.0", function () {
    // ...
  });

  console.log('All good')
  console.log(port)
}

startServer()

// client.calls.create({
//   url: "https://corn-alpaca-7119.twil.io/assets/WhatsApp%20Audio%202024-04-25%20at%205.23.57%20PM.mp3",
//   to: "+573102950378",
//   from: "+12564484110",
// })
// .then(call => console.log(call.sid));