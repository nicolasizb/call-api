const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

const express = require('express')
const axios = require('axios');
const router = express.Router()
const VoiceResponse = require('twilio').twiml.VoiceResponse

const accountSid = process.env.ACCOUNT_SID
const authToken = process.env.AUTH_TOKEN
const twilio = require('twilio')(accountSid, authToken)

let userData = {
    userID: '',
    number: '',
    address: '',
    digit: '',  
    callSID: '',
}

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

router.get('/read-db', async (req, res) => {
    try {
        const credentials = JSON.parse(process.env.GOO_CREDENTIALS)

        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly'
        })
    
        const sheets = google.sheets({ version: 'v4', auth })

        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: '1TwiU0Rv_Yt8oAEroYWMx5gfWxipM0XOYplMBcFGPlNc',
          range: 'Sheet1'
        })

        res.status(200).json(response.data.values)
    } catch (err) {
        console.error('The API returned an error: ', err);
        return []
    }
})

router.post('/write-db', async (req, res) => {
    try {
        const { range, valuesToUpdate } = req.body

        const credentials = JSON.parse(process.env.GOO_CREDENTIALS)
      
        const auth = new GoogleAuth({
            credentials: credentials,
            scopes: 'https://www.googleapis.com/auth/spreadsheets'
        })
    
        const sheets = google.sheets({ version: 'v4', auth })

        const response = await sheets.spreadsheets.values.update({
          spreadsheetId: '1TwiU0Rv_Yt8oAEroYWMx5gfWxipM0XOYplMBcFGPlNc',
          range: range,
          valueInputOption: 'RAW',
          resource: { values: valuesToUpdate }
        })

        res.status(200).json(`${response.data.updatedCells} cells updated.`)
    } catch (err) {
        console.error('An error occurred while trying to update the spreadsheet:', err)
    }
})

