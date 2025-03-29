import { AppDataSource } from '../database';
import { Variable, VariableType, CreateVariableDto, UpdateVariableDto } from '../models/Variable';
import { IdentifierFormatterService } from './IdentifierFormatterService';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { VariableSourceRegistry } from './VariableSourceRegistry';

/**
 * 变量管理服务
 * 处理全局变量的CRUD操作
 * 支持多种变量标识符格式:
 * - 显示标识符格式: @来源.字段 或 @来源.字段#ID
 * - 系统标识符格式: @gv_UUID_字段
 */
export class VariableService {
  private identifierFormatter: IdentifierFormatterService;
  private eventPublisher: VariableEventPublisher;
  private sourceRegistry: VariableSourceRegistry;
  
  constructor() {
    this.identifierFormatter = IdentifierFormatterService.getInstance();
    this.eventPublisher = VariableEventPublisher.getInstance();
    this.sourceRegistry = VariableSourceRegistry.getInstance();
  }
  
  /**
   * 获取所有变量
   * @param filters 可选的过滤条件
   */
  public async getVariables(filters?: { type?: VariableType, sourceId?: string }): Promise<Variable[]> {
    try {
      // 1. 从数据库获取存储的变量
      const variableRepo = AppDataSource.getRepository(Variable);
      
      // 构建查询条件
      const whereClause: any = {};
      
      if (filters?.type) {
        whereClause.type = filters.type;
      }
      
      if (filters?.sourceId) {
        whereClause.source = { id: filters.sourceId };
      }
      
      // 执行查询
      const databaseVariables = await variableRepo.find({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        order: {
          type: 'ASC',
          source: { name: 'ASC' },
          name: 'ASC'
        }
      });
      
      // 2. 从所有注册的变量源获取动态变量
      let sourceVariables: Variable[] = [];
      try {
        // 获取所有变量源
        const sources = this.sourceRegistry.getSources();
        console.log(`从 ${sources.length} 个变量源获取变量...`);
        
        // 并行从所有变量源获取变量
        const sourcesVariablesPromises = sources.map(source => source.getVariables());
        const sourcesVariablesArrays = await Promise.all(sourcesVariablesPromises);
        
        // 合并所有变量源的变量
        sourceVariables = sourcesVariablesArrays.flat();
        console.log(`成功获取 ${sourceVariables.length} 个源变量`);
        
        // 应用过滤条件
        if (filters?.type) {
          sourceVariables = sourceVariables.filter(v => v.type === filters.type);
        }
        
        if (filters?.sourceId) {
          sourceVariables = sourceVariables.filter(v => v.source.id === filters.sourceId);
        }
      } catch (error) {
        console.error('从变量源获取变量失败:', error);
        // 继续执行，至少返回数据库中的变量
      }
      
      // 3. 直接合并所有变量，不进行去重
      console.log('合并数据库变量和源变量...');
      
      // 合并两个数组
      const allVariables = [...databaseVariables, ...sourceVariables];
      console.log(`合并完成，总共 ${allVariables.length} 个变量（数据库: ${databaseVariables.length} + 源变量: ${sourceVariables.length}）`);
      
      // 按类型和名称排序
      return allVariables.sort((a, b) => {
        // 首先按类型排序
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        
        // 然后按来源名称排序
        if (a.source.name !== b.source.name) {
          return a.source.name.localeCompare(b.source.name);
        }
        
        // 最后按变量名称排序
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('获取变量失败:', error);
      throw error;
    }
  }
  
  /**
   * 根据ID获取变量
   * @param id 变量ID
   */
  public async getVariableById(id: string): Promise<Variable> {
    const variableRepo = AppDataSource.getRepository(Variable);
    const variable = await variableRepo.findOne({ where: { id } });
    
    if (!variable) {
      throw new Error(`变量不存在: ${id}`);
    }
    
    return variable;
  }
  
  /**
   * 创建自定义变量
   * @param variableData 变量数据
   */
  public async createVariable(variableData: Omit<Variable, 'id' | 'type' | 'source' | 'identifier' | 'createdAt' | 'updatedAt'>): Promise<Variable> {
    const variableRepo = AppDataSource.getRepository(Variable);
    
    // 确保有entityId，使用时间戳作为唯一标识
    const entityId = variableData.entityId || `${new Date().getTime()}`;
    
    // 创建新的自定义变量
    const newVariable = variableRepo.create({
      ...variableData,
      entityId, // 确保有entityId
      type: VariableType.CUSTOM,
      source: {
        id: 'custom',
        name: '自定义变量',
        type: 'custom'
      },
      // 使用新的标识符格式
      identifier: this.identifierFormatter.formatIdentifier('custom', variableData.name, 'value', entityId)
    });
    
    // 设置displayIdentifier字段，用于UI显示
    // 关键修复: 使用变量的名称而不是固定的source.name
    newVariable.displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
      'custom', 
      variableData.name, // 使用变量的实际名称
      'value', 
      entityId
    );
    
    // 检查标识符是否已存在
    const existingVariable = await variableRepo.findOne({ 
      where: { identifier: newVariable.identifier } 
    });
    
    if (existingVariable) {
      throw new Error(`标识符已存在: ${newVariable.identifier}`);
    }
    
    // 保存变量
    const savedVariable = await variableRepo.save(newVariable);
    
    // 发布创建事件
    this.eventPublisher.publish(VariableEventType.CREATED, savedVariable);
    
    return savedVariable;
  }
  
  /**
   * 更新自定义变量
   * @param id 变量ID
   * @param variableData 更新数据
   */
  public async updateVariable(id: string, variableData: UpdateVariableDto): Promise<Variable> {
    const variableRepo = AppDataSource.getRepository(Variable);
    
    // 获取变量
    const variable = await this.getVariableById(id);
    
    // 只允许更新自定义类型的变量
    if (variable.type !== VariableType.CUSTOM) {
      throw new Error(`只能更新自定义变量，当前变量类型: ${variable.type}`);
    }
    
    // 检查是否修改了名称
    const nameChanged = variableData.name && variableData.name !== variable.name;
    
    // 更新变量属性
    if (variableData.name) {
      variable.name = variableData.name;
    }
    
    if (variableData.value !== undefined) {
      variable.value = variableData.value;
    }
    
    // 如果名称改变，更新标识符
    if (nameChanged) {
      // 确保有entityId，如果没有则使用id
      const entityId = variable.entityId || variable.id;
      
      const newIdentifier = this.identifierFormatter.formatIdentifier(
        'custom',
        variable.name,
        'value',
        entityId
      );
      
      // 检查新标识符是否已存在
      const existingVariable = await variableRepo.findOne({ 
        where: { identifier: newIdentifier } 
      });
      
      if (existingVariable && existingVariable.id !== id) {
        throw new Error(`标识符已存在: ${newIdentifier}`);
      }
      
      variable.identifier = newIdentifier;
      
      // 更新显示标识符
      variable.displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
        'custom',
        variable.name, // 使用变量的实际名称
        'value',
        entityId
      );
    }
    
    // 保存更新
    const updatedVariable = await variableRepo.save(variable);
    
    // 发布更新事件
    this.eventPublisher.publish(VariableEventType.UPDATED, updatedVariable);
    
    return updatedVariable;
  }
  
