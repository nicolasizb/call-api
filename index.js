const cors = require('cors');
const express = require('express');
require('dotenv').config();

const router = require('./server/routes/routes.js');

const app = express();
const port = 3000;

function serverInit() {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(router);

  app.listen(port, "0.0.0.0", function () {
    // ...
  });

  // console.log("Server is alive!!");
}

serverInit();
