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
}

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
        const { userID, recordID, clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body;
        if (!userID || !recordID || !clientNumber || !addressOne || !city || !store || !firstName || !lastName) {
            throw new Error("Datos inválidos")
        }
        const twiml = new VoiceResponse();
        
        twiml.say({ 
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, `Hola ${firstName} ${lastName || ''}, lo llamamos de ${store} para confirmar su dirección de envío. ¿Es ${addressOne}, ${addressDetails || ''}, en ${city}?`)
        
        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://call-api-phi.vercel.app/validation',
            method: 'POST',
            timeout: 5
        })
        
        gather.say({
            language: 'es',
            voice: 'Polly.Mia-Neural',
        }, 'Marque el número 1, si está correcta la dirección. O marque el número 2, para cambiarla.')

        twiml.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, `Su dirección es ${addressOne}, ${addressDetails || ''}, en ${city}?`)

        for (let i = 0; i<= 2; i++) {
            const repeatGather = twiml.gather({
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/validation',
                method: 'POST',
                timeout: 5
            })
        
            repeatGather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Marque el número 1, si está correcta la dirección. O marque el número 2, para cambiarla.')
        }

        twiml.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, 'Usted alcanzó el límite de intentos, nos pondremos en contacto con usted pronto')
        
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
                // changeData(undefined, undefined, undefined, undefined, 'Confirm', undefined)
                // await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)
                twiml.say({
                    language: 'es',
                    voice: 'Polly.Mia-Neural'
                }, 'Usted confirmó que la dirección es correcta. Lo contactaremos por WhatsApp para confirmar la fecha de envío.')
                break;
            case '2':
                // changeData(undefined, undefined, undefined, undefined, 'Change', undefined)
                // await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData);                
                const gather = twiml.gather({
                    input: 'speech',
                    language: 'es-MX',
                    action: 'https://call-api-phi.vercel.app/change-address',
                    method: 'POST',
                    hints: [
                        'Tipo de vía (Calle, Carrera, Avenida, Diagonal)',
                        'Número de la vía',
                        'Letra (si aplica)',
                        'Número (si aplica)',
                        'Número de casa o apartamento',
                        'Carrera 7 # 14-68',
                        'Carrera 7 14 68',
                        'Carrera siete catorce sesenta y ocho',
                        'Calle 71A Bis # 14-68 Apto 201 Entre Carrera 7 y Carrera 9',
                        'Avenida Boyacá Cl 53 Sur # 72D',
                        'Avenida Boyacá Calle 53 Sur 72D',
                        'Avenida Boyacá 53 Sur 72D',
                        'Calle 127 Bis # 16-30 Int. 3',
                        'Calle 127 Bis 16 30 Int 3',
                        'Calle 127 Bis # 16-30 Interior 3',
                        'Calle 127 Bis 16 30 3',
                    ],
                    speechModel: 'phone_call',
                    speechTimeout: 'auto',                      
                    enhanced: true,
                    timeout: 10
                })
                gather.say({
                    language: 'es',
                    voice: 'Polly.Mia-Neural'
                },`Usted indicó que su dirección es incorrecta, por favor diga claro y despacio su dirección en 2 segundos`)
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
router.post('/change-address', async (req, res) => {
    const clientAddress = req.body.SpeechResult
    
    const twiml = new VoiceResponse()
    twiml.say({
        language: 'es',
        voice: 'Polly.Mia-Neural',
    }, `Su dirección es ${ clientAddress }?`)
    const gather =  twiml.gather({
        numDigits: '1',
        action: 'https://call-api-phi.vercel.app/change-address-two',
        method: 'POST',
    })
    gather.say({
        language: 'es',
        voice: 'Polly.Mia-Neural',
    }, 'Marque 1 si está correcta la dirección, Marque 2 para decirla de nuevo')

    // switch(speechResult) {
    //     case '1' :
    //         changeData(undefined, undefined, undefined, undefined, 'Change', undefined)        
    //         await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)
    //         twiml.say({
    //             language: 'es',
    //             voice: 'Polly.Mia-Neural'
    //         }, 'Nos pondremos en contacto con usted lo más pronto posible.');
    //         break;
    //     case '2':
    //         changeData(undefined, undefined, undefined, undefined, 'Confirm', undefined)   
    //         await axios.post('https://hooks.zapier.com/hooks/catch/18682335/3jauqjw/', userData)
    //         twiml.say({
    //             language: 'es',
    //             voice: 'Polly.Mia-Neural'
    //         }, `Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.`)
    //         break;
    //     default:
    //         twiml.say({
    //             language: 'es',
    //             voice: 'Polly.Mia-Neural'
    //         }, 'Opción no válida. Por favor, intenta de nuevo.');
    //         break;
    // }
    res.type('text/xml').send(twiml.toString());
})

