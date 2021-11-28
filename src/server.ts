import * as config from './config/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import https from 'https';
import http from 'http';
import fs from 'fs';
import compression from 'compression'; 
import {SignalingServer} from './signalingServer';

const Vpath = path.join(__dirname, '/app/views/');

const app = express();

var corsOptions = {
    origin: [`wss://${config.default.HOSTNAME}:*`, `https://${config.default.HOSTNAME}:*`, `http://${config.default.HOSTNAME}:*`]
};
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src":["'self'"],
      "script-src":[ "'unsafe-inline'", "'self'", "http:", "https:"],// "'strict-dynamic'","'nonce-0'"],
      "img-src":["https:", "data:","blob:","unsafe:", "'self'"],
      "style-src": ["'self'","'unsafe-inline'"],
      "worker-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      //"require-trusted-types-for": ["'script'"],
    }
  },
  hidePoweredBy: true,
  noSniff: true,
  
}));
app.use(compression());
app.use(cors(corsOptions));

//parse application/json
app.use(express.json());

//parse application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true}));



//Actual server stuff

//Paths
app.use(express.static(Vpath));
app.use('/public/defaults', express.static(path.join(__dirname, 'app/public/defaults')));
app.use((req, res, next) => {
  res.send('<p>no</p>');
});

const PORT = config.default.PORT;
var serv;

if(config.default.RUN_HTTPS){
    var httpsOptions = {
        key: fs.readFileSync(config.default.CERT.KEY_PATH),
        cert: fs.readFileSync(config.default.CERT.CERT_PATH)
      };
    serv = https.createServer(httpsOptions, app);

}
else{
  serv = http.createServer(app);

}
new SignalingServer(serv);
serv.listen(PORT, () => {
  console.log(`HTTP${config.default.RUN_HTTPS?'S':''} server started on port ${PORT}`);
})