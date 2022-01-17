# Description

The project is created using Node.js [Nest](https://github.com/nestjs/nest) framework.

## Requirements

1. Node.js >=16
2. Yarn
3. SQL Database (see ormconfig.js, current entities are created for Azure SQL database, but it is possible to change it.
   For details, consult [TypeORM](https://typeorm.io/) docs)
4. [Redis](https://redis.io/)

# Development

`cp .env.example .env`

Then set your own env variables

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```
