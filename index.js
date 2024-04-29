const express = require('express');
const twilio = require('twilio');
require('dotenv').config()  

const app = express();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

app.get('/makeCall', async (req, res) => {
  const phoneNumber = req.query.phoneNumber;
  const shippingAddress = req.query.shippingAddress;
  const CustomerName = req.query.CustomerName;

  try {
    await client.calls.create({
      url: 'https://handler.twilio.com/twiml/EH3ff25c2abb305b0788c745c1f123cce7',
      to: `+${phoneNumber}`,
      from: '+13343100649',
    });

    res.send({
      message: `Llamada realizada al número ${phoneNumber}. Dirección de envío: ${shippingAddress}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Servidor API Twilio escuchando en el puerto 3000');
});
