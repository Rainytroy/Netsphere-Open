import { Request, Response } from "express";
import { AppDataSource } from "../database";
import { WorkTask, WorkTaskStatus, ExecutionStatus } from "../models/WorkTask";
import { WorkTaskService } from "../services/WorkTaskService";
import { WorkTaskVariableSourceProvider } from "../services/WorkTaskVariableSourceProvider";

/**
 * 工作任务控制器
 * 处理与工作任务相关的HTTP请求
 */
export class WorkTaskController {
  private static workTaskService: WorkTaskService = new WorkTaskService();
  
  /**
   * 获取所有工作任务
   */
  static async getAllWorkTasks(req: Request, res: Response) {
    try {
      const tasks = await WorkTaskController.workTaskService.getAllWorkTasks();
      return res.status(200).json(tasks);
    } catch (error) {
      console.error("获取工作任务列表失败:", error);
      return res.status(500).json({ message: "获取工作任务列表失败", error });
    }
  }

  /**
   * 获取单个工作任务详情
   */
  static async getWorkTaskById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      console.log(`获取工作任务详情, ID: ${id}`);
      const task = await WorkTaskController.workTaskService.getWorkTaskById(id);

      if (!task) {
        return res.status(404).json({ message: "未找到指定工作任务" });
      }

      return res.status(200).json(task);
    } catch (error) {
      console.error(`获取工作任务(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "获取工作任务详情失败", error });
    }
  }

  /**
   * 创建新工作任务
   */
  static async createWorkTask(req: Request, res: Response) {
    try {
      console.log("创建工作任务, 请求数据:", JSON.stringify(req.body));
      const taskData = req.body;

      // 验证必填字段
      if (!taskData.name || !taskData.input || !taskData.aiServiceId) {
        console.error("创建工作任务失败: 缺少必填字段", { 
          name: taskData.name, 
          input: taskData.input,
          aiServiceId: taskData.aiServiceId
        });
        return res.status(400).json({ 
          message: "缺少必填字段", 
          missingFields: {
            name: !taskData.name,
            input: !taskData.input,
            aiServiceId: !taskData.aiServiceId
          }
        });
      }

      // 创建工作任务
      const savedTask = await WorkTaskController.workTaskService.createWorkTask(taskData);
      console.log(`工作任务创建成功, ID: ${savedTask.id}`);
      return res.status(201).json(savedTask);
    } catch (error) {
      console.error("创建工作任务失败:", error);
      return res.status(500).json({ message: "创建工作任务失败", error });
    }
  }

  /**
   * 更新现有工作任务
   */
  static async updateWorkTask(req: Request, res: Response) {
    try {
      const id = req.params.id;
      console.log(`更新工作任务, ID: ${id}`);
      const taskData = req.body;

      // 更新工作任务
      const updatedTask = await WorkTaskController.workTaskService.updateWorkTask(id, taskData);

      if (!updatedTask) {
        return res.status(404).json({ message: "未找到指定工作任务" });
      }

      return res.status(200).json(updatedTask);
    } catch (error) {
      console.error(`更新工作任务(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "更新工作任务失败", error });
    }
  }

  /**
   * 删除工作任务
   */
  static async deleteWorkTask(req: Request, res: Response) {
    try {
      const id = req.params.id;
      console.log(`删除工作任务, ID: ${id}`);
      
      // 1. 获取工作任务信息，用于删除变量
      const workTaskRepository = AppDataSource.getRepository(WorkTask);
      const task = await workTaskRepository.findOne({ where: { id } });
      
      if (!task) {
        return res.status(404).json({ message: "未找到指定工作任务" });
      }
      
      // 2. 使用变量提供者删除关联的变量
      const workTaskVariableProvider = new WorkTaskVariableSourceProvider();
      try {
        const deletedCount = await workTaskVariableProvider.deleteWorkTaskVariables(id, task.name);
        console.log(`删除了 ${deletedCount} 个与工作任务(ID: ${id})相关的变量`);
      } catch (variableError) {
        console.error(`删除工作任务(ID: ${id})变量失败:`, variableError);
        // 继续删除工作任务，不因变量删除失败而中断
      }
      
      // 3. 删除工作任务实体
      const result = await WorkTaskController.workTaskService.deleteWorkTask(id);
      
      if (!result) {
        return res.status(404).json({ message: "未找到指定工作任务" });
      }

      return res.status(200).json({ message: "工作任务删除成功" });
    } catch (error) {
      console.error(`删除工作任务(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "删除工作任务失败", error });
    }
  }

  /**
   * 执行工作任务
   */
  static async executeWorkTask(req: Request, res: Response) {
    try {
      const id = req.params.id;
      console.log(`执行工作任务, ID: ${id}`);
      
      try {
        // 调用服务层方法执行任务
        const updatedTask = await WorkTaskController.workTaskService.executeWorkTask(id);
        
        if (!updatedTask) {
          return res.status(404).json({ message: "未找到指定工作任务" });
        }
        
        return res.status(200).json({ 
          message: "工作任务执行成功",
          task: updatedTask
        });
      } catch (error) {
        console.error(`执行工作任务(ID: ${id})失败:`, error);
        return res.status(500).json({ message: `执行工作任务失败: ${error instanceof Error ? error.message : '未知错误'}` });
      }
    } catch (error) {
      console.error(`执行工作任务(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "执行工作任务失败", error });
    }
  }
  
  /**
   * 测试执行工作任务
   * 不保存结果，仅返回输出
   */
  static async testExecuteWorkTask(req: Request, res: Response) {
    try {
      console.log("测试执行工作任务, 请求数据:", JSON.stringify(req.body));
      const { input, npcId, aiServiceId, npcPromptTemplate, debug, returnServerLogs } = req.body;
      
      // 验证必填字段
      if (!input || !aiServiceId) {
        return res.status(400).json({ 
          message: "缺少必填字段", 
          missingFields: {
            input: !input,
            aiServiceId: !aiServiceId
          }
        });
      }
      
      // 如果需要返回服务器日志，创建一个日志容器并重写console.log
      const logs: string[] = [];
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      // 如果请求要求返回服务器日志，重写 console.log 和 console.error 来捕获日志
      if (returnServerLogs) {
        // 重写 console.log
        console.log = function(...args: any[]) {
          // 调用原始的 console.log
          originalConsoleLog.apply(console, args);
          
          // 将日志添加到数组
          const logMessage = Array.from(args).join(' ');
          logs.push(logMessage);
        };
        
        // 同时重写 console.error 以捕获错误日志
        console.error = function(...args: any[]) {
          // 调用原始的 console.error
          originalConsoleError.apply(console, args);
          
          // 将错误日志添加到数组
          const logMessage = `[ERROR] ${Array.from(args).join(' ')}`;
          logs.push(logMessage);
        };
      }
      
      let result;
      try {
        // 特意添加一条明显的日志，验证日志捕获机制是否工作
        console.log("===== 开始调用AI服务处理请求 =====");
        
        // 调用服务层方法执行测试
        result = await WorkTaskController.workTaskService.testExecuteWorkTask({
          input,
          npcId,
          aiServiceId,
          npcPromptTemplate,
          debug: Boolean(debug), // 转换为布尔值
          returnServerLogs: Boolean(returnServerLogs) // 传递日志返回标志
        });
        
        console.log("===== AI服务响应完成 =====");
      } catch (error) {
        console.error("测试执行工作任务失败:", error);
        // 不在这里恢复console.log，确保错误日志也被捕获
        return res.status(500).json({ 
          message: `测试执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
          serverLogs: logs // 总是返回已捕获的日志
        });
      } finally {
        // 在finally块中恢复原始的console函数，确保无论如何都会执行
        if (returnServerLogs) {
          console.log = originalConsoleLog;
          console.error = originalConsoleError;
        }
      }
      
      // 确保总是将日志添加到结果中
      if (returnServerLogs && result) {
        // 使用类型断言确保TypeScript不会报错
        if (typeof result === 'object' && result.debug) {
          // 强制类型转换为any，避免TypeScript错误
          (result.debug as any).serverLogs = logs;
        }
        
        // 同时添加到顶层
        (result as any).serverLogs = logs;
      }
      
      // 返回结果，包含可选的调试信息
      return res.status(200).json(result);
    } catch (error) {
      console.error("测试执行工作任务失败:", error);
      return res.status(500).json({ message: "测试执行工作任务失败", error });
    }
  }

  /**
   * 获取工作任务的模板集合
   */
  static async getTaskTemplates(req: Request, res: Response) {
    try {
      const id = req.params.id;
      console.log(`获取工作任务模板, ID: ${id}`);
      
      // 从数据库获取工作任务
      const workTaskRepository = AppDataSource.getRepository(WorkTask);
      const task = await workTaskRepository.findOne({ where: { id } });
      
      if (!task) {
        return res.status(404).json({ message: "未找到指定工作任务" });
      }
      
      // 获取npcTemplates字段，如果为空则返回空对象
      const templates = task.npcTemplates || {};
      
      return res.status(200).json({
        success: true,
        templates
      });
    } catch (error) {
      console.error(`获取工作任务模板(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "获取工作任务模板失败", error });
    }
  }
  
  /**
   * 更新工作任务的模板集合
   */
  static async updateTaskTemplates(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const templates = req.body;
      console.log(`更新工作任务模板, ID: ${id}`);
      
      if (!templates || typeof templates !== 'object') {
        return res.status(400).json({ 
          message: "模板数据必须是有效的对象"
        });
      }
      
      // 从数据库获取工作任务
      const workTaskRepository = AppDataSource.getRepository(WorkTask);
      const task = await workTaskRepository.findOne({ where: { id } });
      
      if (!task) {
        return res.status(404).json({ message: "未找到指定工作任务" });
      }
      
      // 更新npcTemplates字段
      task.npcTemplates = templates;
      await workTaskRepository.save(task);
      
      return res.status(200).json({
        success: true,
        message: "模板更新成功",
        data: templates
      });
    } catch (error) {
      console.error(`更新工作任务模板(ID: ${req.params.id})失败:`, error);
      return res.status(500).json({ message: "更新工作任务模板失败", error });
    }
  }
}
