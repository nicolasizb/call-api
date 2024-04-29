const express = require('express');
const app = express();

const Voice = require('twilio/lib/rest/Voice');
const VoiceResponse = require('twilio/lib/twiml/VoiceResponse');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Define tu número de teléfono de destino (al que se realizará la llamada si se marca el 1)
const destinationNumber = '+573123456789';

// Configura la ruta para procesar el dígito marcado
app.post('/process-digit', async (req, res) => {
  // Recupera el dígito marcado
  const digit = req.body.Digit;

  // Genera el TwiML en función del dígito marcado
  let twiml;
  if (digit === '1') {
    // Si se marca el 1, se informa el número de destino
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say language="es" voice="Polly.Mia-Neural">El número al que debe llamar es ${destinationNumber}</Say>
      <Hangup />
    </Response>`;
  } else if (digit === '2') {
    // Si se marca el 2, se conecta al operador
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say language="es" voice="Polly.Mia-Neural">Lo conectamos con un operador.</Say>
      <Connect toNumber="${twilioNumber}" />
    </Response>`;
  } else {
    // Si se marca un dígito no válido, se reproduce un mensaje de error
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say language="es" voice="Polly.Mia-Neural">Dígito no válido. Por favor, intente de nuevo.</Say>
      <Hangup />
    </Response>`;
  }

})

module.exports = { app }