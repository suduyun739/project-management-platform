import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// 使用认证中间件
router.use(authenticate);

// 创建项目验证 schema
const createProjectSchema = z.object({
  name: z.string().min(2, '项目名称至少2个字符'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// 更新项目验证 schema
const updateProjectSchema = z.object({
  name: z.string().min(2, '项目名称至少2个字符').optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// 获取项目列表
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, search } = req.query;

    const where: any = {};

    // 普通用户只能看到自己创建的项目
    if (req.user?.role !== 'ADMIN') {
      where.creatorId = req.user!.id;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 关键词搜索
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        _count: {
          select: {
            requirements: true,
            tasks: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: '获取项目列表失败' });
  }
});

// 获取单个项目详情
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
        requirements: {
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
      },
    });

    if (!project) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 权限检查：普通用户只能查看自己的项目
    if (req.user?.role !== 'ADMIN' && project.creatorId !== req.user!.id) {
      return res.status(403).json({ error: '无权访问此项目' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

// 创建项目
router.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        creatorId: req.user!.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '创建项目失败' });
  }
});

// 更新项目
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateProjectSchema.parse(req.body);

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 权限检查
    if (req.user?.role !== 'ADMIN' && existingProject.creatorId !== req.user!.id) {
      return res.status(403).json({ error: '无权修改此项目' });
    }

    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    res.status(500).json({ error: '更新项目失败' });
  }
});

// 删除项目
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 权限检查
    if (req.user?.role !== 'ADMIN' && existingProject.creatorId !== req.user!.id) {
      return res.status(403).json({ error: '无权删除此项目' });
    }

    await prisma.project.delete({
      where: { id },
    });

    res.json({ message: '项目删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除项目失败' });
  }
});

// 批量更新项目排序
router.post('/reorder', async (req: AuthRequest, res) => {
  try {
    const { projectIds } = req.body;

    if (!Array.isArray(projectIds)) {
      return res.status(400).json({ error: '无效的项目ID列表' });
    }

    // 批量更新排序
    const updates = projectIds.map((id, index) =>
      prisma.project.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: '项目排序更新成功' });
  } catch (error) {
    console.error('更新项目排序错误:', error);
    res.status(500).json({ error: '更新项目排序失败' });
  }
});

export default router;
