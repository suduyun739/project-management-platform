import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// 创建需求验证 schema
const createRequirementSchema = z.object({
  title: z.string().min(2, '需求标题至少2个字符'),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  projectId: z.string().uuid('无效的项目ID'),
  assigneeId: z.string().uuid('无效的负责人ID').optional(),
  assigneeIds: z.array(z.string().uuid('无效的负责人ID')).optional(), // 多个负责人
  parentId: z.string().uuid('无效的父需求ID').optional(),
  estimatedHours: z.number().positive('预估工时必须为正数').optional(),
});

// 更新需求验证 schema
const updateRequirementSchema = z.object({
  title: z.string().min(2, '需求标题至少2个字符').optional(),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']).optional(),
  assigneeId: z.string().uuid('无效的负责人ID').nullable().optional(),
  assigneeIds: z.array(z.string().uuid('无效的负责人ID')).optional(), // 多个负责人
  parentId: z.string().uuid('无效的父需求ID').nullable().optional(),
  estimatedHours: z.number().positive('预估工时必须为正数').nullable().optional(),
});

// 获取需求列表（支持强大的筛选）
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { projectId, status, priority, assigneeId, search } = req.query;

    const where: any = {};

    // 项目筛选
    if (projectId) {
      where.projectId = projectId;
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

    // 非管理员只能看到自己作为负责人之一的需求
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

    const requirements = await prisma.requirement.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
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
            tasks: true,
            comments: true,
            children: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(requirements);
  } catch (error) {
    res.status(500).json({ error: '获取需求列表失败' });
  }
});

// 获取单个需求详情
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const requirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            creatorId: true,
          },
        },
        assignee: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                username: true,
                name: true,
              },
            },
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

    if (!requirement) {
      return res.status(404).json({ error: '需求不存在' });
    }

    // 权限检查：管理员可以查看所有，非管理员只能查看自己作为负责人之一的需求
    if (req.user?.role !== 'ADMIN') {
      const isAssignee = await prisma.requirementAssignee.findFirst({
        where: {
          requirementId: id,
          userId: req.user!.id,
        },
      });

      if (!isAssignee) {
        return res.status(403).json({ error: '无权访问此需求' });
      }
    }

    res.json(requirement);
  } catch (error) {
    res.status(500).json({ error: '获取需求详情失败' });
  }
});

// 创建需求
router.post('/', async (req: AuthRequest, res) => {
  try {
    let { assigneeIds, ...data } = createRequirementSchema.parse(req.body);

    // 检查项目是否存在
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
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

    const requirement = await prisma.requirement.create({
      data: {
        ...data,
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

    res.status(201).json(requirement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('创建需求错误:', error);
    res.status(500).json({ error: '创建需求失败' });
  }
});

// 更新需求
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { assigneeIds, ...data } = updateRequirementSchema.parse(req.body);

    const existingRequirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!existingRequirement) {
      return res.status(404).json({ error: '需求不存在' });
    }

    // 权限检查：管理员可以编辑所有，非管理员只能编辑自己作为负责人之一的需求
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isAdmin) {
      // 检查用户是否为负责人之一
      const isAssignee = await prisma.requirementAssignee.findFirst({
        where: {
          requirementId: id,
          userId: req.user!.id,
        },
      });

      if (!isAssignee) {
        return res.status(403).json({ error: '无权修改此需求' });
      }

      // 非管理员可以修改自己负责的需求的所有内容
    }

    // 准备更新数据
    const updateData: any = { ...data };

    // 如果有 assigneeIds，更新多对多关系
    if (assigneeIds !== undefined) {
      updateData.assignees = {
        deleteMany: {}, // 先删除所有现有关系
        create: assigneeIds.map(userId => ({
          userId,
        })),
      };
    }

    const requirement = await prisma.requirement.update({
      where: { id },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
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

    res.json(requirement);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('更新需求错误:', error);
    res.status(500).json({ error: '更新需求失败' });
  }
});

// 删除需求
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingRequirement = await prisma.requirement.findUnique({
      where: { id },
      include: {
        project: true,
      },
    });

    if (!existingRequirement) {
      return res.status(404).json({ error: '需求不存在' });
    }

    // 权限检查：只有管理员可以删除需求
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以删除需求' });
    }

    await prisma.requirement.delete({
      where: { id },
    });

    res.json({ message: '需求删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除需求失败' });
  }
});

export default router;
