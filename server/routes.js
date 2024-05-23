const express = require('express')
const axios = require('axios');
const router = express.Router()
const VoiceResponse = require('twilio').twiml.VoiceResponse

const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN
const twilio = require('twilio')(accountSid, authToken)

let userData = {
    userID: '',
    store: '',
    number: '',
    address: '',
    city: '',
    digit: '',  
    callSID: '',
};

function changeData(userID, number, address, city, digit, callSID) {
    if (typeof userID !== 'undefined') {
        userData.userID = userID
    }
    if (typeof store !== 'undefined') {
        userData.store = store
    }
    if (typeof number !== 'undefined') {
        userData.number = number
    }
    if (typeof address !== 'undefined') {
        userData.address = address
    }
    if (typeof city !== 'undefined') {
        userData.city = city
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
        const twiml = new VoiceResponse()

        const { userID, clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body;
        if (!userID || !clientNumber || !addressOne || !city || !store || !firstName || !lastName) {
            throw new Error("Datos inválidos")
        }

        twiml.pause({ length: 1 });

        twiml.say({ 
            language: 'es-MX',
            voice: 'Polly.Mia-Neural',
            rate: 'slow'
        }, `Hola ${firstName} ${lastName}, lo llamamos desde la tienda ${store} para confirmar la dirección de envío de su pedido. ¿Su dirección es ${addressOne}, ${addressDetails || ''} en ${city}?`)
        
        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://call-api-phi.vercel.app/validation',
            method: 'POST',
            timeout: 10
        });
        
        gather.say({
            language: 'es-MX',
            voice: 'Polly.Mia-Neural',
            rate: 'slow'
        }, 'Marque el número 1, si está correcta la dirección. O marque el número 2 para repetirla.')

        for (let i = 0; i<= 2; i++) {
            twiml.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural',
                rate: 'slow'
            }, `Su dirección es ${addressOne} ${addressDetails || ''} en ${city}?`);

            const repeatGather = twiml.gather({
                numDigits: 1,
                action: 'https://call-api-phi.vercel.app/validation',
                method: 'POST',
                timeout: 10
            });
        
            repeatGather.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Marque el número 1, si está correcta. O marque el número 2 para repetir la dirección.')

            if(i === 2) {
                changeData(undefined, undefined, undefined, undefined, undefined, 'Cambiar', undefined)
            }
        }
        twiml.say({
            language: 'es-MX',
            voice: 'Polly.Mia-Neural',
            rate: 'slow'
        }, 'Nos pondremos en contacto con usted por whatsapp para confirmar su dirección.')
        
        const call = await twilio.calls.create({
            twiml: twiml.toString(),
            to: clientNumber,
            from: process.env.SUPPORT_NUMBER
        })

        changeData(userID, store, clientNumber, addressOne + ', ' + addressDetails, city, undefined, call.sid)

        console.log(userData)

        res.status(200).json({ userID: userID, SID: call.sid  })
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
                changeData(undefined, undefined, undefined, undefined, undefined, 'Confirmado', undefined)        

                if(userData.store === 'Velez') {
                    await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vks138/', userData)
                } else if (userData.store === 'Will') {
                    await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vq7qsy/', userData)
                } else {
                    console.error('Not found store')
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Usted confirmó que la dirección mencionada es correcta, gracias por su respuesta. ¡Hasta luego!')
                break;
            case '2':
                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, `Su dirección es ${userData.address} en ${userData.city}?`)

                const gather = twiml.gather({
                    numDigits: 1,
                    action: 'https://call-api-phi.vercel.app/change-address',
                    method: 'POST',
                    timeout: 10
                })

                gather.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, `Marque el número 1, si está correcta. O marque el número 2 para cambiar dirección de envío.`)

                for (let i = 0; i<= 2; i++) {
                    twiml.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural',
                        rate: 'slow'
                    }, `Su dirección es ${userData.address} en ${userData.city}?`)

                    const repeatGather = twiml.gather({
                        numDigits: 1,
                        action: 'https://call-api-phi.vercel.app/change-address',
                        method: 'POST',
                        timeout: 10
                    });
                
                    repeatGather.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural',
                        rate: 'slow'
                    }, 'Marque el número 1, si está correcta. O marque el número 2 para cambiar dirección de envío.')
        
                    if(i === 2) {
                        changeData(undefined, undefined, undefined, undefined, undefined, 'Cambiar', undefined)       
                    }
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Nos pondremos en contacto con usted por whatsapp para confirmar su dirección.')
                break;
            default:
                for (let i = 0; i<= 2; i++) {
                    const gather = twiml.gather({
                        numDigits: 1,
                        action: 'https://call-api-phi.vercel.app/validation',
                        method: 'POST',
                        timeout: 8
                    })
                
                    gather.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural',
                        rate: 'slow'
                    }, 'Opción no válida. Marque el número 1, si está correcta. O marque el número 2 para cambiar dirección de envío.')
                    
                    if(i === 2) {
                        changeData(undefined, undefined, undefined, undefined, undefined, 'Cambiar', undefined)       
                    }
                }
                
                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Nos pondremos en contacto con usted por whatsapp para confirmar su dirección.')
                break;
        }        
        res.type('text/xml').send(twiml.toString());
    } catch (error) {
        console.error(error);       
        res.status(400).json({ error: error.message });
    }    
});

