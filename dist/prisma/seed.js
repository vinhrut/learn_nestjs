"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const DEFAULT_PASSWORD = '12341234';
const seedUsers = [
    { email: 'admin@gmail.com', full_name: 'Admin', roles: [client_1.role_code.ADMIN] },
    { email: 'user1@gmail.com', full_name: 'User One', roles: [client_1.role_code.USER] },
    { email: 'user2@gmail.com', full_name: 'User Two', roles: [client_1.role_code.USER] },
    {
        email: 'user3@gmail.com',
        full_name: 'User Three',
        roles: [client_1.role_code.USER],
    },
];
async function main() {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const roleRecords = new Map();
    for (const code of Object.values(client_1.role_code)) {
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
            const roleId = roleRecords.get(code);
            await prisma.user_roles.upsert({
                where: { user_id_role_id: { user_id: user.id, role_id: roleId } },
                update: {},
                create: { user_id: user.id, role_id: roleId },
            });
        }
        console.log(`Seeded user: ${user.email} [${seedUser.roles.join(', ')}]`);
    }
    const admin = await prisma.users.findUnique({
        where: { email: 'admin@gmail.com' },
        select: { id: true },
    });
    if (admin) {
        const seedProjects = [
            { code: 'PRJ-A', name: 'Project A' },
            { code: 'PRJ-B', name: 'Project B' },
            { code: 'PRJ-C', name: 'Project C' },
        ];
        for (const seedProject of seedProjects) {
            const project = await prisma.projects.upsert({
                where: { code: seedProject.code },
                update: {},
                create: {
                    code: seedProject.code,
                    name: seedProject.name,
                    owner_id: admin.id,
                },
            });
            console.log(`Seeded project: ${project.code} -> ${project.id}`);
        }
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
//# sourceMappingURL=seed.js.map