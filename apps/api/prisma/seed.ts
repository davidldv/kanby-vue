import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const POS_STEP = 1000;

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const demoUserId = process.env.DEMO_USER_ID ?? 'demo-user';

  const user = await prisma.user.upsert({
    where: { id: demoUserId },
    update: { name: 'Demo User' },
    create: { id: demoUserId, name: 'Demo User' },
  });

  const existingBoard = await prisma.board.findFirst({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: 'asc' },
  });

  if (existingBoard) return;

  const board = await prisma.board.create({
    data: {
      title: 'Demo Board',
      members: {
        create: [{ userId: user.id, role: 'OWNER' }],
      },
    },
  });

  const todo = await prisma.list.create({
    data: { boardId: board.id, title: 'To do', position: 1 * POS_STEP },
  });
  const doing = await prisma.list.create({
    data: { boardId: board.id, title: 'Doing', position: 2 * POS_STEP },
  });
  const done = await prisma.list.create({
    data: { boardId: board.id, title: 'Done', position: 3 * POS_STEP },
  });

  await prisma.card.createMany({
    data: [
      {
        listId: todo.id,
        title: 'Welcome to Kanby',
        description: 'Drag me around.',
        position: 1 * POS_STEP,
      },
      {
        listId: doing.id,
        title: 'Realtime updates',
        description: 'Open two tabs on the same board.',
        position: 1 * POS_STEP,
      },
      {
        listId: done.id,
        title: 'Undo actions',
        description: 'Try editing a card then undo.',
        position: 1 * POS_STEP,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
