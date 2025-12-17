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

    // 所有人都可以看到所有项目（数据权限优化）
    // 不再限制 creatorId

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

    // 所有人都可以查看项目详情
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: '获取项目详情失败' });
  }
});

// 创建项目（只有管理员可以）
router.post('/', async (req: AuthRequest, res) => {
  try {
    // 权限检查：只有管理员可以创建项目
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以创建项目' });
    }

    const data = createProjectSchema.parse(req.body);

    // 检查项目名称是否已存在
    const existingProject = await prisma.project.findFirst({
      where: { name: data.name },
    });

    if (existingProject) {
      return res.status(400).json({ error: '项目名称已存在，请使用其他名称' });
    }

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

// 更新项目（只有管理员可以）
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateProjectSchema.parse(req.body);

    // 权限检查：只有管理员可以更新项目
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以修改项目' });
    }

    // 检查项目是否存在
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 如果修改了项目名称，检查新名称是否已被其他项目使用
    if (data.name && data.name !== existingProject.name) {
      const duplicateProject = await prisma.project.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      });

      if (duplicateProject) {
        return res.status(400).json({ error: '项目名称已存在，请使用其他名称' });
      }
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

// 删除项目（只有管理员可以）
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // 权限检查：只有管理员可以删除项目
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以删除项目' });
    }

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: '项目不存在' });
    }

    await prisma.project.delete({
      where: { id },
    });

    res.json({ message: '项目删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除项目失败' });
  }
});

// 项目排序操作（上移/下移/置顶，只有管理员可以）
router.post('/:id/sort', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'moveUp' | 'moveDown' | 'pinToTop'

    // 权限检查：只有管理员可以排序项目
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理员可以排序项目' });
    }

    if (!['moveUp', 'moveDown', 'pinToTop'].includes(action)) {
      return res.status(400).json({ error: '无效的排序操作' });
    }

    // 获取当前项目
    const currentProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!currentProject) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 获取所有项目（按当前排序）
    const allProjects = await prisma.project.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    const currentIndex = allProjects.findIndex(p => p.id === id);

    if (currentIndex === -1) {
      return res.status(404).json({ error: '项目不存在' });
    }

    let updates: any[] = [];

    if (action === 'pinToTop') {
      // 置顶：当前项目 sortOrder = 1，其他项目 +1
      updates = allProjects.map((project, index) => {
        if (project.id === id) {
          return prisma.project.update({
            where: { id: project.id },
            data: { sortOrder: 1 },
          });
        } else if (index < currentIndex) {
          return prisma.project.update({
            where: { id: project.id },
            data: { sortOrder: index + 2 },
          });
        } else {
          return prisma.project.update({
            where: { id: project.id },
            data: { sortOrder: index + 1 },
          });
        }
      });
    } else if (action === 'moveUp' && currentIndex > 0) {
      // 上移：与前一个项目交换 sortOrder
      const prevProject = allProjects[currentIndex - 1];
      updates = [
        prisma.project.update({
          where: { id },
          data: { sortOrder: prevProject.sortOrder },
        }),
        prisma.project.update({
          where: { id: prevProject.id },
          data: { sortOrder: currentProject.sortOrder },
        }),
      ];
    } else if (action === 'moveDown' && currentIndex < allProjects.length - 1) {
      // 下移：与后一个项目交换 sortOrder
      const nextProject = allProjects[currentIndex + 1];
      updates = [
        prisma.project.update({
          where: { id },
          data: { sortOrder: nextProject.sortOrder },
        }),
        prisma.project.update({
          where: { id: nextProject.id },
          data: { sortOrder: currentProject.sortOrder },
        }),
      ];
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    res.json({ message: '项目排序更新成功' });
  } catch (error) {
    console.error('更新项目排序错误:', error);
    res.status(500).json({ error: '更新项目排序失败' });
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
