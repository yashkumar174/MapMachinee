import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env explicitly to grab existing admin credentials
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const plainPassword = process.env.ADMIN_PASSWORD || 'password';

  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  if (existingAdmin) {
    console.log('Admin user already exists. Updating credentials to match environment variables...');
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        username: username,
        passwordHash: passwordHash,
      },
    });
    console.log(`Successfully updated super-admin: ${username}`);
    return;
  }

  await prisma.user.create({
    data: {
      username: username,
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Successfully seeded super-admin: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
