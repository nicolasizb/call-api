const express = require('express');
const router = express.Router();
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilio = require('twilio')(accountSid, authToken);

let addressGlobal = ''
let responseJSON = undefined

function changeAddress(newAddress) {
    addressGlobal = newAddress
}

router.get('/', (req, res) => {
    res.status(200).json({ res: "Todo bien" });
})

router.post('/call', async (req, res) => {    
    try {
        const { clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body;
        if (!clientNumber || !addressOne || !city || !store || !firstName || !lastName) {
            throw new Error("Datos inválidos");
        }
        const newAddress = `${addressOne} ${addressDetails}`

        changeAddress(newAddress)

        const twiml = new VoiceResponse();
        twiml.say({ 
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, `Hola ${firstName} ${lastName}, lo llamamos desde la tienda ${store} para confirmar la dirección de envío de su pedido. ¿Su dirección es ${addressOne} ${addressDetails || ''} en ${city}?`);


        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://call-api-phi.vercel.app/validation',
            method: 'POST'
        });
        gather.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, 'Por favor marque el número 1, para confirmar que está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.');

        twiml.pause({ length: 7 });

        const twimlXml = twiml.toString();

        await twilio.calls.create({
            twiml: twimlXml,
            to: clientNumber,
            from: process.env.SUPPORT_NUMBER
        });

        function myPromise() {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                  if (responseJSON === 1) {
                    resolve({responseJSON})
                } else if(responseJSON === 2) {
                    resolve({responseJSON})
                } else {
                    reject("La tarea ha fallado.")
                }
            }, 60000)
        });
    }
    
    myPromise()
        .then((responseJSON) => {
            console.log("Success: ", responseJSON)
            res.status(200).json({ responseJSON })
        })
        .catch((err) => {
            console.error("Error: ", err)
        })

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
            responseJSON = 1

            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.');
            break;
        case '2':
            responseJSON = 2
            
            const gather = twiml.gather({
                language: 'es-MX',
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/change-address',
                method: 'POST'
            });

            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },`Usted indicó que su dirección es incorrecta, por favor:
            
            Marque 1 si autoriza que le escribamos por WhatsApp para el cambio de dirección. O marque 2 para confirmar la entrega en la dirección ${addressGlobal}.`);

            twiml.pause({ length: 7 });

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

router.post('/change-address', (req, res) => {
    const digitPressed = req.body.Digits
    
    const twiml = new VoiceResponse()

    switch(digitPressed) {
        case '1' :
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Nos pondremos en contacto con usted lo más pronto posible.');
            break;
        case '2':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, `Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.`)
            break;
        default:
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.');
            break;
    }
    res.type('text/xml').send(twiml.toString());
})

module.exports = router;
