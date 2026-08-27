import { PrismaClient, role_code } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = '12341234';

const seedUsers = [
  { email: 'admin@gmail.com', full_name: 'Admin', roles: [role_code.ADMIN] },
  { email: 'user1@gmail.com', full_name: 'User One', roles: [role_code.USER] },
  { email: 'user2@gmail.com', full_name: 'User Two', roles: [role_code.USER] },
  {
    email: 'user3@gmail.com',
    full_name: 'User Three',
    roles: [role_code.USER],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const roleRecords = new Map<role_code, string>();
  for (const code of Object.values(role_code)) {
    const role = await prisma.roles.upsert({
      where: { code },
      update: {},
      create: { code, name: code },
    });
    roleRecords.set(code, role.id);
  }

  for (const seedUser of seedUsers) {
    const user = await prisma.users.upsert({
      where: { email: seedUser.email },
      update: {},
      create: {
        username: seedUser.email,
        email: seedUser.email,
        password_hash: passwordHash,
        full_name: seedUser.full_name,
      },
    });

    for (const code of seedUser.roles) {
      const roleId = roleRecords.get(code)!;
      await prisma.user_roles.upsert({
        where: { user_id_role_id: { user_id: user.id, role_id: roleId } },
        update: {},
        create: { user_id: user.id, role_id: roleId },
      });
    }

    console.log(`Seeded user: ${user.email} [${seedUser.roles.join(', ')}]`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
