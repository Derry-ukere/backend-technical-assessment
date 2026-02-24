const http              = require('http');
const express           = require('express');
const cors              = require('cors');
const { swaggerUi, specs } = require('../docs/swagger.config');
const app               = express();

module.exports = class UserServer {
    constructor({config, managers}){
        this.config        = config;
        this.userApi       = managers.userApi;
    }
    
    /** for injecting middlewares */
    use(args){
        app.use(args);
    }

    /** server configs */
    run(){
        app.use(cors({origin: '*'}));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true}));
        app.use('/static', express.static('public'));

        /** Swagger API Documentation */
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'School Management API Documentation'
        }));

        /** Swagger JSON spec endpoint */
        app.get('/api-docs.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(specs);
        });

        /** Health check endpoint for Docker/Kubernetes */
        app.get('/api/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: this.config.dotEnv.SERVICE_NAME || 'school-management-api',
                uptime: process.uptime()
            });
        });

        /** an error handler */
        app.use((err, req, res, next) => {
            console.error(err.stack)
            res.status(500).send('Something broke!')
        });
        
        /** a single middleware to handle all */
        app.all('/api/:moduleName/:fnName', this.userApi.mw);

        let server = http.createServer(app);
        server.listen(this.config.dotEnv.USER_PORT, () => {
            console.log(`${(this.config.dotEnv.SERVICE_NAME).toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`);
            console.log(`API Documentation available at: http://localhost:${this.config.dotEnv.USER_PORT}/api-docs`);
        });
    }
}