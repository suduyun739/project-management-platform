import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 检查是否已有管理员用户
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (existingAdmin) {
    console.log('管理员用户已存在，跳过初始化');
    return;
  }

  // 创建默认管理员用户
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      name: '系统管理员',
      email: 'admin@example.com',
      role: 'ADMIN'
    }
  });

  console.log('创建管理员用户成功:', admin.username);

  // 创建示例项目
  const project = await prisma.project.create({
    data: {
      name: '示例项目',
      description: '这是一个示例项目，用于演示系统功能',
      status: 'ACTIVE',
      creatorId: admin.id,
      startDate: new Date(),
    }
  });

  console.log('创建示例项目成功:', project.name);

  // 创建示例需求
  const requirement = await prisma.requirement.create({
    data: {
      title: '示例需求：用户登录功能',
      description: '实现用户登录、注册和权限管理功能',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      projectId: project.id,
      assigneeId: admin.id,
      estimatedHours: 16
    }
  });

  console.log('创建示例需求成功:', requirement.title);

  // 创建示例任务
  await prisma.task.createMany({
    data: [
      {
        title: '设计登录页面',
        description: '设计简洁美观的登录界面',
        priority: 'HIGH',
        status: 'DONE',
        projectId: project.id,
        requirementId: requirement.id,
        assigneeId: admin.id,
        estimatedHours: 4,
        actualHours: 3.5
      },
      {
        title: '实现登录API',
        description: '实现用户登录的后端接口',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        projectId: project.id,
        requirementId: requirement.id,
        assigneeId: admin.id,
        estimatedHours: 6
      },
      {
        title: '添加权限验证',
        description: '实现JWT token验证和权限控制',
        priority: 'MEDIUM',
        status: 'TODO',
        projectId: project.id,
        requirementId: requirement.id,
        assigneeId: admin.id,
        estimatedHours: 6
      }
    ]
  });

  console.log('创建示例任务成功');
  console.log('\n数据库初始化完成！');
  console.log('\n默认管理员账号:');
  console.log('用户名: admin');
  console.log('密码: admin123');
  console.log('\n请登录后立即修改密码！');
}

main()
  .catch((e) => {
    console.error('数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
