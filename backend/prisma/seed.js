"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = await bcryptjs_1.default.hash("password", 10);
    const users = [];
    for (let i = 1; i <= 5; i++) {
        const user = await prisma.user.create({
            data: {
                name: `User${i}`,
                email: `user${i}@example.com`,
                passwordHash,
            },
        });
        users.push(user);
    }
    const group = await prisma.group.create({
        data: {
            name: "Test Group",
            inviteCode: "INVITE123",
            ownerId: users[0].id,
            members: {
                create: users.map((u, idx) => ({ userId: u.id, role: idx === 0 ? "OWNER" : "MEMBER" }))
            }
        }
    });
    const plan = await prisma.plan.create({
        data: {
            groupId: group.id,
            title: "Movie Night",
            type: "MOVIE",
            status: "VOTING",
            createdBy: users[0].id
        }
    });
    // add polls and options
    const placePoll = await prisma.poll.create({ data: { planId: plan.id, category: "PLACE" } });
    await prisma.pollOption.createMany({ data: [
            { pollId: placePoll.id, label: "Cinema", sortOrder: 1 },
            { pollId: placePoll.id, label: "Home", sortOrder: 2 }
        ] });
    const timePoll = await prisma.poll.create({ data: { planId: plan.id, category: "TIME" } });
    await prisma.pollOption.createMany({ data: [
            { pollId: timePoll.id, label: "7 PM", sortOrder: 1 },
            { pollId: timePoll.id, label: "9 PM", sortOrder: 2 }
        ] });
    // votes
    await prisma.vote.create({ data: { pollId: placePoll.id, optionId: 1, userId: users[0].id } });
    await prisma.vote.create({ data: { pollId: timePoll.id, optionId: 3, userId: users[1].id } });
    // expense
    const expense = await prisma.expense.create({
        data: {
            planId: plan.id,
            paidBy: users[0].id,
            amount: 1000,
            category: "Food",
            splits: {
                create: users.map(u => ({ userId: u.id, shareAmount: 200 }))
            }
        }
    });
    console.log("Seed data created");
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
