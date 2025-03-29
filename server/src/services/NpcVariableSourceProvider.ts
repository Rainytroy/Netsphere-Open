import { AppDataSource } from '../database';
import { Npc } from '../models/Npc';
import { Variable, VariableType } from '../models/Variable';
import { VariableSourceProvider } from './VariableSourceRegistry';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { IdentifierFormatterService } from './IdentifierFormatterService';
import { Repository, In, Like } from 'typeorm';

/**
 * NPC变量源提供者
 * 负责将NPC数据转换为变量格式，并在NPC变更时同步变量
 */
export class NpcVariableSourceProvider implements VariableSourceProvider {
  private identifierFormatter: IdentifierFormatterService;
  private eventPublisher: VariableEventPublisher;
  private variableRepo: Repository<Variable>;
  
  constructor() {
    this.identifierFormatter = IdentifierFormatterService.getInstance();
    this.eventPublisher = VariableEventPublisher.getInstance();
    this.variableRepo = AppDataSource.getRepository(Variable);
    
    // 监听NPC相关的变量事件
    this.eventPublisher.subscribe(VariableEventType.SOURCE_RENAMED, (payload) => {
      if (payload.sourceType === this.getSourceType()) {
        console.log(`NPC重命名: ${payload.oldSourceName} -> ${payload.newSourceName}`);
      }
    });
  }
  
  /**
   * 获取所有NPC相关变量
   * 注意：此方法不会保存变量到数据库，仅用于查询
   */
  public async getVariables(): Promise<Variable[]> {
    try {
      const npcRepo = AppDataSource.getRepository(Npc);
      const npcs = await npcRepo.find();
      
      const variables: Variable[] = [];
      
      // 为每个NPC创建变量
      for (const npc of npcs) {
        // 创建基本信息变量
        variables.push(this.createNpcVariable(npc, 'name', npc.name));
        variables.push(this.createNpcVariable(npc, 'description', npc.description || ''));
        
        // 创建知识背景变量 (使用新字段名knowledge)
        variables.push(this.createNpcVariable(
          npc, 
          'knowledge', 
          npc.knowledgeBackground
        ));
        
        // 创建行为原则变量 (使用新字段名act)
        variables.push(this.createNpcVariable(
          npc, 
          'act', 
          npc.actionPrinciples
        ));
        
        // 创建活跃度变量 (使用新字段名actlv)
        variables.push(this.createNpcVariable(
          npc, 
          'actlv', 
          npc.activityLevelDescription
        ));
      }
      
      return variables;
    } catch (error) {
      console.error("获取NPC变量失败:", error);
      return [];
    }
  }
  
  /**
   * 同步所有NPC变量到数据库
   * 此方法会将NPC的所有变量保存到数据库中
   */
  public async syncVariablesToDatabase(): Promise<void> {
    try {
      console.log('开始同步NPC变量到数据库...');
      
      // 获取所有NPC和它们的变量
      const variables = await this.getVariables();
      
      // 找出已存在的变量
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
      
      console.log(`成功同步 ${variablesToSave.length} 个NPC变量到数据库`);
    } catch (error) {
      console.error('同步NPC变量到数据库失败:', error);
      throw error;
    }
  }

  /**
   * 删除NPC相关的变量
   * @param npcId NPC的ID
   * @param npcName NPC的名称
   * @returns 成功删除的变量数量
   */
  public async deleteNpcVariables(npcId: string, npcName: string): Promise<number> {
    try {
      const timestamp = new Date().toISOString();
      console.info(`[${timestamp}] 开始删除NPC变量操作 | NPC ID: ${npcId} | NPC名称: ${npcName}`);
      
      // 记录查询条件
      const whereCondition = {
        type: VariableType.NPC,
        source: {
          id: npcId
        }
      };
      console.log('查询条件:', JSON.stringify(whereCondition, null, 2));
      
      console.log('正在执行第一种查询方式 (使用对象条件)...');
      
      // 查找所有与此NPC相关的变量 - 方式1：直接对象查询
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
          type: VariableType.NPC,
          source: Like(`%"id":"${npcId}"%`)
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
            .where('variable.type = :type', { type: VariableType.NPC })
            .andWhere('JSON_EXTRACT(variable.source, "$.id") = :sourceId', { sourceId: npcId })
            .getMany();
            
          console.log(`方式3查询结果: 找到 ${variables.length} 个变量`);
        } catch (queryError: any) {
          console.warn('QueryBuilder查询失败:', queryError.message);
          console.log('数据库可能不支持JSON_EXTRACT函数，跳过此方式');
        }
      }
      
