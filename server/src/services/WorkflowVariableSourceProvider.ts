import { Variable, VariableType } from '../models/Variable';
import { VariableSourceProvider } from './VariableSourceRegistry';
import { AppDataSource } from '../database';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { workflowVariableService } from './WorkflowVariableService';

/**
 * 工作流变量源提供者
 * 实现VariableSourceProvider接口，将工作流变量注册为变量源
 * 与其他变量源提供者（如NPC、工作任务）完全隔离
 */
export class WorkflowVariableSourceProvider implements VariableSourceProvider {
  private variableListeners: ((action: 'create' | 'update' | 'delete', variables: Variable[]) => void)[] = [];
  
  constructor() {
    // 订阅变量事件，以便在变量变更时通知监听器
    const eventPublisher = VariableEventPublisher.getInstance();
    
    eventPublisher.subscribe(VariableEventType.CREATED, (variable: Variable) => {
      if (variable.type === VariableType.WORKFLOW) {
        this.notifyListeners('create', [variable]);
      }
    });
    
    eventPublisher.subscribe(VariableEventType.UPDATED, (variable: Variable) => {
      if (variable.type === VariableType.WORKFLOW) {
        this.notifyListeners('update', [variable]);
      }
    });
    
    eventPublisher.subscribe(VariableEventType.DELETED, (variable: Variable) => {
      if (variable.type === VariableType.WORKFLOW) {
        this.notifyListeners('delete', [variable]);
      }
    });
  }
  
  /**
   * 获取所有工作流变量
   */
  public async getVariables(): Promise<Variable[]> {
    try {
      // 从数据库获取所有工作流变量
      const variableRepo = AppDataSource.getRepository(Variable);
      const variables = await variableRepo.find({
        where: { type: VariableType.WORKFLOW }
      });
      
      return variables;
    } catch (error) {
      console.error('WorkflowVariableSourceProvider: 获取工作流变量失败:', error);
      return [];
    }
  }
  
  /**
   * 通过UUID获取工作流变量
   * @param uuid 工作流UUID
   */
  public async getVariablesByUUID(uuid: string): Promise<Variable[]> {
    try {
      // 查找与该UUID关联的工作流变量
      const variableRepo = AppDataSource.getRepository(Variable);
      const variables = await variableRepo.find({
        where: { 
          type: VariableType.WORKFLOW,
          entityId: uuid
        }
      });
      
      return variables;
    } catch (error) {
      console.error(`WorkflowVariableSourceProvider: 通过UUID获取工作流变量失败: ${uuid}`, error);
      return [];
    }
  }
  
  /**
   * 订阅变量变更
   * @param callback 变量变更回调函数
   */
  public subscribeToChanges(callback: (action: 'create' | 'update' | 'delete', variables: Variable[]) => void): void {
    this.variableListeners.push(callback);
  }
  
  /**
   * 获取变量源类型标识
   * @returns 变量源类型
   */
  public getSourceType(): string {
    return 'workflow';
  }
  
  /**
   * 通知所有监听器
   * @param action 动作类型
   * @param variables 变量列表
   */
  private notifyListeners(action: 'create' | 'update' | 'delete', variables: Variable[]): void {
    for (const listener of this.variableListeners) {
      try {
        listener(action, variables);
      } catch (error) {
        console.error(`WorkflowVariableSourceProvider: 通知监听器失败: ${error}`);
      }
    }
  }
  
  /**
   * 同步工作流变量到数据库
   * 在服务器启动时调用，确保数据库中的变量与当前工作流状态一致
   */
  public async syncVariablesToDatabase(): Promise<void> {
    try {
      // 获取所有工作流（可能需要从工作流服务获取）
      // 这里需要根据项目实际情况实现
      const workflowRepo = AppDataSource.getRepository('Workflow');
      
      if (!workflowRepo) {
        return;
      }
      
      const workflows = await workflowRepo.find();
      
      // 同步工作流基本变量
      for (const workflow of workflows) {
        try {
          await this.syncWorkflowVariables(workflow);
        } catch (error) {
          console.error(`WorkflowVariableSourceProvider: 同步工作流 ${workflow.id} 变量失败:`, error);
        }
      }
    } catch (error) {
      console.error('WorkflowVariableSourceProvider: 同步工作流变量失败:', error);
    }
  }
  
  /**
   * 同步单个工作流的变量
   * @param workflow 工作流对象
   */
  private async syncWorkflowVariables(workflow: any): Promise<void> {
    const variableRepo = AppDataSource.getRepository(Variable);
    
    try {
      // 使用WorkflowVariableService初始化基本变量
      // 这确保所有工作流变量使用相同的标识符生成逻辑
      await workflowVariableService.initWorkflowBaseVariables(
        workflow.id,
        workflow.name,
        workflow.description || '',
        workflow.isActive || false
      );
      
      // 同步输出变量可以根据实际情况添加
      
    } catch (error) {
      console.error(`WorkflowVariableSourceProvider: 同步工作流 ${workflow.id} 变量失败:`, error);
    }
  }
}