router.post('/call', async (req, res) => {    
    try {
        const twiml = new VoiceResponse()
        const { userID, clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body;

        if (!userID || !clientNumber || !addressOne || !city || !store || !firstName || !lastName) {
            throw new Error("Datos inválidos")
        }

        userData.address = addressOne + ' - ' + addressDetails + ' en ' + city

        twiml.say({ 
            language: 'es-MX',
            voice: 'Polly.Mia-Neural'
        }, `Hola ${firstName} ${lastName}, lo llamamos desde la tienda ${store} para confirmar la dirección de envío de su pedido. ¿Su dirección es ${addressOne} ${addressDetails || ''} en ${city}?`)
        
        const gather = twiml.gather({
            numDigits: 1,
            action: 'https://call-api-phi.vercel.app/validation',
            method: 'POST',
            timeout: 10
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
                timeout: 10
            });
        
            repeatGather.say({
                language: 'es-MX',
                voice: 'Polly.Mia-Neural'
            }, 'Marque el número 1, si está correcta. O marque el número 2 para repetir la dirección mencionada.')

            if(i === 2) {
                changeData(undefined, undefined, undefined, 'Change', undefined)        
            }
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

        changeData(userID, clientNumber, userData.address, undefined, call.sid)

        res.status(200).json({ userID: userID, SID: call.sid  })
    } catch (error) {
        console.error(error)
        res.status(400).json({ error: error.message })
    }
})

router.post('/validation', async (req, res) => {
    try {
        const digitPressed = '1'
        const twiml = new VoiceResponse()

        switch (digitPressed) { 
            case '1':
                changeData(undefined, undefined, undefined, 'Confirm', undefined)

                // await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vhsjyd/', userData)

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
                    timeout: 10
                })

                gather.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, `Marque el número 1, si está correcta. O marque el número 2 para cambiar dirección de envío.`)

                for (let i = 0; i<= 2; i++) {
                    twiml.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural'
                    }, `¿Su dirección es ${userData.address}?`)

                    const repeatGather = twiml.gather({
                        numDigits: 1,
                        action: 'https://call-api-phi.vercel.app/change-address',
                        method: 'POST',
                        timeout: 10
                    });
                
                    repeatGather.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural'
                    }, 'Marque el número 1, si está correcta. O marque el número 2 para cambiar dirección de envío.')
        
                    if(i === 2) {
                        changeData(undefined, undefined, undefined, 'Change', undefined)        
                    }
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Nos pondremos en contacto con usted por correo electrónico para confirmar su dirección.')
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
                        voice: 'Polly.Mia-Neural'
                    }, 'Opción no válida. Marque el número 1, si está correcta. O marque el número 2 para cambiar dirección de envío.')
                    
                    if(i === 2) {
                        changeData(undefined, undefined, undefined, 'Change', undefined)        
                    }
                }
                
                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Nos pondremos en contacto con usted por correo electrónico para confirmar su dirección.')
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
                changeData(undefined, undefined, undefined, 'Confirm', undefined)        
        
                await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vhsjyd/', userData)
        
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
                    timeout: 10
                })
            
                gather.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, `Marque 1 para autorizar que lo contactemos al correo electrónico para cambiar la dirección. O marque 2 para confirmar que la dirección nombrada es correcta.`)

                for (let i = 0; i<= 2; i++) {
                    const repeatGather = twiml.gather({
                        numDigits: 1,
                        action: 'https://call-api-phi.vercel.app/filter',
                        method: 'POST',
                        timeout: 10
                    });
                
                    repeatGather.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural'
                    }, 'Marque 1 para autorizar que lo contactemos al correo electrónico para cambiar la dirección. O marque 2 para confirmar que la dirección nombrada es correcta.')
        
                    if(i === 2) {
                        changeData(undefined, undefined, undefined, 'Change', undefined)        
                    }
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Nos pondremos en contacto con usted por correo electrónico para confirmar su dirección.')
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
                        voice: 'Polly.Mia-Neural'
                    }, 'Opción no válida. Marque 1 para autorizar que lo contactemos al correo electrónico. O marque 2 para confirmar que la dirección nombrada es correcta.')
                    
                    if(i === 2) {
                        changeData(undefined, undefined, undefined, 'Change', undefined)        
                    }
                }
                
                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Nos pondremos en contacto con usted por correo electrónico para confirmar su dirección.')
            
                break;
        }
    res.type('text/xml').send(twiml.toString())
    } catch (error) {
        console.error(error);       
        res.status(400).json({ error: error.message });
    }    
})

router.post('/send-email', async(req, res) => {
    try {
        const digitPressed = req.body.Digits
        const twiml = new VoiceResponse()

        switch(digitPressed) {
            case '1':
                changeData(undefined, undefined, undefined, 'Change', undefined)        

                await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vhsjyd/', userData)

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Nos pondremos en contacto con usted por correo electrónico para confirmar su dirección.')

                break;
            case '2':
                changeData(undefined, undefined, undefined, 'Confirm', undefined)        

                await axios.post('https://hooks.zapier.com/hooks/catch/18861658/3vhsjyd/', userData)

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Usted confirmó que la dirección es correcta, gracias por su respuesta. ¡Hasta luego!');
                break;
            default:
                for (let i = 0; i<= 2; i++) {
                    const gather = twiml.gather({
                        numDigits: 1,
                        action: 'https://call-api-phi.vercel.app/send-email',
                        method: 'POST',
                        timeout: 8
                    })
                
                    gather.say({
                        language: 'es-MX',
                        voice: 'Polly.Mia-Neural'
                    }, 'Opción no válida. Marque 1 para autorizar que lo contactemos al correo electrónico. O marque 2 para confirmar que la dirección nombrada es correcta.')

                    if(i === 2) {
                        changeData(undefined, undefined, undefined, 'Change', undefined)        
                    }
                }

                twiml.say({
                    language: 'es-MX',
                    voice: 'Polly.Mia-Neural'
                }, 'Nos pondremos en contacto con usted por correo electrónico para confirmar su dirección.')
                break;
        }
    res.type('text/xml').send(twiml.toString())
    } catch (error) {
        console.error(error);       
        res.status(400).json({ error: error.message });
    } 
})

module.exports = router;