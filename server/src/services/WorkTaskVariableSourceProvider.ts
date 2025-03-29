import { AppDataSource } from '../database';
import { WorkTask } from '../models/WorkTask';
import { Variable, VariableType } from '../models/Variable';
import { VariableSourceProvider } from './VariableSourceRegistry';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { IdentifierFormatterService } from './IdentifierFormatterService';
import { Repository, In, Like } from 'typeorm';

/**
 * 工作任务变量源提供者
 * 负责将工作任务的输入和输出转换为变量格式，并在工作任务变更时同步变量
 */
export class WorkTaskVariableSourceProvider implements VariableSourceProvider {
  private identifierFormatter: IdentifierFormatterService;
  private eventPublisher: VariableEventPublisher;
  private variableRepo: Repository<Variable>;
  
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
    this.identifierFormatter = IdentifierFormatterService.getInstance();
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
      
      // 为每个工作任务创建变量
      for (const task of workTasks) {
        // 确保task.id存在
        if (!task.id) {
          console.error(`工作任务 ${task.name} 没有ID，跳过创建变量`);
          continue;
        }
        
        // 创建输入变量（使用英文字段名）
        variables.push(this.createWorkTaskVariable(task, 'input', task.input));
        
        // 创建输出变量（使用英文字段名）
        variables.push(this.createWorkTaskVariable(task, 'output', task.output || ''));
      }
      
