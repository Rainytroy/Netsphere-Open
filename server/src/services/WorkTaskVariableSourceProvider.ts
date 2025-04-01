import { AppDataSource } from '../database';
import { WorkTask } from '../models/WorkTask';
import { Variable, VariableType } from '../models/Variable';
import { VariableSourceProvider } from './VariableSourceRegistry';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { workTaskVariableService } from './WorkTaskVariableService';
import { Repository } from 'typeorm';

/**
 * 工作任务变量源提供者
 * 负责将工作任务的输入和输出转换为变量格式，并在工作任务变更时同步变量
 * 使用WorkTaskVariableService进行实际的变量操作
 */
export class WorkTaskVariableSourceProvider implements VariableSourceProvider {
  private eventPublisher: VariableEventPublisher;
  private variableRepo: Repository<Variable>;
  
  constructor() {
    this.eventPublisher = VariableEventPublisher.getInstance();
    this.variableRepo = AppDataSource.getRepository(Variable);
    
    // 监听工作任务相关的变量事件
    this.eventPublisher.subscribe(VariableEventType.SOURCE_RENAMED, (payload) => {
      if (payload.sourceType === this.getSourceType()) {
        console.log(`工作任务重命名: ${payload.oldSourceName} -> ${payload.newSourceName}`);
      }
    });
  }
  
  /**
   * 获取所有工作任务相关变量
   * 注意：此方法不会保存变量到数据库，仅用于查询
   */
  public async getVariables(): Promise<Variable[]> {
    try {
      const workTaskRepo = AppDataSource.getRepository(WorkTask);
      const workTasks = await workTaskRepo.find();
      
      const variables: Variable[] = [];
      
      // 为每个工作任务获取变量
      for (const task of workTasks) {
        // 确保task.id存在
        if (!task.id) {
          console.error(`工作任务 ${task.name} 没有ID，跳过创建变量`);
          continue;
        }
        
        // 使用WorkTaskVariableService创建变量对象，但不保存到数据库
        const taskVariables = await this.createTaskVariables(task);
        variables.push(...taskVariables);
      }
      
      return variables;
    } catch (error) {
      console.error("获取工作任务变量失败:", error);
      return [];
    }
  }
  
  /**
   * 为单个工作任务创建变量对象（不保存到数据库）
   */
  private async createTaskVariables(task: WorkTask): Promise<Variable[]> {
    // 使用内存变量保存结果
    const variables: Variable[] = [];
    
    // 输入变量
    const inputVar = {
      id: `task_${task.id}_input`,
      name: task.name, // 修改为任务名称，而不是字段显示名称
      value: task.input || '',
      type: VariableType.TASK,
      source: { id: task.id, name: task.name, type: 'work_task' },
      identifier: `@gv_task_${task.id}_input-=`,
      displayIdentifier: `@${task.name}.input#${task.id.substring(0, 4)}`,
      entityId: task.id,
      fieldname: 'input',
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Variable;
    variables.push(inputVar);
    
    // 输出变量
    const outputVar = {
      id: `task_${task.id}_output`,
      name: task.name, // 修改为任务名称，而不是字段显示名称
      value: task.output || '',
      type: VariableType.TASK,
      source: { id: task.id, name: task.name, type: 'work_task' },
      identifier: `@gv_task_${task.id}_output-=`,
      displayIdentifier: `@${task.name}.output#${task.id.substring(0, 4)}`,
      entityId: task.id,
      fieldname: 'output',
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Variable;
    variables.push(outputVar);
    
    return variables;
  }
  
  /**
   * 同步所有工作任务变量到数据库
   * 此方法会将工作任务的所有变量保存到数据库中
   */
  public async syncVariablesToDatabase(): Promise<void> {
    try {
      console.log('开始同步工作任务变量到数据库...');
      
      // 获取所有工作任务
      const workTaskRepo = AppDataSource.getRepository(WorkTask);
      const workTasks = await workTaskRepo.find();
      
      // 对每个工作任务进行操作，使用WorkTaskVariableService
      let totalSyncedVariables = 0;
      
      for (const task of workTasks) {
        if (!task.id) continue;
        
        const variables = await workTaskVariableService.syncTaskVariables(task);
        totalSyncedVariables += variables.length;
      }
      
      console.log(`成功同步 ${totalSyncedVariables} 个工作任务变量到数据库`);
    } catch (error) {
      console.error('同步工作任务变量到数据库失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除工作任务相关的变量
   * @param taskId 工作任务的ID
   * @param taskName 工作任务的名称
   * @returns 成功删除的变量数量
   */
  public async deleteWorkTaskVariables(taskId: string, taskName: string): Promise<number> {
    try {
      console.log(`开始删除工作任务变量操作 | 任务 ID: ${taskId} | 任务名称: ${taskName}`);
      
      // 使用WorkTaskVariableService删除变量
      await workTaskVariableService.deleteTaskVariables(taskId);
      
      // 返回成功，确切数量由服务处理
      return 1;
    } catch (error: any) {
      console.error(`删除工作任务(ID: ${taskId})变量时发生错误:`, error);
      throw error;
    }
  }
  
  /**
   * 监听工作任务变化并同步变量
   * @param callback 变更回调函数
   */
  public subscribeToChanges(
    callback: (action: 'create' | 'update' | 'delete', variables: Variable[]) => void
  ): void {
    console.log('工作任务变量源已注册变更监听');
    
    // 初始同步一次
    this.syncVariablesToDatabase().catch(error => {
      console.error('初始同步工作任务变量失败:', error);
    });
  }
  
  /**
   * 获取变量源类型标识
   */
  public getSourceType(): string {
    return 'work_task';
  }
}
