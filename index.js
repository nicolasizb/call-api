const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const router = require('./server/routes');

const app = express();
const port = 3000;

function serverInit() {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(bodyParser.json())
  app.use(router);

  app.listen(port, "0.0.0.0", function () {
  });
}

serverInit();