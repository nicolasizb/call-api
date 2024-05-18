const express = require('express')
const axios = require('axios')
const router = express.Router()
const VoiceResponse = require('twilio').twiml.VoiceResponse

const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN
const twilio = require('twilio')(accountSid, authToken)

const twiml = new VoiceResponse()

let userData = {
    userID: '',
    number: '',
    address: '',
    digit: '',  
    callSID: '',
};

function changeData(userID, number, address, digit, callSID) {
    if (typeof userID !== 'undefined') {
        userData.userID = userID
    }
    if (typeof number !== 'undefined') {
        userData.number = number
    }
    if (typeof address !== 'undefined') {
        userData.address = address
    }
    if (typeof digit !== 'undefined') {
        userData.digit = digit
    }
    if (typeof callSID !== 'undefined') {
        userData.callSID = callSID
    }
}

router.post('/call', async (req, res) => {    
    try {
        const { userID, clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body;
        if (!userID || !clientNumber || !addressOne || !city || !store || !firstName || !lastName) {
            throw new Error("Datos inválidos")
        }
        
        twiml.say({ 
            language: 'es-MX',
            voice: 'Polly.Mia-Neural'
        }, `Hola ${firstName} ${lastName}, lo llamamos desde la tienda ${store} para confirmar la dirección de envío de su pedido. ¿Su dirección es ${addressOne} ${addressDetails || ''} en ${city}?`)
        
        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://call-api-phi.vercel.app/validation',
            method: 'POST',
            timeout: 5
        });
        
        gather.say({
            language: 'es-MX',
            voice: 'Polly.Mia-Neural',
        }, 'Marque el número 1, si está correcta la dirección. O marque el número 2 para repetir la dirección mencionada.')

        twiml.say({
            language: 'es-MX',
            voice: 'Polly.Mia-Neural'
        }, `Su dirección es ${addressOne} ${addressDetails || ''} en ${city}?`);

        for (let i = 0; i<= 2; i++) {
            const repeatGather = twiml.gather({
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/validation',
                method: 'POST',
                timeout: 4
            });
        
            repeatGather.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Marque el número 1, si está correcta. O marque el número 2 para repetir la dirección mencionada.')
        }

        twiml.say({
            language: 'es-MX',
            voice: 'Polly.Mia-Neural'
        }, 'Nos pondremos en contacto con usted por correo electrónico para confirmar su dirección.')
        
        const call = await twilio.calls.create({
            twiml: twiml.toString(),
            to: clientNumber,
            from: process.env.SUPPORT_NUMBER
        })

        changeData(userID, clientNumber, addressOne + ' - ' + addressDetails + ' en ' + city, undefined, call.sid)

        res.status(200).json({ userID: userID, SID: call.sid  })
    } catch (error) {
        console.error(error)
        res.status(400).json({ error: error.message })
    }
})

router.post('/validation', async (req, res) => {
    try {
        const digitPressed = req.body.Digits

        switch (digitPressed) { 
            case '1':
                changeData(undefined, undefined, undefined, 'Confirm', undefined)

                await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Usted confirmó que la dirección mencionada es correcta, gracias por su respuesta. ¡Hasta luego!')
                break;
            case '2':
                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, `¿Su dirección es ${userData.address}?`)

                const gather = twiml.gather({
                    numDigits: 1,
                    action: 'https://call-api-phi.vercel.app/change-address',
                    method: 'POST',
                    timeout: 4
                })

                gather.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, `Marque el número 1, si está correcta. O marque el número 2 para cambiar dirección de envío.`)

                break;
            default:
                res.status(200).json({ msj: "It isn't correct digit" })

                twiml.say({
                    language: 'es-MX',
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

router.post('/change-address', async (req, res) => {
    const digitPressed = req.body.Digits

    switch(digitPressed) {
        case '1' :
            changeData(undefined, undefined, undefined, 'Confirm', undefined)        

            await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)

            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Usted confirmó que la dirección mencionada es correcta, gracias por su respuesta. ¡Hasta luego!');
            break;
        case '2':
            const gather = twiml.gather({
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/filter',
                method: 'POST',
                timeout: 4
            })

            gather.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, `Marque 1 para autorizar que le contactemos al correo electrónico proporcionado durante la compra. O marque 2 para confirmar que la dirección nombrada es correcta.`)
            break;
        default:
            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.')
            break;
    }
    res.type('text/xml').send(twiml.toString())
})

router.post('/filter', async (req, res) => {
    const digitPressed = req.body.Digits

    switch(digitPressed) {
        case '1' :
            changeData(undefined, undefined, undefined, 'Confirm', undefined)        

            await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)

            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Usted confirmó que la dirección mencionada es correcta, gracias por su respuesta. ¡Hasta luego!');
            break;
        case '2':
            const gather = twiml.gather({
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/send-email',
                method: 'POST',
                timeout: 4
            })

            gather.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, `Marque 1 para autorizar que le contactemos al correo electrónico proporcionado durante la compra. O marque 2 para confirmar que la dirección nombrada es correcta.`)
            break;
        default:
            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.')
            break;
    }
    res.type('text/xml').send(twiml.toString())
})

router.post('send-email', async(req, res) => {
    const digitPressed = req.body.Digits

    switch(digitPressed) {
        case '1':
            changeData(undefined, undefined, undefined, 'Change', undefined)        

            await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)

            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Nos pondremos en contacto con usted por correo electrónico para confirmar su dirección.')

            break;
        case '2':
            changeData(undefined, undefined, undefined, 'Confirm', undefined)        

            await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)

            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Usted confirmó que la dirección es correcta, gracias por su respuesta. ¡Hasta luego!');
            break;
    }
    res.type('text/xml').send(twiml.toString())
})

module.exports = router;