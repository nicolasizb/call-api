const express = require('express');
const router = express.Router();
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilio = require('twilio')(accountSid, authToken);

router.get('/', (req, res) => {
    res.status(200).json({ res: "All good" });
});

router.post('/call', async (req, res) => {    
    try {
        const { clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body;
        if (!clientNumber || !addressOne || !addressDetails || !city || !store || !firstName || !lastName) {
            throw new Error("Invalid data");
        }

        const twiml = new VoiceResponse();
        twiml.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, `Hola ${firstName} ${lastName}, lo llamamos desde la tienda ${store} para confirmar la dirección de envío de su pedido. ¿Su dirección es ${addressOne} ${addressDetails} en ${city}?`);

        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://call-api-phi.vercel.app/validation',
            method: 'POST'
        });

        gather.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, 'Por favor marque el número 1, para confirmar que está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.');

        const call = await twilio.calls.create({
            twiml: twiml.toString(),
            to: clientNumber,
            from: process.env.SUPPORT_NUMBER
        });

        console.log(call.sid);

        res.type('text/xml').send(twiml.toString());
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/validation', (req, res) => {
    const digitPressed = req.body.Digits;

    const twiml = new VoiceResponse();
    switch (digitPressed) { 
        case '1':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.');
            break;
        case '2':
            const gather = twiml.gather({
                language: 'es-MX',
                input: 'speech dtmf',
                speechTimeout: 'auto',
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/change-address',
                method: 'POST',
                hints: 'Di tu dirección, por favor.'
            });

            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },'Usted indicó que su dirección es incorrecta, por favor dicte su dirección de envío después del tono');
            break;
        default:
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.');
            break;
    }
    
    res.type('text/xml').send(twiml.toString());
});

router.post('/change-address', async (req, res) => {
    try {
        const clientAddress = req.body.SpeechResult;

        const twiml = new VoiceResponse(); // Definir twiml aquí

        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://call-api-phi.vercel.app/validator-attempts',
            method: 'POST',
        })
        gather.say({
            language: 'es', 
            voice: 'Polly.Mia-Neural' 
        }, `Listo, su dirección es ${clientAddress}?, marque el número 1, para confirmar que está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.`)

        res.type('text/xml').send(twiml.toString());
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/validator-attempts', (req, res) => {
    const Attempts = 1; // Inicializar Attempts en 1 si no está presente en el cuerpo de la solicitud
    const maxAttempts = 3; // Máximo de intentos permitidos

    let twiml = new VoiceResponse();

    // Verificar si se superó el máximo de intentos permitidos
    if (Attempts > maxAttempts) {
        twiml.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, 'Lo siento, ha superado el número máximo de intentos. Por favor, vuelva a intentarlo más tarde.');
        return res.type('text/xml').send(twiml.toString());
    }

    const digitPressed = req.body.Digits;
    switch (digitPressed) {
        case '1':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.');
            break;
        case '2':
            const nextAttempt = Attempts + 1;
            const gather = twiml.gather({
                language: 'es-MX',
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/validator-attempts',
                method: 'POST',
                input: 'dtmf',
                timeout: 10 // Tiempo de espera en segundos
            });
            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, `Por favor, proporcione la dirección correcta después del tono. Este es su intento número ${nextAttempt}.`);
            break;
        default:
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.');
            break;
    }

    // Agregar el número de intentos al objeto de respuesta para el siguiente intento
    twiml.redirect({
        method: 'POST'
    }, 'https://call-api-phi.vercel.app/validator-attempts', {
        Attempts: Attempts + 1
    });

    res.type('text/xml').send(twiml.toString());
});

module.exports = router;