  /**
   * 通过系统标识符获取变量
   * 支持格式: @gv_UUID_field
   * @param identifier 系统标识符
   * @returns 变量对象，如果不存在则返回null
   */
  public async getVariableBySystemIdentifier(identifier: string): Promise<Variable | null> {
    try {
      // 检查标识符格式
      const match = identifier.match(/@gv_([a-zA-Z0-9\-]+)_([a-zA-Z0-9_]+)/);
      if (!match) {
        console.warn(`无效的系统标识符格式: ${identifier}`);
        return null;
      }
      
      const uuid = match[1];
      const field = match[2];
      
      console.log(`解析系统标识符: ${identifier} -> uuid=${uuid}, field=${field}`);
      
      // 1. 从数据库查找
      const variableRepo = AppDataSource.getRepository(Variable);
      const variable = await variableRepo.findOne({ 
        where: { 
          id: uuid,  // 匹配UUID
          name: field // 匹配字段名
        } 
      });
      
      if (variable) {
        console.log(`在数据库中找到变量: ${variable.id} (${variable.name})`);
        return variable;
      }
      
      // 2. 从变量源中查找
      try {
        // 使用注册表的方法获取带有UUID的变量
        const variables = await this.sourceRegistry.getVariablesByUUID(uuid);
        
        // 查找匹配字段的变量
        const matchingVariable = variables.find(v => v.name === field);
        if (matchingVariable) {
          console.log(`在变量源中找到变量: ${matchingVariable.id} (${matchingVariable.name})`);
          return matchingVariable;
        }
      } catch (error) {
        console.error(`从变量源获取UUID变量失败:`, error);
        // 继续其他查找方式
      }
      
      // 3. 通过标识符直接查找
      const allVariables = await this.getVariables();
      const matchByIdentifier = allVariables.find(v => v.identifier === identifier);
      
      if (matchByIdentifier) {
        console.log(`通过标识符找到变量: ${matchByIdentifier.id} (${matchByIdentifier.name})`);
        return matchByIdentifier;
      }
      
      console.log(`未找到系统标识符对应的变量: ${identifier}`);
      return null;
    } catch (error) {
      console.error(`通过系统标识符获取变量失败: ${identifier}`, error);
      throw error;
    }
  }
  
  /**
   * 通过短ID和字段名获取变量
   * 支持格式: @source.field#shortId
   * @param shortId 变量短ID（UUID的前几位）
   * @param field 字段名称
   * @returns 变量对象，如果不存在则返回null
   */
  public async getVariableByShortId(shortId: string, field: string): Promise<Variable | null> {
    try {
      // 获取所有变量
      const allVariables = await this.getVariables();
      
      // 查找匹配短ID和字段名的变量
      const matchingVariable = allVariables.find(variable => {
        // 检查变量ID是否以shortId开头
        const isIdMatch = variable.id.startsWith(shortId);
        // 检查字段名是否匹配
        const isFieldMatch = variable.name === field;
        
        return isIdMatch && isFieldMatch;
      });
      
      if (matchingVariable) {
        console.log(`通过短ID找到变量: ${matchingVariable.id} (${matchingVariable.name})`);
        return matchingVariable;
      }
      
      console.log(`未找到匹配短ID和字段的变量: shortId=${shortId}, field=${field}`);
      return null;
    } catch (error) {
      console.error(`通过短ID获取变量失败: ${shortId}, ${field}`, error);
      throw error;
    }
  }
  
  /**
   * 删除变量
   * @param id 变量ID
   */
  public async deleteVariable(id: string): Promise<void> {
    const variableRepo = AppDataSource.getRepository(Variable);
    
    // 获取变量
    const variable = await this.getVariableById(id);
    
    // 只允许删除自定义类型的变量
    if (variable.type !== VariableType.CUSTOM) {
      throw new Error(`只能删除自定义变量，当前变量类型: ${variable.type}`);
    }
    
    // 保存变量副本用于发布事件
    const variableCopy = { ...variable };
    
    // 删除变量
    await variableRepo.remove(variable);
    
    // 发布删除事件
    this.eventPublisher.publish(VariableEventType.DELETED, variableCopy);
  }
}

// 导出单例实例
export const variableService = new VariableService();