      // 最后一种尝试：找出所有NPC类型变量并检查其source
      if (variables.length === 0) {
        console.log('尝试备用查询方式4 (获取所有NPC变量并手动筛选)...');
        
        const allNpcVariables = await this.variableRepo.find({
          where: {
            type: VariableType.NPC
          }
        });
        
        console.log(`总共找到 ${allNpcVariables.length} 个NPC类型变量，正在手动筛选...`);
        
        // 手动筛选source.id匹配的变量
        variables = allNpcVariables.filter(v => {
          try {
            const source = typeof v.source === 'string' ? JSON.parse(v.source) : v.source;
            const isMatch = source && source.id === npcId;
            
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
        console.warn(`警告: 未找到任何与NPC(ID: ${npcId}, 名称: ${npcName})相关的变量`);
        console.log('请检查以下可能的原因:');
        console.log('1. NPC ID是否正确');
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
      console.info(`[${endTimestamp}] NPC变量删除操作完成 | 成功删除 ${variables.length} 个变量`);
      return variables.length;
    } catch (error: any) {
      const errorTimestamp = new Date().toISOString();
      console.error(`[${errorTimestamp}] 删除NPC(ID: ${npcId})变量时发生错误:`);
      console.error(`错误类型: ${error.name}`);
      console.error(`错误信息: ${error.message}`);
      console.error(`错误栈: ${error.stack}`);
      throw error;
    }
  }
  
  /**
   * 监听NPC变化并同步变量
   * @param callback 变更回调函数
   */
  public subscribeToChanges(
    callback: (action: 'create' | 'update' | 'delete', variables: Variable[]) => void
  ): void {
    // 这里需要监听NPC的创建、更新、删除事件
    // 目前系统没有直接的NPC事件机制，可以在后续版本中实现
    // 现在可以通过定期轮询或更新NpcController来实现同步
    console.log('NPC变量源已注册变更监听');
    
    // 初始同步一次
    this.syncVariablesToDatabase().catch(error => {
      console.error('初始同步NPC变量失败:', error);
    });
  }
  
  /**
   * 获取变量源类型标识
   */
  public getSourceType(): string {
    return 'npc';
  }
  
  /**
   * 创建NPC相关的变量
   */
  private createNpcVariable(npc: Npc, field: string, value: string): Variable {
    // 创建唯一标识符 - 使用新的UUID格式
    const identifier = this.identifierFormatter.formatIdentifier(
      'npc',
      npc.name,
      field,
      npc.id // 传递NPC ID作为第四个参数，生成带ID的新格式标识符 @gv_UUID
    );
    
    // 生成显示用标识符 - 用于UI展示
    const displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
      'npc',
      npc.name,
      field,
      npc.id // 传递NPC ID作为第四个参数，生成显示用标识符 @name.field#1234
    );
    
    // 创建变量，添加displayIdentifier
    const variable: any = {
      id: `npc_${npc.id}_${field}`, // 构建一个唯一ID
      name: this.getFieldDisplayName(field),
      value: value,
      type: VariableType.NPC,
      source: {
        id: npc.id,
        name: npc.name,
        type: 'npc'
      },
      identifier: identifier,
      displayIdentifier: displayIdentifier, // 添加显示用标识符
      // 添加新字段
      entityId: npc.id,    // 关联到NPC的ID
      isValid: true,       // 默认为有效
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return variable;
  }
  
  /**
   * 获取字段的显示名称
   */
  private getFieldDisplayName(field: string): string {
    const displayNames: Record<string, string> = {
      'name': '名称',
      'description': '描述',
      'kb': '知识背景',
      'knowledge': '知识背景', // 新字段名
      'ap': '行为原则',
      'act': '行为原则', // 新字段名
      'al': '活跃度',
      'actlv': '活跃度', // 新字段名
      // 保留旧字段名的映射，以便兼容旧数据
      'knowledge_background': '知识背景',
      'action_principles': '行为原则',
      'activity_level': '活跃度'
    };
    
    return displayNames[field] || field;
  }
}
