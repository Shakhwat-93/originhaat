import pg from 'pg';
const { Client } = pg;

async function tryConnect(password) {
  const client = new Client({
    host: '187.77.131.65',
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    console.log(`Successfully connected with password: "${password}"`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed to connect with password "${password}":`, err.message);
    return false;
  }
}

async function main() {
  const passwords = [
    'postgres',
    'your-super-secret-and-long-postgres-password',
    'admin123',
    'admin',
  ];

  for (const pw of passwords) {
    const ok = await tryConnect(pw);
    if (ok) return;
  }
}

main().catch(console.error);
