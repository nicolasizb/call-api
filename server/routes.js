const express = require('express')
const router = express.Router()
const VoiceResponse = require('twilio').twiml.VoiceResponse

const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN
const twilio = require('twilio')(accountSid, authToken)

let digitPressed = null; 

router.get('/', (req, res) => {
    res.status(200).json({ res: "All good" })
})

router.post('/call', async (req, res) => {
    
    if (!req.body.clientNumber || !req.body.addressOne || !req.body.addressDetails || !req.body.city || !req.body.city || !req.body.store || !req.body.firstName || !req.body.lastName ) {
        res.status(400).json({ error: "Invalid data" })
    } else {
        const supportNumber = process.env.SUPPORT_NUMBER
        
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
                from: supportNumber
            })

            console.log(call.sid)

            const waitForDigit = new Promise(resolve => {
                router.post('https://call-api-phi.vercel.app/validation', (req, res) => {
                    digitPressed = req.body.Digits;
                    resolve();
                });
            });

            await waitForDigit;

            res.status(200).json({ digitPressed });
            
        } catch (error) {
            console.error(error)
            res.status(500).send('Error al realizar la llamada')
        }
    }
})

router.post('/validation', (req, res) => {
    const twiml = new VoiceResponse()
    
    digitPressed = req.body.Digits;

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

module.exports = router
