require('dotenv').config()

const express = require('express')

const accountSid = 'AC543fc2f1fd0ee20ea8908462645ea542';
const authToken = '969eb9dc66ef04de0ddfdcb1b9628cf8';

// twilio.calls
//       .create({
//          url: 'https://handler.twilio.com/twiml/EH3ff25c2abb305b0788c745c1f123cce7',
//          to: '+573102950378',
//          from: '+13343100649'
//        })
//       .then(call => console.log(call.sid));


const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
const port = process.env.PORT;

// Configurar Twilio
const client = twilio(accountSid, authToken);

// Configurar bodyParser para procesar JSON
app.use(bodyParser.json());

// Ruta para la solicitud de Zapier
app.post('/twilio-api-request', async (req, res) => {
  // Extraer datos de la solicitud
  const method = req.body.method;
  const url = req.body.url;
  const headers = req.body.headers;
  const body = req.body.body;

  // Crear opciones de solicitud
  const options = { 
    method,
    url,
    headers,
  };

  // Si hay un cuerpo, agregarlo a las opciones
  if (body) {
    options.body = body;
  }

  // Realizar la solicitud a la API de Twilio
  try {
    const response = await client.request(options);
    res.json({
      success: true,
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
