// https://stackoverflow.com/questions/50093144/mysql-8-0-client-does-not-support-authentication-protocol-requested-by-server
const {
  username,
  password,
  hostname: host,
  pathname,
  port,
} = new URL(process.env.DATABASE_URL);

module.exports = {
  type: process.env.DATABASE_TYPE,
  host,
  port: +port,
  database: pathname.replace('/', ''),
  username,
  password,
  entities: [
    __dirname + '/dist/**/*.entity{.ts,.js}',
    'node_modules/nestjs-admin/**/*.entity.js',
  ],
  synchronize: true,
  extra: {
    ssl: true,
    encrypt: true,
  },
};
