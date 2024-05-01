const client = require('twilio');
const express = require('express');
const router = express.Router();
const VoiceResponse = require('twilio').twiml.VoiceResponse;

// Tu código actual aquí
require('dotenv').config();

const accountSid = 'AC543fc2f1fd0ee20ea8908462645ea542';
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilio = require('twilio')(accountSid, authToken);

router.post('/call', async (req, res) => {
    const clientNumber = '+573102950378';
    const supportNumber = '+13343100649';
    const customerName = req.query.customerName || "";

    try {
        const twiml = new VoiceResponse();
        twiml.say(
            {
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },
            `Hola ${customerName}, lo llamamos desde la tienda Vital Fit para confirmar la dirección de envío de su pedido. ¿Su dirección es Calle 95 con Carrera 15 en la ciudad de Bogotá?`
        );

        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://flame-harrier-8893.twil.io/validation',
            method: 'POST'
        });

        gather.say(
            {
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },
            'Por favor marque el número 1, para confirmar que está correcta la dirección.'
        );

        gather.say(
            {
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },
            'O marque el número 2, para cambiar la dirección de envío de su pedido.'
        );

        const url = 'https://call-api-phi.vercel.app/call';
        const twilioSignature = req.headers['x-twilio-signature'];
        const isValidRequest = client.validateRequest(authToken, twilioSignature, url, req.body);

        if (!isValidRequest) {
            return res.status(403).send('Forbidden');
        }

        res.type('text/xml').send(twiml.toString());

        const call = await twilio.calls.create({
            twiml: twiml.toString(),
            to: clientNumber,
            from: supportNumber
        });

        console.log(call.sid);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al realizar la llamada');
    }
});

module.exports = router;
