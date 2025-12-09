import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// 获取用户列表（管理员可见所有用户，非管理员只能看到自己）
router.get('/', async (req: AuthRequest, res) => {
  try {
    // 非管理员只能查询自己
    if (req.user?.role !== 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });
      return res.json([user]); // 返回数组格式保持一致
    }

    // 管理员查询所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

// 获取单个用户信息
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            createdProjects: true,
            requirements: true,
            tasks: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 更新用户信息（管理员可更新所有用户，普通用户只能更新自己）
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    // 权限检查
    if (req.user?.role !== 'ADMIN' && req.user?.id !== id) {
      return res.status(403).json({ error: '无权修改其他用户信息' });
    }

    // 普通用户不能修改角色
    if (req.user?.role !== 'ADMIN' && role) {
      return res.status(403).json({ error: '无权修改用户角色' });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role && req.user?.role === 'ADMIN') updateData.role = role;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '更新用户信息失败' });
  }
});

// 删除用户（仅管理员）
router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // 不能删除自己
    if (req.user?.id === id) {
      return res.status(400).json({ error: '不能删除自己的账号' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: '用户删除成功' });
  } catch (error) {
    res.status(500).json({ error: '删除用户失败' });
  }
});

// 重置用户密码（仅管理员）
router.post('/:id/reset-password', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少6个字符' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ message: '密码重置成功' });
  } catch (error) {
    res.status(500).json({ error: '重置密码失败' });
  }
});

export default router;
