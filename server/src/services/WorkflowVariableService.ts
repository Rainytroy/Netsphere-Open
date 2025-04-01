import { Variable, VariableType } from '../models/Variable';
import { AppDataSource } from '../database';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { IdentifierFormatterService } from './IdentifierFormatterService';
import { v4 as uuidv4 } from 'uuid';
import { In } from 'typeorm';

/**
 * 工作流变量服务
 * 提供工作流变量管理功能
 */
class WorkflowVariableService {
  private identifierFormatter: IdentifierFormatterService;
  
  constructor() {
    this.identifierFormatter = IdentifierFormatterService.getInstance();
  }
  /**
   * 获取工作流变量
   * @param workflowId 工作流ID
   */
  async getWorkflowVariables(workflowId: string): Promise<Variable[]> {
    try {
      const variableRepo = AppDataSource.getRepository(Variable);
      const variables = await variableRepo.find({
        where: {
          type: VariableType.WORKFLOW,
          entityId: workflowId
        }
      });
      
      return variables;
    } catch (error) {
      console.error(`获取工作流 ${workflowId} 变量失败:`, error);
      throw error;
    }
  }
  
  /**
   * 创建工作流变量对象
   * 类似于NPC的实现，确保所有变量使用相同的工作流ID
   * @param workflowId 工作流ID
   * @param workflowName 工作流名称
   * @param field 字段名
   * @param value 变量值
   */
  private createWorkflowVariable(
    workflowId: string,
    workflowName: string,
    field: string,
    value: string | null | undefined
  ): Variable {
    // 确保值不为null或undefined，替换为空字符串
    const safeValue = value === null || value === undefined ? "" : String(value);
    // 使用更稳健的方法生成短ID
    let shortId;
    
    // 如果是标准UUID格式，取前4位作为短ID
    if (workflowId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      shortId = workflowId.substring(0, 4);
    } else {
      // 如果是其他格式（如节点ID），使用哈希函数生成一个4字符的标识符
      const hash = Array.from(workflowId).reduce(
        (acc, char) => ((acc * 31 + char.charCodeAt(0)) & 0xFFFFFFFF), 0
      ).toString(16).substring(0, 4);
      shortId = hash;
    }
    
    // 使用IdentifierFormatterService生成标准格式的标识符
    const systemIdentifier = this.identifierFormatter.formatIdentifier(
      'workflow',
      workflowName,
      field,
      workflowId
    );
    
    const displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
      'workflow',
      workflowName,
      field,
      workflowId
    );
    
    // 创建变量对象
    const variable: any = {
      id: this.identifierFormatter.formatDatabaseId('workflow', workflowId, field), // 使用标准的数据库ID格式
      name: workflowName, // 修改为只保存工作流名称，而不包含字段名
      value: safeValue,
      type: VariableType.WORKFLOW,
      source: {
        id: workflowId,
        name: workflowName,
        type: 'workflow'
      },
      identifier: systemIdentifier,
      displayIdentifier: displayIdentifier,
      entityId: workflowId,
      fieldname: field, // 添加fieldname字段，适配v3.0
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return variable;
  }
  