router.post('/change-address', async (req, res) => {
    try {
        const digitPressed = req.body.Digits
        const twiml = new VoiceResponse()
        
        switch(digitPressed) {
            case '1' :
                changeData(undefined, undefined, undefined, undefined, undefined, 'Confirmado', undefined)       
                
                if(userData.store === 'Velez') {
                    await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vks138/', userData)
                } else if (userData.store === 'Will') {
                    await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vq7qsy/', userData)
                } else {
                    console.error('Not found store')
                }
        
                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Usted confirmó que la dirección mencionada es correcta. ¡Hasta luego!');
                break;
            case '2':
                const gather = twiml.gather({
                    numDigits: 1,
                    action: 'https://call-api-phi.vercel.app/send-message',
                    method: 'POST',
                    timeout: 10
                })
            
                gather.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, `Marque 1 para autorizar que lo contactemos al whatsapp para cambiar la dirección. O marque 2 para confirmar que la dirección ${userData.address} es correcta.`)

                for (let i = 0; i<= 2; i++) {
                    const repeatGather = twiml.gather({
                        numDigits: 1,
                        action: 'https://call-api-phi.vercel.app/send-message',
                        method: 'POST',
                        timeout: 10
                    });
                
                    repeatGather.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural',
                        rate: 'slow'
                    }, 'Marque 1 para autorizar que lo contactemos al whatsapp para cambiar la dirección. O marque 2 para confirmar que la dirección nombrada es correcta.')
        
                    if(i === 2) {
                        changeData(undefined, undefined, undefined, undefined, undefined, 'Cambiar', undefined)       
                    }
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Nos pondremos en contacto con usted por whatsapp para confirmar su dirección.')
                break;
            default:
                for (let i = 0; i<= 2; i++) {
                    const gather = twiml.gather({
                        numDigits: 1,
                        action: 'https://call-api-phi.vercel.app/change-address',
                        method: 'POST',
                        timeout: 8
                    })
                
                    gather.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural',
                        rate: 'slow'
                    }, 'Opción no válida. Marque 1 para autorizar que lo contactemos al whatsapp. O marque 2 para confirmar que la dirección nombrada es correcta.')
                    
                    if(i === 2) {
                        changeData(undefined, undefined, undefined, undefined, undefined, 'Cambiar', undefined)       
                    }
                }
                
                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Nos pondremos en contacto con usted por whatsapp para confirmar su dirección.')
            
                break;
        }
    res.type('text/xml').send(twiml.toString())
    } catch (error) {
        console.error(error);       
        res.status(400).json({ error: error.message });
    }    
})

router.post('/send-message', async(req, res) => {
    try {
        const digitPressed = req.body.Digits
        const twiml = new VoiceResponse()

        switch(digitPressed) {
            case '1':
                changeData(undefined, undefined, undefined, undefined, undefined, 'Cambiar', undefined)       
                
                if(userData.store === 'Velez') {
                    await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vks138/', userData)
                } else if (userData.store === 'Will') {
                    await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vq7qsy/', userData)
                } else {
                    console.error('Not found store')
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Nos pondremos en contacto con usted por whatsapp para confirmar su dirección.')

                break;
            case '2':
                changeData(undefined, undefined, undefined, undefined, undefined, 'Confirmado', undefined)       
                
                if(userData.store === 'Velez') {
                    await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vks138/', userData)
                } else if (userData.store === 'Will') {
                    await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vq7qsy/', userData)
                } else {
                    console.error('Not found store')
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Usted confirmó que la dirección es correcta, gracias por su respuesta. ¡Hasta luego!');
                break;
            default:
                for (let i = 0; i<= 2; i++) {
                    const gather = twiml.gather({
                        numDigits: 1,
                        action: 'https://call-api-phi.vercel.app/send-message',
                        method: 'POST',
                        timeout: 8
                    })
                
                    gather.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural',
                        rate: 'slow'
                    }, 'Opción no válida. Marque 1 para autorizar que lo contactemos al whatsapp. O marque 2 para confirmar que la dirección nombrada es correcta.')

                    if(i === 2) {
                        changeData(undefined, undefined, undefined, undefined, undefined, 'Cambiar', undefined)       
                    }
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural',
                    rate: 'slow'
                }, 'Nos pondremos en contacto con usted por whatsapp para confirmar su dirección.')
                break;
        }
    res.type('text/xml').send(twiml.toString())
    } catch (error) {
        console.error(error);       
        res.status(400).json({ error: error.message });
    } 
})

module.exports = router;