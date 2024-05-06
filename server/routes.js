const express = require('express')
const router = express.Router()
const VoiceResponse = require('twilio').twiml.VoiceResponse

const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN
const twilio = require('twilio')(accountSid, authToken)

router.get('/', (req, res) => {
    res.status(200).json({ res: "All good" })
})

router.post('/call', async (req, res) => {    

    if (!req.body.clientNumber || !req.body.addressOne || !req.body.addressDetails || !req.body.city || !req.body.city || !req.body.store || !req.body.firstName || !req.body.lastName ) {
        res.status(400).json({ error: "Invalid data" })
    } else {        
        const { clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body
        
        try {
            const twiml = new VoiceResponse()
            twiml.say(
                {
                    language: 'es',
                    voice: 'Polly.Mia-Neural'
                },
                `Hola ${firstName} ${lastName}, lo llamamos desde la tienda ${store} para confirmar la dirección de envío de su pedido. ¿Su dirección es ${addressOne} ${addressDetails} en ${city}?`
            )

            const gather = twiml.gather({
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/validation',
                method: 'POST'
            })

            gather.say(
                {
                    language: 'es',
                    voice: 'Polly.Mia-Neural'
                },
                'Por favor marque el número 1, para confirmar que está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.'
            )

            const call = await twilio.calls.create({
                twiml: twiml.toString(),
                to: clientNumber,
                from: process.env.SUPPORT_NUMBER
            })

            console.log(call.sid)

            res.type('text/xml').send(twiml.toString())
            
        } catch (error) {
            console.error(error)
            res.status(500).send('Error al realizar la llamada')
        }
    }
})

router.post('/validation', (req, res) => {
    const twiml = new VoiceResponse()
    
    const digitPressed = req.body.Digits;

    console.log(digitPressed)

    switch (digitPressed) { 
        case '1':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.')
            break;
        case '2':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },'Usted acaba de confirmar que su dirección es incorrecta, procederemos a editar su dirección')
            break;
        default:
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.')
            break;
    }
    
    res.type('text/xml').send(twiml.toString())
})

router.post('/realizar-llamada', async (req, res) => {
    const clientNumber = "+573102950378";

    try {
        const twiml = new VoiceResponse();
        const gather = twiml.gather({
            input: 'speech dtmf',
            languaje: 'es-MX',
            action: 'https://call-api-phi.vercel.app/respuesta-llamada',
            method: 'POST',
            speechTimeout: 'auto',
            hints: 'Di tu dirección, por favor.'
        });

        gather.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        },'Por favor, di tu dirección después del tono.');

        const call = await twilio.calls.create({
            twiml: twiml.toString(),
            to: clientNumber,
            from: process.env.SUPPORT_NUMBER
        });

        console.log(call.sid);

        res.type('text/xml').send(twiml.toString());
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al realizar la llamada');
    }
});

router.post('/respuesta-llamada', (req, res) => {
    const twiml = new VoiceResponse();
    let retryCount = parseInt(req.body.RetryCount || 0); // Obtener el contador de intentos y convertirlo a un entero

    const digitPressed = req.body.Digits;

    const clientAddress = req.body.SpeechResult;

    if (digitPressed) {
        switch (digitPressed) {
            case '1':
                twiml.say({
                    language: 'es',
                    voice: 'Polly.Mia-Neural'
                }, 'Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.');
                break;
            case '2':
                if (retryCount < 3) { // Si aún no se han excedido los 3 intentos
                    // Volver a preguntar la dirección
                    const gather = twiml.gather({
                        input: 'speech dtmf',
                        language: 'es-MX',
                        action: '/respuesta-llamada',
                        method: 'POST',
                        speechTimeout: 'auto',
                        hints: 'Di tu dirección, por favor.'
                    });

                    gather.say({
                        language: 'es',
                        voice: 'Polly.Mia-Neural'
                    }, `Su dirección es ${clientAddress}. Por favor, di tu dirección después del tono.`);
                } else { // Si se exceden los 3 intentos
                    twiml.say({
                        language: 'es',
                        voice: 'Polly.Mia-Neural'
                    }, 'Ha excedido el número máximo de intentos. Nos pondremos en contacto con usted de otra manera para confirmar la dirección.');
                }
                break;
            default:
                // Opción no válida
                twiml.say({
                    language: 'es',
                    voice: 'Polly.Mia-Neural'
                }, 'Opción no válida. Por favor, intenta de nuevo.');
                break;
        }
    } else {
        if (retryCount < 3) { // Si aún no se han excedido los 3 intentos
            // Volver a preguntar la dirección
            const gather = twiml.gather({
                input: 'speech dtmf',
                language: 'es-MX',
                action: '/respuesta-llamada',
                method: 'POST',
                speechTimeout: 'auto',
                hints: 'Di tu dirección, por favor.'
            });

            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, `Su dirección es ${clientAddress}. Por favor, di tu dirección después del tono.`);
        } else { // Si se exceden los 3 intentos
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Ha excedido el número máximo de intentos. Nos pondremos en contacto con usted de otra manera para confirmar la dirección.');
        }
    }

    res.type('text/xml').send(twiml.toString());
})


module.exports = router;