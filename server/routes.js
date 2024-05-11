const express = require('express');
const axios = require('axios');
const router = express.Router();
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilio = require('twilio')(accountSid, authToken);

let userData = {
    number: '',
    address: '',
    digit: ''
};

function changeData(number, address, digit) {
    if (typeof number !== 'undefined') {
        userData.number = number;
    }
    if (typeof address !== 'undefined') {
        userData.address = address;
    }
    if (typeof digit !== 'undefined') {
        userData.digit = digit;
    }
}

router.get('/', (req, res) => {
    res.status(200).json({ res: "Todo bien" });
})

router.post('/call', async (req, res) => {    
    try {
        const { clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body;
        if (!clientNumber || !addressOne || !city || !store || !firstName || !lastName) {
            throw new Error("Datos inválidos")
        }
        const newAddress = `${addressOne} ${addressDetails}`;
        const twiml = new VoiceResponse();

        changeData(clientNumber, addressOne + ' - ' + addressDetails, undefined)

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
        })

        res.status(200).json({ message: "Llamada iniciada, espere la respuesta." });
    } catch (error) {
        console.error(error);       
        res.status(400).json({ error: error.message });
    }
});

router.post('/validation', async (req, res) => {
    try {
        const digitPressed = req.body.Digits;
        changeData(undefined, undefined, digitPressed)

        const twiml = new VoiceResponse();

        axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/')
            .then(response => {
                res.status(200).json({userData})
            })
            .catch(error => {
                console.error('Error al enviar respuesta a Zapier:', error);
                res.status(500).send('Error interno del servidor');
            });

        switch (digitPressed) { 
            case '1':

                twiml.say({
                    language: 'es',
                    voice: 'Polly.Mia-Neural'
                }, 'Usted confirmó que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.');

                break;
            case '2':
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
                console.log("There isn't data")
                res.status(200).json({ msj: "It isn't correct digit" })

                twiml.say({
                    language: 'es',
                    voice: 'Polly.Mia-Neural'
                }, 'Opción no válida. Por favor, intenta de nuevo.');
                break;
        }        
        res.type('text/xml').send(twiml.toString());
    } catch (error) {
        console.error(error);       
        res.status(400).json({ error: error.message });
    }    
});

router.post('/change-address', (req, res) => {
    const digitPressed = req.body.Digits

    changeData(undefined, undefined, digitPressed)
    
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