router.post('/change-address-two', async (req,res) => {
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
            const gather = twiml.gather({
                input: 'speech',
                language: 'es-MX',
                action: 'https://call-api-phi.vercel.app/change-address-three',
                method: 'POST',
                hints: [
                    'Tipo de vía (Calle, Carrera, Avenida, Diagonal)',
                    'Número de la vía',
                    'Letra (si aplica)',
                    'Número (si aplica)',
                    'Número de casa o apartamento',
                    'Carrera 7 # 14-68',
                    'Carrera 7 14 68',
                    'Carrera siete catorce sesenta y ocho',
                    'Calle 71A Bis # 14-68 Apto 201 Entre Carrera 7 y Carrera 9',
                    'Avenida Boyacá Cl 53 Sur # 72D',
                    'Avenida Boyacá Calle 53 Sur 72D',
                    'Avenida Boyacá 53 Sur 72D',
                    'Calle 127 Bis # 16-30 Int. 3',
                    'Calle 127 Bis 16 30 Int 3',
                    'Calle 127 Bis # 16-30 Interior 3',
                    'Calle 127 Bis 16 30 3',
                ],
                speechModel: 'phone_call',
                speechTimeout: 'auto',                  
                enhanced: true,
                timeout: 10
            })
            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },`Rpita su dirección en 2 segundos`)
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

router.post('/change-address-three', (req, res) => {
    const clientAddress = req.body.SpeechResult
    
    const twiml = new VoiceResponse()
    twiml.say({
        language: 'es',
        voice: 'Polly.Mia-Neural',
    }, `Su dirección es ${ clientAddress }?`)
    const gather =  twiml.gather({
        numDigits: '1',
        action: 'https://call-api-phi.vercel.app/change-address-four',
        method: 'POST',
    })
    gather.say({
        language: 'es',
        voice: 'Polly.Mia-Neural',
    }, 'Marque 1 si está correcta la dirección, Marque 2 para decirla de nuevo')
    res.type('text/xml').send(twiml.toString())
})

router.post('/change-address-four', async (req,res) => {
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
            const gather = twiml.gather({
                input: 'speech',
                language: 'es-MX',
                action: 'https://call-api-phi.vercel.app/change-address-five',
                method: 'POST',
                hints: [
                    'Tipo de vía (Calle, Carrera, Avenida, Diagonal)',
                    'Número de la vía',
                    'Letra (si aplica)',
                    'Número (si aplica)',
                    'Número de casa o apartamento',
                    'Carrera 7 # 14-68',
                    'Carrera 7 14 68',
                    'Carrera siete catorce sesenta y ocho',
                    'Calle 71A Bis # 14-68 Apto 201 Entre Carrera 7 y Carrera 9',
                    'Avenida Boyacá Cl 53 Sur # 72D',
                    'Avenida Boyacá Calle 53 Sur 72D',
                    'Avenida Boyacá 53 Sur 72D',
                    'Calle 127 Bis # 16-30 Int. 3',
                    'Calle 127 Bis 16 30 Int 3',
                    'Calle 127 Bis # 16-30 Interior 3',
                    'Calle 127 Bis 16 30 3',
                ],
                speechModel: 'phone_call',
                speechTimeout: 'auto',                  
                enhanced: true,
                timeout: 10
            })
            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },`Repita su dirección en 2 segundos`)
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

router.post('/change-address-five', (req, res) => {
    const clientAddress = req.body.SpeechResult
    
    const twiml = new VoiceResponse()
    twiml.say({
        language: 'es',
        voice: 'Polly.Mia-Neural',
    }, `Su dirección es ${ clientAddress }?`)
    res.type('text/xml').send(twiml.toString())
})

module.exports = router;