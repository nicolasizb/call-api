const express = require('express');
const router = express.Router();
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const twilio = require('twilio')(accountSid, authToken);

let addressGlobal = ''

function changeAddress(newAddress) {
    addressGlobal = newAddress
}

router.get('/', (req, res) => {
    res.status(200).json({ res: "Todo bien" });
});

router.post('/call', async (req, res) => {    
    try {
        const { clientNumber, addressOne, addressDetails, city, store, firstName, lastName } = req.body;
        if (!clientNumber || !addressOne || !city || !store || !firstName || !lastName) {
            throw new Error("Datos inválidos");
        }

        changeAddress(`${addressOne} ${addressDetails}`);

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

        const twimlXml = twiml.toString();

        await twilio.calls.create({
            twiml: twimlXml,
            to: clientNumber,
            from: process.env.SUPPORT_NUMBER
        });

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Timeout waiting for call completion."));
            }, 120000); 

            const pollStatus = async () => {
                try {
                    const call = await twilio.calls.list({ to: clientNumber, limit: 1 });
                    if (call && call.length > 0 && call[0].status === 'completed') {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        setTimeout(pollStatus, 2000); // Volver a verificar el estado cada 2 segundos
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            };

            pollStatus();
        });

        res.status(200).json({ address: addressGlobal });
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
                hints: 'Di tu dirección, por favor.',
                timeout: 10 
            });

            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },'Usted indicó que su dirección es incorrecta, por favor dicte su dirección de envío después de 2 segundos');

            twiml.pause({ length: 10 });
            twiml.redirect('https://call-api-phi.vercel.app/change-address');

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

        changeAddress(clientAddress)

        const twiml = new VoiceResponse();
    
        const gather = twiml.gather({
            numDigits: 1,
            action: `https://call-api-phi.vercel.app/validator-attempt-two`,
            method: 'POST',
        });
    
        gather.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, `Usted indicó la dirección ${ addressGlobal }, marque el número 1, para confirmar que está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.`);
    
        res.type('text/xml').send(twiml.toString())
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/validator-attempt-two', async (req, res) => {
    const digitPressed = req.body.Digits;

    const twiml = new VoiceResponse();

    switch (digitPressed) { 
        case '1':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, `Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.`);

            break;
        case '2':
            const gather = twiml.gather({
                language: 'es-MX',
                input: 'speech dtmf',
                speechTimeout: 'auto',
                numDigits: 1,
                action: `https://call-api-phi.vercel.app/validator-attempt-three`,
                method: 'POST',
                hints: 'Di tu dirección, por favor.',
                timeout: 10 
            });

            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },`Usted indicó que la dirección es incorrecta, por favor dicte de nuevo su dirección de envío`);

            twiml.pause({ length: 10 });
            twiml.redirect('https://call-api-phi.vercel.app/change-address');

            break;
        default:
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.');
            break;
    }
    res.type('text/xml').send(twiml.toString())
});


router.post('/validator-attempt-three', async (req, res) => {
    try {
        const clientAddress = req.body.SpeechResult;

        changeAddress(clientAddress)
    
        const twiml = new VoiceResponse();
    
        const gather = twiml.gather({
            numDigits: 1,
            action: `https://call-api-phi.vercel.app/validator-attempt-four`,
            method: 'POST',
            timeout: 10
        });
    
        gather.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, `Usted indicó la dirección ${ addressGlobal }, marque el número 1, para confirmar que está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.`);
    
        res.type('text/xml').send(twiml.toString())
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/validator-attempt-four', async (req, res) => {
    const digitPressed = req.body.Digits;

    const twiml = new VoiceResponse();

    switch (digitPressed) { 
        case '1':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, `Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.`);
            break;
        case '2':
            const gather = twiml.gather({
                language: 'es-MX',
                input: 'speech dtmf',
                speechTimeout: 'auto',
                numDigits: 1,
                action: `https://call-api-phi.vercel.app/validator-attempt-five`,
                method: 'POST',
                hints: 'Di tu dirección, por favor.',
                timeout: 10 
            });

            gather.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },`Usted indicó que la dirección es incorrecta, por favor dicte de nuevo su dirección de envío`);

            twiml.pause({ length: 10 });
            twiml.redirect('https://call-api-phi.vercel.app/change-address');

            break;
        default:
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.');
            break;
    }
    res.type('text/xml').send(twiml.toString())
});

router.post('/validator-attempt-five', async (req, res) => {
    try {
        const clientAddress = req.body.SpeechResult;

        changeAddress(clientAddress)
    
        const twiml = new VoiceResponse();
    
        const gather = twiml.gather({
            numDigits: 1,
            action: `https://call-api-phi.vercel.app/validator-end`,
            method: 'POST',
            timeout: 10
        });
    
        gather.say({
            language: 'es',
            voice: 'Polly.Mia-Neural'
        }, `Usted indicó la dirección ${ addressGlobal }, marque el número 1, para confirmar que está correcta la dirección. O marque el número 2, para cambiar la dirección de envío de su pedido.`);
    
        res.type('text/xml').send(twiml.toString())
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

router.post('/validator-end', async (req, res) => {
    const digitPressed = req.body.Digits;
    const clientAddress = req.query.SpeechResult;

    const twiml = new VoiceResponse();

    switch (digitPressed) { 
        case '1':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, `Usted acaba de confirmar que la dirección mencionada es correcta, nos pondremos en contacto con usted por WhatsApp para confirmar fecha de envío.`);
            break;
        case '2':
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            },`Usted indicó que la dirección mencionada es incorrecta, una persona se comunicará con usted pronto para confirmar la dirección de envío`);
            break;
        default:
            twiml.say({
                language: 'es',
                voice: 'Polly.Mia-Neural'
            }, 'Opción no válida. Por favor, intenta de nuevo.');
            break;
    }
    res.type('text/xml').send(twiml.toString())
});

module.exports = router;
