import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("开始初始化数据...");

  // 创建示例工厂
  const tenant = await prisma.tenant.upsert({
    where: { id: "demo" },
    update: {},
    create: {
      id: "demo",
      name: "示例五金厂",
      industry: "五金加工",
    },
  });

  console.log("创建工厂:", tenant.name);

  // 创建管理员用户
  const admin = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "13800138000" } },
    update: {},
    create: {
      tenantId: tenant.id,
      phone: "13800138000",
      name: "张厂长",
      role: "admin",
    },
  });

  // 创建经理用户
  const manager = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "13800138001" } },
    update: {},
    create: {
      tenantId: tenant.id,
      phone: "13800138001",
      name: "李经理",
      role: "manager",
    },
  });

  // 创建工人用户
  const worker1 = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "13800138002" } },
    update: {},
    create: {
      tenantId: tenant.id,
      phone: "13800138002",
      name: "王师傅",
      role: "worker",
      department: "冲压车间",
    },
  });

  const worker2 = await prisma.user.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "13800138003" } },
    update: {},
    create: {
      tenantId: tenant.id,
      phone: "13800138003",
      name: "刘师傅",
      role: "worker",
      department: "焊接车间",
    },
  });

  console.log("创建用户: 管理员, 经理, 工人×2");

  // 创建工序
  const processes = await Promise.all([
    prisma.process.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "PRESS" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "冲压",
        code: "PRESS",
        sortOrder: 1,
        standardTime: 30,
        requiresMachine: true,
      },
    }),
    prisma.process.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "WELD" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "焊接",
        code: "WELD",
        sortOrder: 2,
        standardTime: 120,
        requiresMachine: true,
      },
    }),
    prisma.process.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "PAINT" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "喷涂",
        code: "PAINT",
        sortOrder: 3,
        standardTime: 60,
        requiresMachine: true,
      },
    }),
    prisma.process.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "ASSY" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "组装",
        code: "ASSY",
        sortOrder: 4,
        standardTime: 45,
        requiresMachine: false,
      },
    }),
  ]);

  console.log("创建工序: 冲压, 焊接, 喷涂, 组装");

  // 创建设备
  const machines = await Promise.all([
    prisma.machine.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "PRESS-01" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "冲压机 01",
        code: "PRESS-01",
        type: "冲压",
      },
    }),
    prisma.machine.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "WELD-01" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "焊接机 01",
        code: "WELD-01",
        type: "焊接",
      },
    }),
    prisma.machine.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: "PAINT-01" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "喷涂线 01",
        code: "PAINT-01",
        type: "喷涂",
      },
    }),
  ]);

  console.log("创建设备: 冲压机, 焊接机, 喷涂线");

  // 创建产品
  const product1 = await prisma.product.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: "PROD-A001" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "金属支架 A型",
      code: "PROD-A001",
      unit: "件",
    },
  });

  // 为产品添加工序步骤
  for (let i = 0; i < processes.length; i++) {
    await prisma.processStep.upsert({
      where: {
        productId_processId: {
          productId: product1.id,
          processId: processes[i].id,
        },
      },
      update: {},
      create: {
        productId: product1.id,
        processId: processes[i].id,
        sortOrder: i + 1,
      },
    });
  }

  console.log("创建产品: 金属支架 A型 (含4道工序)");

  // 创建示例订单
  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      orderNo: "ORD-20260518-001",
      productId: product1.id,
      quantity: 500,
      dueDate: new Date("2026-05-25"),
      priority: 0,
      status: "pending",
      customerName: "示例客户",
    },
  });

  // 创建订单项
  const steps = await prisma.processStep.findMany({
    where: { productId: product1.id },
    orderBy: { sortOrder: "asc" },
  });

  for (const step of steps) {
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        processStepId: step.id,
        status: "waiting",
      },
    });
  }

  console.log("创建示例订单:", order.orderNo);

  console.log("\n数据初始化完成!");
  console.log("\n测试账号:");
  console.log("管理员: 13800138000 (验证码: 000000)");
  console.log("经理:   13800138001 (验证码: 000000)");
  console.log("工人:   13800138002 (验证码: 000000)");
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
