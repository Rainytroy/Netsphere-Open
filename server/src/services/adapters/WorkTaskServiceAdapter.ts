import { WorkTaskService } from "../WorkTaskService";
import { WorkTask, ExecutionStatus } from "../../models/WorkTask";
import { VariableResolver } from "../VariableResolver";

/**
 * 工作任务服务适配器
 * 用于对接工作流模块与工作任务模块，遵循只读原则
 */
export class WorkTaskServiceAdapter {
  private workTaskService: WorkTaskService;
  private variableResolver: VariableResolver;
  
  constructor(workTaskService: WorkTaskService, variableResolver: VariableResolver) {
    this.workTaskService = workTaskService;
    this.variableResolver = variableResolver;
  }
  
  /**
   * 获取所有工作任务
   * @returns 工作任务列表
   */
  async getAllWorkTasks(): Promise<WorkTask[]> {
    try {
      return await this.workTaskService.getAllWorkTasks();
    } catch (error) {
      console.error('获取工作任务列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 根据ID获取工作任务
   * @param taskId 工作任务ID
   * @returns 工作任务详情
   */
  async getWorkTaskById(taskId: string): Promise<WorkTask | null> {
    try {
      return await this.workTaskService.getWorkTaskById(taskId);
    } catch (error) {
      console.error(`获取工作任务 ${taskId} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 执行工作任务
   * @param taskId 工作任务ID
   * @param inputOverride 可选的输入覆盖，用于支持工作流内变量替换
   * @returns 执行结果
   */
  async executeWorkTask(taskId: string, inputOverride?: string): Promise<{
    success: boolean;
    output: string;
    status: ExecutionStatus;
    error?: string;
  }> {
    try {
      // 获取工作任务
      const task = await this.workTaskService.getWorkTaskById(taskId);
      if (!task) {
        throw new Error(`工作任务不存在: ${taskId}`);
      }
      
      let input = task.input;
      
      // 如果提供了输入覆盖，则使用覆盖值并解析其中的变量
      if (inputOverride !== undefined) {
        // 解析输入中的变量引用
        input = await this.variableResolver.resolveText(inputOverride);
      }
      
      // 执行工作任务
      try {
        // 构造测试执行参数，使用工作任务现有配置，但可能覆盖输入
        const testParams = {
          input,
          npcId: task.npcId,
          aiServiceId: task.aiServiceId,
          npcPromptTemplate: task.npcPromptTemplate
        };
        
        // 使用testExecuteWorkTask方法避免修改工作任务状态
        // 这样工作流系统对工作任务的使用就是无状态的，不会影响工作任务本身
        const output = await this.workTaskService.testExecuteWorkTask(testParams);
        
        // 返回执行结果
        return {
          success: true,
          output,
          status: ExecutionStatus.COMPLETED
        };
      } catch (error: any) {
        // 执行失败
        console.error(`执行工作任务 ${taskId} 失败:`, error);
        return {
          success: false,
          output: error.message || '执行失败',
          status: ExecutionStatus.FAILED,
          error: error.message
        };
      }
    } catch (error: any) {
      // 其他错误（如任务不存在）
      console.error(`工作任务执行前置处理失败:`, error);
      return {
        success: false,
        output: '',
        status: ExecutionStatus.FAILED,
        error: error.message
      };
    }
  }
  
  /**
   * 获取工作任务输入
   * @param taskId 工作任务ID
   * @returns 工作任务输入
   */
  async getWorkTaskInput(taskId: string): Promise<string> {
    try {
      const task = await this.workTaskService.getWorkTaskById(taskId);
      if (!task) {
        throw new Error(`工作任务不存在: ${taskId}`);
      }
      return task.input;
    } catch (error) {
      console.error(`获取工作任务 ${taskId} 输入失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取工作任务输出
   * @param taskId 工作任务ID
   * @returns 工作任务输出
   */
  async getWorkTaskOutput(taskId: string): Promise<string> {
    try {
      const task = await this.workTaskService.getWorkTaskById(taskId);
      if (!task) {
        throw new Error(`工作任务不存在: ${taskId}`);
      }
      return task.output || '';
    } catch (error) {
      console.error(`获取工作任务 ${taskId} 输出失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取工作任务名称列表
   * 用于UI显示和选择
   * @returns 工作任务名称和ID列表
   */
  async getWorkTaskOptions(): Promise<Array<{ id: string; name: string }>> {
    try {
      const tasks = await this.workTaskService.getAllWorkTasks();
      return tasks.map(task => ({
        id: task.id,
        name: task.name
      }));
    } catch (error) {
      console.error('获取工作任务选项失败:', error);
      return [];
    }
  }
}
