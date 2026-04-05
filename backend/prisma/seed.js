import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Check if already seeded
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log("Database already seeded. Skipping...");
    return;
  }

  // Hash passwords
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // 1. Create Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      username: "superadmin",
      password: adminPassword,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      language: "en",
    },
  });
  console.log("Created Super Admin:", superAdmin.username);

  // 2. Create Admin (created by Super Admin)
  const admin1 = await prisma.user.create({
    data: {
      username: "admin1",
      password: adminPassword,
      name: "Admin One",
      role: "ADMIN",
      createdById: superAdmin.id,
      language: "en",
    },
  });
  console.log("Created Admin:", admin1.username);

  // 3. Create Users (created by Admin)
  const user1 = await prisma.user.create({
    data: {
      username: "user1",
      password: userPassword,
      name: "User One",
      role: "USER",
      createdById: admin1.id,
      language: "en",
    },
  });
  console.log("Created User:", user1.username);

  const user2 = await prisma.user.create({
    data: {
      username: "user2",
      password: userPassword,
      name: "User Two",
      role: "USER",
      createdById: admin1.id,
      language: "en",
    },
  });
  console.log("Created User:", user2.username);

  // 4. Create Categories (created by Admin)
  const categoryDesign = await prisma.category.create({
    data: {
      name: "Design",
      description: "UI/UX design tasks",
      createdById: admin1.id,
    },
  });

  const categoryDevelopment = await prisma.category.create({
    data: {
      name: "Development",
      description: "Software development tasks",
      createdById: admin1.id,
    },
  });

  const categoryMarketing = await prisma.category.create({
    data: {
      name: "Marketing",
      description: "Marketing and promotion tasks",
      createdById: admin1.id,
    },
  });
  console.log("Created Categories: Design, Development, Marketing");

  // 5. Create Sample Tasks
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const tasks = [
    {
      title: "Design landing page mockup",
      description: "Create a modern landing page mockup for the new product launch",
      assignedToId: user1.id,
      createdById: admin1.id,
      deadline: nextWeek,
      categoryId: categoryDesign.id,
      status: "IN_PROGRESS",
      progress: 40,
      scheduledStart: now,
    },
    {
      title: "Implement user authentication",
      description: "Set up JWT-based authentication with login and registration endpoints",
      assignedToId: user1.id,
      createdById: admin1.id,
      deadline: nextMonth,
      categoryId: categoryDevelopment.id,
      status: "PENDING",
      progress: 0,
      scheduledStart: nextWeek,
    },
    {
      title: "Create social media campaign",
      description: "Plan and schedule social media posts for Q2 product launch",
      assignedToId: user2.id,
      createdById: admin1.id,
      deadline: nextWeek,
      categoryId: categoryMarketing.id,
      status: "COMPLETED",
      progress: 100,
      scheduledStart: yesterday,
      completedAt: now,
      timeTaken: 480,
    },
    {
      title: "Build REST API endpoints",
      description: "Develop CRUD API endpoints for task management module",
      assignedToId: user2.id,
      createdById: admin1.id,
      deadline: yesterday,
      categoryId: categoryDevelopment.id,
      status: "OVERDUE",
      progress: 60,
      scheduledStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Update brand style guide",
      description: "Refresh the brand style guide with new color palette and typography",
      assignedToId: user1.id,
      createdById: admin1.id,
      deadline: nextMonth,
      categoryId: categoryDesign.id,
      status: "PENDING",
      progress: 0,
      scheduledStart: nextWeek,
    },
  ];

  for (const task of tasks) {
    await prisma.task.create({ data: task });
  }
  console.log(`Created ${tasks.length} sample tasks`);

  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
