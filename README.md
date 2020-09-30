## Marketplace worker
### FLIP API ID


Story: a user want to withdraw his/her money from an online marketplace

### Feature
- validation
- transfer
- get detail transfer
- get history transaction
- get profile user and saldo

### Introduction
by our case, i make 2 services to handle it. this is not microservices, but i can say, mini-mini-microservices.
1. marketplace
2. marketplace_worker

* *marketplace* => is to handling user request into flip server, info transaction, saldo and transaction history.
* *marketplace_worker* => is to handling user's transaction status and update saldo

those services should be running together.

### Schema

there are 4 collections/tables;

- users
- users_saldo
- transactions
- transactions_flip

below is the flow of collections design;

                `users_saldo`   -->                 <--     `transactions`
                                        `user`                    |
                                                    <--      `transactions_flip`


### Prerequisites

What things you need to install the software and how to install them

* [NODE JS](https://nodejs.org/) - JavaScript runtime environment
* [Express](https://expressjs.com/) - The web framework used
* [Needle Js](https://github.com/tomas/needle) - The leanest and most handsome HTTP client in the Nodelands.
* [amqplib](https://github.com/squaremo/amqp.node) - The Node.Js AMPQ client
* [MongoDB](http://mongodb.github.io/node-mongodb-native/) - MongoDB Node.JS Driver
* [AJV](https://github.com/ajv-validator/ajv) - A JSON Schema Validator
* [winston](https://github.com/winstonjs/winston) - A logger to monitoring about everything.

for service *`marketplace_worker`*, we dont need to use `express`. this service used ` Advanced Message Queuing Protocol`, *`RabbitMq`*.
This service is running in the `foreground`


### Installing , Running and Monitoring

```sh
git clone
npm install --save
npm start
```
to monitoring every user's requests, you can simply run command:

```sh
tail -f var/log/logFlipApi.log
```

The default path for config file is `./configs/config.***.dev.ini`, you can explicitly add config file in `--config` or `-c` argument.

### Configuring

```ini
[app]
host	= 0.0.0.0
port	= 2020

; log Configuration
[log]
path    	= var/log/
level 	    = debug
filename    = logFlipApi

[flipapi]
sc          = HyzioY7LP6ZoO7nTYKbG8O4ISkyWnX1JvAEVAhtWKZumooCzqp41
url         = https://nextar.flip.id/

[mongodb]
url                             = mongodb://localhost:27017/marketplace
database                        = marketplace
collection_users                = users
collection_users_saldo          = users_saldo
collection_transactions_flip    = transactions_flip
collection_transactions         = transactions
; interval in millisecond
interval = 5000

[queue]
host                = amqp://guest:guest@localhost:5672
queName             = trx_worker_dev
```

### Deployment

This app has `Dockerfile` to deploy it in docker system. Build image and run it as a container:

```sh
docker build --tag marketplace
docker run --rm marketplace
```

### API AND URI

by default, the response each request will get response:

```JSON
{
    "status": "Boolean",
    "message": "String",
    "data": "Object || Array"
}
```

> ### _**LIST URI**_

* *POST*    /api/flip/ping

> `to check if this service is online (StatusCode: 200) or not (StatusCode: 500). `

* *POST*    `/api/flip/disbursement/create`

> `uri to transfer`

`body example:`
```JSON
{
    "uuid": "4e1f8b22-5190-455a-940b-39b8dae532d9",
    "username": "mrbontor",
    "data": {
        "transaction": {
            "account_number": "1234567890",
            "bank_code": "bni",
            "amount": 10000,
            "remark": "test dulu"
        }
    }
}
```

* *GET*    `/api/flip/disbursement/id/:id`

> ` this uri mean to get detail transaction from flip server by id transaction`

`body example:`

```
params : 489691015
```

* *GET*   ` /api/user/detail/:username`

> ` this uri mean to get detail about user and saldo user by username`

`body example:`

```
params : mrbontor
```

* *GET*    `/api/trx/:username`

> ` this uri mean to get list history transaction user and saldo user by username`

`body example:`

```
params : mrbontor
```

### Acknowledgments

* FLIP ID
