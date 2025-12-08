import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
router.use(authenticate);

// 创建评论
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { content, requirementId, taskId } = req.body;

    if (!content || (!requirementId && !taskId)) {
      return res.status(400).json({ error: '请提供评论内容和关联ID' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId: req.user!.id,
        requirementId: requirementId || null,
        taskId: taskId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('创建评论错误:', error);
    res.status(500).json({ error: '创建评论失败' });
  }
});

// 删除评论
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    // 只有评论作者和管理员可以删除
    if (comment.userId !== req.user!.id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权删除此评论' });
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.json({ message: '评论删除成功' });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({ error: '删除评论失败' });
  }
});

export default router;