  /**
   * 创建或更新工作流变量
   * @param workflowId 工作流ID
   * @param workflowName 工作流名称
   * @param field 字段名
   * @param value 变量值
   */
  async createOrUpdateWorkflowVariable(
    workflowId: string,
    workflowName: string,
    field: string,
    value: string
  ): Promise<Variable> {
    try {
      const variableRepo = AppDataSource.getRepository(Variable);
      
      // 使用创建工作流变量方法创建变量
      const newVariable = this.createWorkflowVariable(workflowId, workflowName, field, value);
      const systemIdentifier = newVariable.identifier;
      
      // 先根据系统标识符查找是否已存在变量
      let variable = await variableRepo.findOne({
        where: { identifier: systemIdentifier }
      });
      
      // 如果找不到，尝试通过entityId和字段名查找（兼容旧数据）
      if (!variable) {
        variable = await variableRepo.findOne({
          where: { 
            entityId: workflowId,
            type: VariableType.WORKFLOW,
            fieldname: field
          }
        });
        
        // 如果通过entityId找到了变量，但标识符不一致，更新标识符
        if (variable && variable.identifier !== systemIdentifier) {
          console.log(`[WorkflowVariableService] 更新变量标识符: ${variable.identifier} -> ${systemIdentifier}`);
          variable.identifier = systemIdentifier;
          variable.displayIdentifier = newVariable.displayIdentifier;
        }
      }
      
      if (variable) {
        // 更新变量
        variable.value = value;
        await variableRepo.save(variable);
        
        // 发布变量更新事件
        const eventPublisher = VariableEventPublisher.getInstance();
        eventPublisher.publish(VariableEventType.UPDATED, variable);
        
        return variable;
      } else {
        // 使用直接创建的变量对象保存
        try {
          // 保存新变量
          const savedVariable = await variableRepo.save(newVariable);
          
          // 发布变量创建事件
          const eventPublisher = VariableEventPublisher.getInstance();
          eventPublisher.publish(VariableEventType.CREATED, savedVariable);
          
          return savedVariable;
        } catch (error) {
          console.error(`[WorkflowVariableService] 创建变量时出错:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error(`创建或更新工作流变量 ${workflowId} - ${field} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 删除工作流变量
   * @param workflowId 工作流ID
   * @param field 可选，字段名。不提供则删除所有变量
   */
  async deleteWorkflowVariables(workflowId: string, field?: string): Promise<void> {
    try {
      const variableRepo = AppDataSource.getRepository(Variable);
      const eventPublisher = VariableEventPublisher.getInstance();
      
      if (field) {
        // 删除指定字段的变量
        // 使用工作流ID和字段名查找
        const variable = await variableRepo.findOne({
          where: {
            entityId: workflowId,
            type: VariableType.WORKFLOW,
            fieldname: field
          }
        });
        
        if (variable) {
          await variableRepo.remove(variable);
          
          // 发布变量删除事件
          eventPublisher.publish(VariableEventType.DELETED, variable);
        }
      } else {
        // 删除所有工作流相关变量
        const variables = await variableRepo.find({
          where: {
            type: VariableType.WORKFLOW,
            entityId: workflowId
          }
        });
        
        if (variables.length > 0) {
          await variableRepo.remove(variables);
          
          // 逐个发布变量删除事件
          for (const variable of variables) {
            eventPublisher.publish(VariableEventType.DELETED, variable);
          }
        }
      }
    } catch (error) {
      console.error(`删除工作流变量 ${workflowId} ${field ? `- ${field}` : ''} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 创建或更新工作流输出变量
   * @param workflowId 工作流ID
   * @param workflowName 工作流名称
   * @param outputNumber 输出编号
   * @param value 输出值
   */
  async createOrUpdateOutputVariable(
    workflowId: string,
    workflowName: string,
    outputNumber: number,
    value: string
  ): Promise<Variable> {
    try {
      // 输出变量字段名
      const field = `output_${outputNumber}`;
      
      // 复用创建或更新工作流变量的方法
      return await this.createOrUpdateWorkflowVariable(
        workflowId,
        workflowName,
        field,
        value
      );
    } catch (error) {
      console.error(`创建或更新工作流输出变量 ${workflowId} - ${outputNumber} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 删除工作流输出变量
   * @param workflowId 工作流ID
   * @param outputNumber 输出编号
   */
  async deleteOutputVariable(
    workflowId: string,
    outputNumber: number
  ): Promise<void> {
    try {
      // 输出变量字段名
      const field = `output_${outputNumber}`;
      
      // 复用删除工作流变量的方法
      await this.deleteWorkflowVariables(workflowId, field);
    } catch (error) {
      console.error(`删除工作流输出变量 ${workflowId} - ${outputNumber} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 初始化工作流基本变量
   * 使用批量创建方法，确保所有变量使用相同的UUID
   * @param workflowId 工作流ID
   * @param name 工作流名称
   * @param description 工作流描述
   * @param isActive 工作流是否激活
   */
  async initWorkflowBaseVariables(
    workflowId: string,
    name: string,
    description: string = '',
    isActive: boolean = false
  ): Promise<void> {
    try {
      // 获取现有变量值
      const existingVariables = await this.getWorkflowVariables(workflowId);
      const existingValues = new Map();
      
      // 提取现有变量的值
      existingVariables.forEach(v => {
        existingValues.set(v.fieldname, v.value);
      });
      
      // 创建所有基本变量，保留已有值
      const variables: Variable[] = [
        this.createWorkflowVariable(workflowId, name, 'name', name),
        this.createWorkflowVariable(
          workflowId, 
          name, 
          'description', 
          existingValues.get('description') || description
        ),
        this.createWorkflowVariable(
          workflowId, 
          name, 
          'status', 
          existingValues.get('status') || (isActive ? '活跃' : '非活跃')
        ),
        this.createWorkflowVariable(
          workflowId, 
          name, 
          'startinput', 
          existingValues.get('startinput') || ''
        )
      ];
      
      // 批量保存变量到数据库
      const variableRepo = AppDataSource.getRepository(Variable);
      await variableRepo.save(variables);
      
      // 发布变量创建事件
      const eventPublisher = VariableEventPublisher.getInstance();
      for (const variable of variables) {
        eventPublisher.publish(VariableEventType.CREATED, variable);
      }
      
      console.log(`[WorkflowVariableService] 工作流 ${workflowId} 的基本变量初始化完成 (${variables.length} 个变量)`);
    } catch (error) {
      console.error(`初始化工作流基本变量 ${workflowId} 失败:`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const workflowVariableService = new WorkflowVariableService();
