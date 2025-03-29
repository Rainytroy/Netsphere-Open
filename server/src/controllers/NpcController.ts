import { Request, Response } from "express";
import { AppDataSource } from "../database";
import { Npc } from "../models/Npc";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { NpcVariableSourceProvider } from "../services/NpcVariableSourceProvider";

// 定义上传目录路径
const UPLOAD_DIR = path.join(__dirname, "../../uploads/avatars");

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  console.log("创建上传目录:", UPLOAD_DIR);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export class NpcController {
  /**
   * 获取所有NPC列表
   */
  static async getAllNpcs(req: Request, res: Response) {
    try {
      const npcRepository = AppDataSource.getRepository(Npc);
      console.log("获取NPC列表中...");
      const npcs = await npcRepository.find();
      console.log(`成功获取${npcs.length}个NPC`);
      return res.status(200).json(npcs);
    } catch (error) {
      console.error("获取NPC列表失败:", error);
      return res.status(500).json({ message: "获取NPC列表失败", error });
    }
  }

  /**
   * 获取单个NPC详情
   */
  static async getNpcById(req: Request, res: Response) {
    try {
      const npcRepository = AppDataSource.getRepository(Npc);
      const id = req.params.id;
      console.log(`获取NPC详情, ID: ${id}`);
      const npc = await npcRepository.findOneBy({ id });

      if (!npc) {
        return res.status(404).json({ message: "未找到指定NPC" });
      }

      return res.status(200).json(npc);
    } catch (error) {
      console.error(`获取NPC(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "获取NPC详情失败", error });
    }
  }

  /**
   * 创建新NPC
   */
  static async createNpc(req: Request, res: Response) {
    try {
      const npcRepository = AppDataSource.getRepository(Npc);
      console.log("创建NPC, 请求数据:", JSON.stringify(req.body));
      const {
        name,
        avatar,
        knowledgeBackground,
        actionPrinciples,
        activityLevel,
        activityLevelDescription,
        description,
        promptTemplate,
        files
      } = req.body;

      // 验证必填字段
      if (!name || !knowledgeBackground || !actionPrinciples || !activityLevelDescription) {
        console.error("创建NPC失败: 缺少必填字段", { 
          name, knowledgeBackground, actionPrinciples, activityLevelDescription 
        });
        return res.status(400).json({ 
          message: "缺少必填字段", 
          missingFields: {
            name: !name,
            knowledgeBackground: !knowledgeBackground,
            actionPrinciples: !actionPrinciples,
            activityLevelDescription: !activityLevelDescription
          }
        });
      }

      // 创建新NPC实例
      const npc = new Npc();
      npc.name = name;
      npc.avatar = avatar;
      npc.knowledgeBackground = knowledgeBackground;
      npc.actionPrinciples = actionPrinciples;
      npc.activityLevel = activityLevel !== undefined ? activityLevel : 1; // 默认值为1
      npc.activityLevelDescription = activityLevelDescription;
      npc.description = description;
      npc.promptTemplate = promptTemplate;
      npc.files = files;

      // 保存到数据库
      console.log("正在保存NPC数据...");
      const savedNpc = await npcRepository.save(npc);
      console.log(`NPC创建成功, ID: ${savedNpc.id}`);
      return res.status(201).json(savedNpc);
    } catch (error) {
      console.error("创建NPC失败:", error);
      return res.status(500).json({ message: "创建NPC失败", error });
    }
  }

  /**
   * 更新现有NPC
   */
  static async updateNpc(req: Request, res: Response) {
    try {
      const npcRepository = AppDataSource.getRepository(Npc);
      const id = req.params.id;
      console.log(`更新NPC, ID: ${id}`);
      const npc = await npcRepository.findOneBy({ id });

      if (!npc) {
        return res.status(404).json({ message: "未找到指定NPC" });
      }

      // 更新NPC字段
      const {
        name,
        avatar,
        knowledgeBackground,
        actionPrinciples,
        activityLevel,
        activityLevelDescription,
        description,
        promptTemplate,
        files
      } = req.body;

      if (name) npc.name = name;
      if (avatar !== undefined) npc.avatar = avatar;
      if (knowledgeBackground) npc.knowledgeBackground = knowledgeBackground;
      if (actionPrinciples) npc.actionPrinciples = actionPrinciples;
      if (activityLevel !== undefined) npc.activityLevel = activityLevel;
      if (activityLevelDescription) npc.activityLevelDescription = activityLevelDescription;
      if (description !== undefined) npc.description = description;
      if (promptTemplate !== undefined) npc.promptTemplate = promptTemplate;
      if (files) npc.files = files;

      // 保存更新
      const updatedNpc = await npcRepository.save(npc);
      return res.status(200).json(updatedNpc);
    } catch (error) {
      console.error(`更新NPC(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "更新NPC失败", error });
    }
  }

  /**
   * 删除NPC
   */
  static async deleteNpc(req: Request, res: Response) {
    try {
      const npcRepository = AppDataSource.getRepository(Npc);
      const id = req.params.id;
      console.log(`删除NPC, ID: ${id}`);
      const npc = await npcRepository.findOneBy({ id });

      if (!npc) {
        return res.status(404).json({ message: "未找到指定NPC" });
      }

      // 保存NPC名称用于删除变量
      const npcName = npc.name;

      // 删除相关的头像文件（如果存在）
      if (npc.avatar) {
        const avatarPath = path.join(UPLOAD_DIR, path.basename(npc.avatar));
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
        }
      }

      // 删除NPC相关的变量
      const npcVariableProvider = new NpcVariableSourceProvider();
      try {
        const deletedCount = await npcVariableProvider.deleteNpcVariables(id, npcName);
        console.log(`删除了 ${deletedCount} 个与NPC(ID: ${id})相关的变量`);
      } catch (variableError) {
        console.error(`删除NPC(ID: ${id})变量失败:`, variableError);
        // 继续删除NPC，不因变量删除失败而中断
      }

      // 从数据库中删除NPC
      await npcRepository.remove(npc);
      return res.status(200).json({ message: "NPC删除成功" });
    } catch (error) {
      console.error(`删除NPC(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "删除NPC失败", error });
    }
  }

  /**
   * 上传NPC头像
   */
  static async uploadAvatar(req: Request & { file?: any }, res: Response) {
    try {
      const npcRepository = AppDataSource.getRepository(Npc);
      const id = req.params.id;
      console.log(`上传NPC头像, ID: ${id}`);
      const npc = await npcRepository.findOneBy({ id });

      if (!npc) {
        return res.status(404).json({ message: "未找到指定NPC" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "未提供头像文件" });
      }

      // 生成唯一文件名
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      // 将上传的文件移动到目标位置
      fs.writeFileSync(filePath, req.file.buffer);

      // 更新NPC的头像URL
      const avatarUrl = `/uploads/avatars/${fileName}`;
      npc.avatar = avatarUrl;

      // 保存更新
      const updatedNpc = await npcRepository.save(npc);
      return res.status(200).json({ 
        message: "头像上传成功", 
        avatar: avatarUrl,
        npc: updatedNpc 
      });
    } catch (error) {
      console.error(`上传NPC(ID: ${req.params.id})头像失败:`, error);
      return res.status(500).json({ message: "上传头像失败", error });
    }
  }
}