      return variables;
    } catch (error) {
      console.error("获取工作任务变量失败:", error);
      return [];
    }
  }
  
  /**
   * 同步所有工作任务变量到数据库
   * 此方法会将工作任务的所有变量保存到数据库中，并清理错误格式的变量
   */
  public async syncVariablesToDatabase(): Promise<void> {
    try {
      console.log('开始同步工作任务变量到数据库...');
      
      // 获取所有工作任务和它们的正确格式变量
      const variables = await this.getVariables();
      
      // 获取所有标识符，用于查找已存在的变量
      const identifiers = variables.map(v => v.identifier);
      const existingVariables = await this.variableRepo.find({
        where: { identifier: In(identifiers) }
      });
      
      // 创建标识符到变量的映射，用于快速查找
      const existingVariableMap = new Map<string, Variable>();
      for (const variable of existingVariables) {
        existingVariableMap.set(variable.identifier, variable);
      }
      
      // 批量保存所有变量
      const variablesToSave: Variable[] = [];
      
      for (const variable of variables) {
        // 检查变量是否已存在
        const existingVariable = existingVariableMap.get(variable.identifier);
        
        if (existingVariable) {
          // 更新已存在的变量
          existingVariable.value = variable.value;
          variablesToSave.push(existingVariable);
        } else {
          // 添加新变量
          variablesToSave.push(variable);
        }
      }
      
      // 保存所有变量
      await this.variableRepo.save(variablesToSave);
      
      // 查找并清理错误格式的变量（中文字段名）
      await this.cleanupIncorrectVariables();
      
      console.log(`成功同步 ${variablesToSave.length} 个工作任务变量到数据库`);
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
      const timestamp = new Date().toISOString();
      console.info(`[${timestamp}] 开始删除工作任务变量操作 | 任务 ID: ${taskId} | 任务名称: ${taskName}`);
      
      // 记录查询条件
      const whereCondition = {
        type: VariableType.TASK,
        source: {
          id: taskId
        }
      };
      console.log('查询条件:', JSON.stringify(whereCondition, null, 2));
      
      console.log('正在执行第一种查询方式 (使用对象条件)...');
      
      // 查找所有与此工作任务相关的变量 - 方式1：直接对象查询
      let variables = await this.variableRepo.find({
        where: whereCondition
      });
      
      // 记录查询结果
      console.log(`方式1查询结果: 找到 ${variables.length} 个变量`);
      
      // 如果方式1没有找到任何变量，尝试方式2
      if (variables.length === 0) {
        console.log('尝试备用查询方式2 (使用Like操作符)...');
        
        // 方式2：使用Like操作符
        const backupCondition = {
          type: VariableType.TASK,
          source: Like(`%"id":"${taskId}"%`)
        };
        console.log('备用查询条件:', JSON.stringify(backupCondition, null, 2));
        
        variables = await this.variableRepo.find({
          where: backupCondition
        });
        console.log(`方式2查询结果: 找到 ${variables.length} 个变量`);
      }
      
      // 如果方式2仍未找到任何变量，尝试方式3
      if (variables.length === 0) {
        console.log('尝试备用查询方式3 (使用QueryBuilder)...');
        
        // 方式3：使用QueryBuilder
        try {
          variables = await this.variableRepo
            .createQueryBuilder('variable')
            .where('variable.type = :type', { type: VariableType.TASK })
            .andWhere('JSON_EXTRACT(variable.source, "$.id") = :sourceId', { sourceId: taskId })
            .getMany();
            
          console.log(`方式3查询结果: 找到 ${variables.length} 个变量`);
        } catch (queryError: any) {
          console.warn('QueryBuilder查询失败:', queryError.message);
          console.log('数据库可能不支持JSON_EXTRACT函数，跳过此方式');
        }
      }
      
      // 最后一种尝试：找出所有工作任务类型变量并检查其source
      if (variables.length === 0) {
        console.log('尝试备用查询方式4 (获取所有工作任务变量并手动筛选)...');
        
        const allTaskVariables = await this.variableRepo.find({
          where: {
            type: VariableType.TASK
          }
        });
        
        console.log(`总共找到 ${allTaskVariables.length} 个工作任务类型变量，正在手动筛选...`);
        
        // 手动筛选source.id匹配的变量
        variables = allTaskVariables.filter(v => {
          try {
            const source = typeof v.source === 'string' ? JSON.parse(v.source) : v.source;
            const isMatch = source && source.id === taskId;
            
            // 打印每个变量的筛选结果以便排查
            if (isMatch) {
              console.log(`匹配到变量: ID=${v.id}, 标识符=${v.identifier}`);
            }
            
            return isMatch;
          } catch (err: any) {
            console.warn(`变量${v.id}的source解析失败:`, err.message);
            return false;
          }
        });
        
        console.log(`方式4手动筛选结果: 匹配到 ${variables.length} 个变量`);
      }
      
      // 打印每个找到的变量的详细信息
      if (variables.length > 0) {
        console.log(`============ 找到 ${variables.length} 个变量，详细信息如下 ============`);
        variables.forEach((v, index) => {
          const sourceStr = typeof v.source === 'string' ? v.source : JSON.stringify(v.source);
          console.log(`[${index + 1}/${variables.length}] 变量详情:
  ID: ${v.id}
  标识符: ${v.identifier}
  名称: ${v.name}
  类型: ${v.type}
  来源: ${sourceStr}
  创建时间: ${v.createdAt}`);
        });
        console.log('============ 变量详情结束 ============');
      } else {
        console.warn(`警告: 未找到任何与工作任务(ID: ${taskId}, 名称: ${taskName})相关的变量`);
        console.log('请检查以下可能的原因:');
        console.log('1. 工作任务 ID是否正确');
        console.log('2. 变量的source结构是否符合预期');
        console.log('3. 变量中的source.id是否使用了字符串类型而非UUID');
        return 0;
      }
      
      // 删除前保留变量信息用于发布事件
      console.log(`准备删除找到的 ${variables.length} 个变量...`);
      const variableCopies = variables.map(v => ({ ...v }));
      
      // 删除所有变量
      try {
        await this.variableRepo.remove(variables);
        console.log('数据库remove操作成功执行');
      } catch (removeError) {
        console.error('删除变量时发生数据库错误:', removeError);
        throw removeError;
      }
      
      // 发布删除事件
      console.log('发布变量删除事件...');
      for (const variable of variableCopies) {
        try {
          this.eventPublisher.publish(VariableEventType.DELETED, variable);
        } catch (eventError) {
          console.warn(`发布变量(${variable.id})删除事件失败:`, eventError);
          // 继续处理其他变量，不抛出异常
        }
      }
      
      const endTimestamp = new Date().toISOString();
      console.info(`[${endTimestamp}] 工作任务变量删除操作完成 | 成功删除 ${variables.length} 个变量`);
      return variables.length;
    } catch (error: any) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] 删除工作任务(ID: ${taskId})变量时发生错误:`);
      console.error(`错误类型: ${error.name}`);
      console.error(`错误信息: ${error.message}`);
      console.error(`错误栈: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * 清理不正确格式的变量（使用中文字段名的变量）
   */
  private async cleanupIncorrectVariables(): Promise<void> {
    try {
      console.log('开始清理工作任务中不正确格式的变量...');
      
      // 查找所有工作任务的变量
      const variables = await this.variableRepo.find({
        where: { source: { type: 'work_task' } }
      });
      
      // 找出使用中文字段名的变量
      const incorrectVariables = variables.filter(v => {
        const match = v.identifier.match(/@([^.]+)\.(.+)$/);
        if (!match) return false;
        
        const fieldName = match[2];
        // 如果字段名是中文"输入"或"输出"，则认为是不正确的格式
        return fieldName === '输入' || fieldName === '输出';
      });
      
      if (incorrectVariables.length > 0) {
        console.log(`找到 ${incorrectVariables.length} 个不正确格式的工作任务变量，准备清理...`);
        
        // 删除这些变量
        await this.variableRepo.remove(incorrectVariables);
        
        console.log(`成功清理 ${incorrectVariables.length} 个不正确格式的工作任务变量`);
      } else {
        console.log('没有找到不正确格式的工作任务变量');
      }
    } catch (error) {
      console.error('清理不正确格式的工作任务变量失败:', error);
    }
  }
  
  /**
   * 监听工作任务变化并同步变量
   * @param callback 变更回调函数
   */
  public subscribeToChanges(
    callback: (action: 'create' | 'update' | 'delete', variables: Variable[]) => void
  ): void {
    // 这里需要监听工作任务的创建、更新、删除事件
    // 目前系统没有直接的工作任务事件机制，可以在后续版本中实现
    // 现在我们通过WorkTaskService中的createOrUpdateVariable方法直接同步变量
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
  
  /**
   * 创建工作任务相关的变量
   * 始终使用英文字段名称，并添加entityId和isValid字段
   */
  private createWorkTaskVariable(task: WorkTask, field: string, value: string): Variable {
    // 确保字段名始终使用英文
    const normalizedField = field in WorkTaskVariableSourceProvider.FIELD_MAPPING 
      ? WorkTaskVariableSourceProvider.FIELD_MAPPING[field] 
      : field;
    
    // 确保task.id存在
    if (!task.id) {
      throw new Error(`工作任务 ${task.name} 没有ID，无法创建变量`);
    }
    
    // 创建唯一标识符 - 始终使用英文字段名和task.id
    const identifier = this.identifierFormatter.formatIdentifier(
      'task',
      task.name,
      normalizedField,
      task.id // 必须传递ID
    );
    
    // 创建用于显示的标识符 - 对UI友好的格式
    const displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
      'task',
      task.name,
      normalizedField,
      task.id
    );
    
    // 创建变量
    const variable: Variable = {
      id: `task_${task.id}_${normalizedField}`, // 构建一个唯一ID
      name: this.getFieldDisplayName(normalizedField), // 移除任务名称前缀
      value: value,
      type: VariableType.TASK,
      source: {
        id: task.id,
        name: task.name,
        type: 'work_task'
      },
      identifier: identifier,
      displayIdentifier: displayIdentifier, // 添加显示标识符
      // 添加新字段
      entityId: task.id,   // 关联到工作任务的ID
      isValid: true,       // 默认为有效
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return variable;
  }
  
  /**
   * 获取字段的显示名称
   * @param field 字段名
   * @returns 字段的显示名称
   */
  private getFieldDisplayName(field: string): string {
    // 使用中文显示名称，但保持标识符使用英文
    const displayName = field in WorkTaskVariableSourceProvider.FIELD_DISPLAY_NAMES 
      ? WorkTaskVariableSourceProvider.FIELD_DISPLAY_NAMES[field] 
      : field;
    return displayName;
  }
}
