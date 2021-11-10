// eslint-disable-next-line @typescript-eslint/no-var-requires

module.exports = {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  database: process.env.DATABASE_NAME,
  username: 'root',
  entities: [
    'dist/**/*.entity{.ts,.js}',
    'node_modules/nestjs-admin/**/*.entity.js',
  ],
  // migrations: [join(__dirname, 'src', '/migrations/*{.ts,.js}')],
  // cli: {
  //   migrationsDir: 'src/migrations',
  // },
  synchronize: true,
};
