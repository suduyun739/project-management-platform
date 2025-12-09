import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// 创建任务验证 schema
const createTaskSchema = z.object({
  title: z.string().min(2, '任务标题至少2个字符'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  status: z.enum(['TODO', 'IN_PROGRESS', 'TESTING', 'DONE', 'BLOCKED']).default('TODO'),
  projectId: z.string().uuid('无效的项目ID'),
  requirementId: z.string().uuid('无效的需求ID').optional(),
  assigneeId: z.string().uuid('无效的负责人ID').optional(),
  assigneeIds: z.array(z.string().uuid('无效的负责人ID')).optional(), // 多个负责人
  parentId: z.string().uuid('无效的父任务ID').optional(),
  estimatedHours: z.number().positive('预估工时必须为正数').optional(),
  actualHours: z.number().nonnegative('实际工时不能为负数').optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

// 更新任务验证 schema
const updateTaskSchema = z.object({
  title: z.string().min(2, '任务标题至少2个字符').optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'TESTING', 'DONE', 'BLOCKED']).optional(),
  assigneeId: z.string().uuid('无效的负责人ID').nullable().optional(),
  assigneeIds: z.array(z.string().uuid('无效的负责人ID')).optional(), // 多个负责人
  parentId: z.string().uuid('无效的父任务ID').nullable().optional(),
  estimatedHours: z.number().positive('预估工时必须为正数').nullable().optional(),
  actualHours: z.number().nonnegative('实际工时不能为负数').nullable().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

// 获取任务列表（支持强大的筛选）
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { projectId, requirementId, status, priority, assigneeId, search } = req.query;

    const where: any = {};

    // 项目筛选
    if (projectId) {
      where.projectId = projectId;
    }

    // 需求筛选
    if (requirementId) {
      where.requirementId = requirementId;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 优先级筛选
    if (priority) {
      where.priority = priority;
    }

    // 负责人筛选（支持多负责人查询）
    if (assigneeId) {
      where.assignees = {
        some: {
          userId: assigneeId as string,
        },
      };
    }

    // 非管理员只能看到自己作为负责人之一的任务
    if (req.user?.role !== 'ADMIN' && !assigneeId) {
      where.assignees = {
        some: {
          userId: req.user!.id,
        },
      };
    }

    // 关键词搜索
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(tasks);
  } catch (error) {
    console.error('获取任务列表错误:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

// 获取看板数据（按状态分组的任务）
router.get('/kanban', async (req: AuthRequest, res) => {
  try {
    const { projectId, assigneeId } = req.query;

    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    // 如果指定了负责人，或非管理员只看自己作为负责人之一的任务
    if (assigneeId) {
      where.assignees = {
        some: {
          userId: assigneeId as string,
        },
      };
    } else if (req.user?.role !== 'ADMIN') {
      where.assignees = {
        some: {
          userId: req.user!.id,
        },
      };
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // 按状态分组
    const kanban = {
      TODO: tasks.filter(t => t.status === 'TODO'),
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
      TESTING: tasks.filter(t => t.status === 'TESTING'),
      DONE: tasks.filter(t => t.status === 'DONE'),
      BLOCKED: tasks.filter(t => t.status === 'BLOCKED'),
    };

    res.json(kanban);
  } catch (error) {
    console.error('获取看板数据错误:', error);
    res.status(500).json({ error: '获取看板数据失败' });
  }
});

// 获取单个任务详情
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            creatorId: true,
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 权限检查：管理员可以查看所有，非管理员只能查看自己作为负责人之一的任务
    if (req.user?.role !== 'ADMIN') {
      const isAssignee = await prisma.taskAssignee.findFirst({
        where: {
          taskId: id,
          userId: req.user!.id,
        },
      });

      if (!isAssignee) {
        return res.status(403).json({ error: '无权访问此任务' });
      }
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ error: '获取任务详情失败' });
  }
});

// 创建任务
router.post('/', async (req: AuthRequest, res) => {
  try {
    let { startDate, dueDate, assigneeIds, ...rest } = createTaskSchema.parse(req.body);

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id: rest.projectId },
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 非管理员创建时，强制添加自己为负责人
    if (req.user?.role !== 'ADMIN') {
      if (!assigneeIds) {
        assigneeIds = [req.user!.id];
      } else if (!assigneeIds.includes(req.user!.id)) {
        assigneeIds.push(req.user!.id);
      }
    }

    const task = await prisma.task.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignees: assigneeIds && assigneeIds.length > 0 ? {
          create: assigneeIds.map(userId => ({
            userId,
          })),
        } : undefined,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('创建任务错误:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

// 更新任务
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { startDate, dueDate, assigneeIds, ...rest } = updateTaskSchema.parse(req.body);

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!existingTask) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 权限检查：管理员可以编辑所有，非管理员只能编辑自己作为负责人之一的任务
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isAdmin) {
      // 检查用户是否为负责人之一
      const isAssignee = await prisma.taskAssignee.findFirst({
        where: {
          taskId: id,
          userId: req.user!.id,
        },
      });

      if (!isAssignee) {
        return res.status(403).json({ error: '无权修改此任务' });
      }

      // 非管理员可以修改自己负责的任务的所有内容
    }

    const updateData: any = { ...rest };
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    // 如果有 assigneeIds，更新多对多关系
    if (assigneeIds !== undefined) {
      updateData.assignees = {
        deleteMany: {}, // 先删除所有现有关系
        create: assigneeIds.map(userId => ({
          userId,
        })),
      };
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        requirement: {
          select: {
            id: true,
            title: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
          },
        },
      },
    });

    res.json(task);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('更新任务错误:', error);
    res.status(500).json({ error: '更新任务失败' });
  }
});

// 删除任务
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!existingTask) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 权限检查：只有管理员可以删除任务
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以删除任务' });
    }

    await prisma.task.delete({
      where: { id },
    });

    res.json({ message: '任务删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除任务失败' });
  }
});

export default router;
