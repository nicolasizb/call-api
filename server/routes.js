const express = require('express')
const axios = require('axios')
const router = express.Router()
const VoiceResponse = require('twilio').twiml.VoiceResponse

const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN
const twilio = require('twilio')(accountSid, authToken)

let userData = {
    userID: '',
    recordID: '',
    number: '',
    address: '',
    digit: '',  
    callSID: '',
};

function changeData(userID, recordID, number, address, digit, callSID) {
    if (typeof userID !== 'undefined') {
        userData.userID = userID
    }
    if (typeof recordID !== 'undefined') {
        userData.recordID = recordID
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

        const twiml = new VoiceResponse();
        
        twiml.say({ 
            language: 'es-MX',
            voice: 'Polly.Mia-Neural'
        }, `Hola ${firstName} ${lastName}, lo llamamos desde la tienda ${store} para confirmar la dirección de envío de su pedido. ¿Su dirección es ${addressOne} ${addressDetails || ''} en ${city}?`)
        
        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://call-api-phi.vercel.app/validation',
            method: 'POST',
            timeout: 3
        });
        
        gather.say({
            language: 'es-MX',
            voice: 'Polly.Mia-Neural',
        }, 'Marque el número 1, si está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.')

        twiml.say({
            language: 'es-MX',
            voice: 'Polly.Mia-Neural'
        }, `Su dirección es ${addressOne} ${addressDetails || ''} en ${city}?`);

        for (let i = 0; i<= 2; i++) {
            const repeatGather = twiml.gather({
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/validation',
                method: 'POST',
                timeout: 3
            });
        
            repeatGather.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Marque el número 1, si está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.')
        }

        twiml.say({
            language: 'es-MX',
            voice: 'Polly.Mia-Neural'
        }, 'Nos pondremos en contacto con usted')
        
        const call = await twilio.calls.create({
            twiml: twiml.toString(),
            to: clientNumber,
            from: process.env.SUPPORT_NUMBER
        })

        changeData(userID, recordID, clientNumber, addressOne + ' - ' + addressDetails, undefined, call.sid)

        res.status(200).json({ userID: userID, SID: call.sid, recordID: recordID })
    } catch (error) {
        console.error(error)
        res.status(400).json({ error: error.message })
    }
})

router.post('/validation', async (req, res) => {
    try {
        const digitPressed = req.body.Digits

        const twiml = new VoiceResponse()

        switch (digitPressed) { 
            case '1':
                changeData(undefined, undefined, undefined, undefined, 'Confirm', undefined)

                await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Usted confirmó que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.')
                break;
            case '2':
                changeData(undefined, undefined, undefined, undefined, 'Change', undefined)

                await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData);                

                const gather = twiml.gather({
                    language: 'es-MX',
                    numDigits: 1,
                    action: 'https://call-api-phi.vercel.app/change-address',
                    method: 'POST'
                })

                gather.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                },`Usted indicó que su dirección es incorrecta, por favor:

                Marque 1 si autoriza que le escribamos por WhatsApp para el cambio de dirección. O marque 2 para confirmar la entrega en la dirección ${ userData.address }.`);

                twiml.pause({ length: 7 });
                break;
            default:
                console.log("There isn't data")
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
    
    const twiml = new VoiceResponse()

    switch(digitPressed) {
        case '1' :
            changeData(undefined, undefined, undefined, undefined, 'Change', undefined)        

            await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)

            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Nos pondremos en contacto con usted lo más pronto posible.');
            break;
        case '2':
            changeData(undefined, undefined, undefined, undefined, 'Confirm', undefined)   

            await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)

            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, `Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.`)
            break;
        default:
            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.');
            break;
    }
    res.type('text/xml').send(twiml.toString());
})
module.exports = router;