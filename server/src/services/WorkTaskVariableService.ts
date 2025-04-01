import { Variable, VariableType } from '../models/Variable';
import { AppDataSource } from '../database';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { IdentifierFormatterService } from './IdentifierFormatterService';
import { WorkTask } from '../models/WorkTask';
import { Repository } from 'typeorm';

/**
 * 工作任务变量服务
 * 提供工作任务变量管理功能，确保工作任务变量与工作任务实体同步
 */
class WorkTaskVariableService {
  private variableRepo: Repository<Variable>;
  private identifierFormatter: IdentifierFormatterService;
  private eventPublisher: VariableEventPublisher;
  
  // 字段映射常量
  private static readonly FIELD_MAPPING: Record<string, string> = {
    'input': 'input', // 保持英文一致
    'output': 'output', // 保持英文一致
  };
  
  // 字段显示名称
  private static readonly FIELD_DISPLAY_NAMES: Record<string, string> = {
    'input': '输入',
    'output': '输出'
  };
  
  constructor() {
    this.variableRepo = AppDataSource.getRepository(Variable);
    this.identifierFormatter = IdentifierFormatterService.getInstance();
    this.eventPublisher = VariableEventPublisher.getInstance();
  }
  
  /**
   * 获取工作任务变量
   * @param taskId 工作任务ID
   */
  async getTaskVariables(taskId: string): Promise<Variable[]> {
    try {
      const variables = await this.variableRepo.find({
        where: {
          type: VariableType.TASK,
          entityId: taskId
        }
      });
      
      return variables;
    } catch (error) {
      console.error(`获取工作任务 ${taskId} 变量失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取字段的显示名称
   * @param field 字段名
   * @returns 字段的显示名称
   */
  private getFieldDisplayName(field: string): string {
    // 使用中文显示名称，但保持标识符使用英文
    const displayName = field in WorkTaskVariableService.FIELD_DISPLAY_NAMES 
      ? WorkTaskVariableService.FIELD_DISPLAY_NAMES[field] 
      : field;
    return displayName;
  }
  
  /**
   * 创建工作任务相关的变量对象
   * @param task 工作任务对象
   * @param field 字段名
   * @param value 变量值
   * @returns 变量对象
   */
  private createTaskVariable(
    task: WorkTask, 
    field: string, 
    value: string | null | undefined
  ): Variable {
    // 确保值不为null或undefined，替换为空字符串
    const safeValue = value === null || value === undefined ? "" : String(value);
    // 确保字段名始终使用英文
    const normalizedField = field in WorkTaskVariableService.FIELD_MAPPING 
      ? WorkTaskVariableService.FIELD_MAPPING[field] 
      : field;
    
    // 确保task.id存在
    if (!task.id) {
      throw new Error(`工作任务 ${task.name} 没有ID，无法创建变量`);
    }
    
    // 使用格式化服务生成标识符
    const identifier = this.identifierFormatter.formatIdentifier(
      'task',
      task.name,
      normalizedField,
      task.id
    );
    
    const displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
      'task',
      task.name,
      normalizedField,
      task.id
    );
    
    // 数据库ID格式
    const dbId = this.identifierFormatter.formatDatabaseId(
      'task',
      task.id,
      normalizedField
    );
    
    // 创建变量对象
    const variable: Variable = {
      id: dbId,
      name: task.name, // 修改为任务的名称，而不是字段显示名称
      value: safeValue,
      type: VariableType.TASK,
      source: {
        id: task.id,
        name: task.name,
        type: 'work_task'
      },
      identifier: identifier,
      displayIdentifier: displayIdentifier,
      entityId: task.id,
      fieldname: normalizedField,
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return variable;
  }
  
  /**
   * 创建或更新工作任务变量
   * @param taskId 工作任务ID
   * @param taskName 工作任务名称
   * @param field 字段名
   * @param value 变量值
   * @returns 变量对象
   */
  async createOrUpdateTaskVariable(
    taskId: string,
    taskName: string,
    field: string,
    value: string
  ): Promise<Variable> {
    try {
      console.log(`[WorkTaskVariableService] 创建或更新工作任务变量: 任务ID=${taskId}, 字段=${field}`);
      
      // 构造一个简单的工作任务对象用于创建变量
      const task: WorkTask = {
        id: taskId,
        name: taskName
      } as WorkTask;
      
      // 创建变量对象
      const newVariable = this.createTaskVariable(task, field, value);
      
      // 生成系统标识符
      const systemIdentifier = newVariable.identifier;
      
      // 检查变量是否已存在
      let variable = await this.variableRepo.findOne({
        where: { identifier: systemIdentifier }
      });
      
      // 如果找不到，通过entityId和字段名再次查找（兼容旧数据）
      if (!variable) {
        variable = await this.variableRepo.findOne({
          where: { 
            entityId: taskId,
            type: VariableType.TASK,
            fieldname: field
          }
        });
        
        // 如果通过entityId找到了变量，但标识符不一致，更新标识符
        if (variable && variable.identifier !== systemIdentifier) {
          console.log(`[WorkTaskVariableService] 更新变量标识符: ${variable.identifier} -> ${systemIdentifier}`);
          variable.identifier = systemIdentifier;
          variable.displayIdentifier = newVariable.displayIdentifier;
        }
      }
      
      if (variable) {
        // 更新变量
        variable.value = value;
        await this.variableRepo.save(variable);
        
        // 发布变量更新事件
        this.eventPublisher.publish(VariableEventType.UPDATED, variable);
        
        return variable;
      } else {
        // 使用创建的变量对象保存
        try {
          // 保存新变量
          const savedVariable = await this.variableRepo.save(newVariable);
          
          // 发布变量创建事件
          this.eventPublisher.publish(VariableEventType.CREATED, savedVariable);
          
          console.log(`[WorkTaskVariableService] 成功创建新变量: ${savedVariable.id}, 标识符: ${savedVariable.identifier}`);
          return savedVariable;
        } catch (error) {
          console.error(`[WorkTaskVariableService] 创建变量时出错:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error(`创建或更新工作任务变量 ${taskId} - ${field} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 同步工作任务变量
   * 根据工作任务对象创建或更新所有相关变量
   * @param task 工作任务对象
   */
  async syncTaskVariables(task: WorkTask): Promise<Variable[]> {
    try {
      if (!task || !task.id) {
        throw new Error('无效的工作任务对象');
      }
      
      console.log(`[WorkTaskVariableService] 同步工作任务变量: ${task.id} - ${task.name}`);
      
      // 获取现有变量，检查名称是否需要更新
      const existingVariables = await this.variableRepo.find({
        where: {
          type: VariableType.TASK,
          entityId: task.id
        }
      });
      
      // 检查是否需要更新名称（如果工作任务名称变更）
      if (existingVariables.length > 0) {
        const nameChanged = existingVariables.some(v => v.name !== task.name);
        
        if (nameChanged) {
          console.log(`[WorkTaskVariableService] 检测到工作任务名称变更，更新所有关联变量的name字段`);
          
          // 批量更新所有变量的name字段和source.name字段
          for (const variable of existingVariables) {
            // 更新名称和来源
            variable.name = task.name;
            variable.source.name = task.name;
            
            // 更新显示标识符（包含了名称）
            variable.displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
              'task',
              task.name,
              variable.fieldname,
              task.id
            );
            
            // 保存更新
            await this.variableRepo.save(variable);
            
            // 发布变量更新事件
            this.eventPublisher.publish(VariableEventType.UPDATED, variable);
          }
          
          console.log(`[WorkTaskVariableService] 已更新 ${existingVariables.length} 个变量的名称`);
        }
      }
      
      // 创建或更新各个字段的变量
      const variables: Variable[] = [];
      
      // 输入变量
      const inputVariable = await this.createOrUpdateTaskVariable(
        task.id,
        task.name,
        'input',
        task.input || ''
      );
      variables.push(inputVariable);
      
      // 输出变量
      const outputVariable = await this.createOrUpdateTaskVariable(
        task.id,
        task.name,
        'output',
        task.output || ''
      );
      variables.push(outputVariable);
      
      console.log(`[WorkTaskVariableService] 工作任务 ${task.name} 变量同步完成，共 ${variables.length} 个变量`);
      
      return variables;
    } catch (error) {
      console.error(`同步工作任务变量失败:`, error);
      throw error;
    }
  }
  
  /**
   * 删除工作任务相关的所有变量
   * @param taskId 工作任务ID
   */
  async deleteTaskVariables(taskId: string): Promise<void> {
    try {
      console.log(`[WorkTaskVariableService] 删除工作任务变量: 任务ID=${taskId}`);
      
      // 查找所有相关变量
      const variables = await this.variableRepo.find({
        where: {
          type: VariableType.TASK,
          entityId: taskId
        }
      });
      
      if (variables.length > 0) {
        console.log(`[WorkTaskVariableService] 找到 ${variables.length} 个相关变量，准备删除`);
        
        // 删除变量
        await this.variableRepo.remove(variables);
        
        // 发布变量删除事件
        for (const variable of variables) {
          this.eventPublisher.publish(VariableEventType.DELETED, variable);
        }
        
        console.log(`[WorkTaskVariableService] 成功删除 ${variables.length} 个工作任务变量`);
      } else {
        console.log(`[WorkTaskVariableService] 未找到任务ID=${taskId} 的相关变量`);
      }
    } catch (error) {
      console.error(`删除工作任务变量失败:`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const workTaskVariableService = new WorkTaskVariableService();
