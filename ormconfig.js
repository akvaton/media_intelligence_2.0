// https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server
module.exports = {
  type: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: process.env.DATABASE_NAME,
  username: 'root',
  password: 'root',
  entities: [
    __dirname + '/dist/**/*.entity{.ts,.js}',
    'node_modules/nestjs-admin/**/*.entity.js',
  ],
  // synchronize: true,
};
