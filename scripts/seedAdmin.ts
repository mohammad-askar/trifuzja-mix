// scripts/seedAdmin.ts
import clientPromise from '@/types/mongodb';
import bcrypt from 'bcryptjs';

(async () => {
  const client = await clientPromise;
  const users  = client.db('trifuzja').collection('admin');

  const email = process.env.ADMIN_EMAIL!;
  const pass  = process.env.ADMIN_PASSWORD!;

  const exists = await users.findOne({ email: email.toLowerCase() });
  if (exists) {
    console.log('🟡 Admin already exists');
    return process.exit(0);
  }

  await users.insertOne({
    email:    email.toLowerCase(),
    password: await bcrypt.hash(pass, 10),
    name:     'Super Admin',
  });

  console.log('✅ Admin created');
  process.exit(0);
})();
