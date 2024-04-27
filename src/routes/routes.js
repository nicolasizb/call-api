const { Router } = require('express')
const router = Router()


router.get('/test', (req, res) => {
    res.status(200).json('ALL GOOD')
})

router.get('/yes', (req, res) => {
    res.status(200).json('yess')
})

module.exports = router