import { Variable, VariableType } from '../models/Variable';
import { AppDataSource } from '../database';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { IdentifierFormatterService } from './IdentifierFormatterService';
import { Npc } from '../models/Npc';
import { Repository } from 'typeorm';

/**
 * NPC变量服务
 * 提供NPC变量管理功能，确保NPC变量与NPC实体同步
 */
class NpcVariableService {
  private variableRepo: Repository<Variable>;
  private identifierFormatter: IdentifierFormatterService;
  private eventPublisher: VariableEventPublisher;
  
  constructor() {
    this.variableRepo = AppDataSource.getRepository(Variable);
    this.identifierFormatter = IdentifierFormatterService.getInstance();
    this.eventPublisher = VariableEventPublisher.getInstance();
  }
  
  /**
   * 获取NPC变量
   * @param npcId NPC ID
   */
  async getNpcVariables(npcId: string): Promise<Variable[]> {
    try {
      const variables = await this.variableRepo.find({
        where: {
          type: VariableType.NPC,
          entityId: npcId
        }
      });
      
      return variables;
    } catch (error) {
      console.error(`获取NPC ${npcId} 变量失败:`, error);
      throw error;
    }
  }
  
  /**
   * 创建NPC相关的变量对象
   * @param npc NPC对象
   * @param field 字段名
   * @param value 变量值
   * @returns 变量对象
   */
  private createNpcVariable(
    npc: Npc, 
    field: string, 
    value: string | null | undefined
  ): Variable {
    // 确保值不为null或undefined，替换为空字符串
    const safeValue = value === null || value === undefined ? "" : String(value);
    // 确保npc.id存在
    if (!npc.id) {
      throw new Error(`NPC ${npc.name} 没有ID，无法创建变量`);
    }
    
    // 使用更稳健的方法生成短ID
    let shortId;
    
    // 如果是标准UUID格式，取前4位作为短ID
    if (npc.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      shortId = npc.id.substring(0, 4);
    } else {
      // 如果是其他格式，使用哈希函数生成一个4字符的标识符
      const hash = Array.from(npc.id).reduce(
        (acc, char) => ((acc * 31 + char.charCodeAt(0)) & 0xFFFFFFFF), 0
      ).toString(16).substring(0, 4);
      shortId = hash;
    }
    
    // 使用格式化服务生成标识符
    const identifier = this.identifierFormatter.formatIdentifier(
      'npc', 
      npc.name, 
      field, 
      npc.id
    );
    
    const displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
      'npc', 
      npc.name, 
      field, 
      npc.id
    );
    
    // 数据库ID格式
    const dbId = this.identifierFormatter.formatDatabaseId(
      'npc',
      npc.id,
      field
    );
    
    // 创建变量对象
    const variable: Variable = {
      id: dbId,
      name: npc.name, // 修改为NPC的名称，而不是字段名
      value: safeValue,
      type: VariableType.NPC,
      source: {
        id: npc.id,
        name: npc.name,
        type: 'npc'
      },
      identifier: identifier,
      displayIdentifier: displayIdentifier,
      entityId: npc.id,
      fieldname: field,
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return variable;
  }
  
  /**
   * 创建或更新NPC变量
   * @param npcId NPC ID
   * @param npcName NPC名称
   * @param field 字段名
   * @param value 变量值
   * @returns 变量对象
   */
  async createOrUpdateNpcVariable(
    npcId: string,
    npcName: string,
    field: string,
    value: string
  ): Promise<Variable> {
    try {
      console.log(`[NpcVariableService] 创建或更新NPC变量: NPC ID=${npcId}, 字段=${field}`);
      
      // 构造一个简单的NPC对象用于创建变量
      const npc: Npc = {
        id: npcId,
        name: npcName
      } as Npc;
      
      // 创建变量对象
      const newVariable = this.createNpcVariable(npc, field, value);
      
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
            entityId: npcId,
            type: VariableType.NPC,
            fieldname: field
          }
        });
        
        // 如果通过entityId找到了变量，但标识符不一致，更新标识符
        if (variable && variable.identifier !== systemIdentifier) {
          console.log(`[NpcVariableService] 更新变量标识符: ${variable.identifier} -> ${systemIdentifier}`);
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
          
          console.log(`[NpcVariableService] 成功创建新变量: ${savedVariable.id}, 标识符: ${savedVariable.identifier}`);
          return savedVariable;
        } catch (error) {
          console.error(`[NpcVariableService] 创建变量时出错:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error(`创建或更新NPC变量 ${npcId} - ${field} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 同步NPC变量
   * 根据NPC对象创建或更新所有相关变量
   * @param npc NPC对象
   */
  async syncNpcVariables(npc: Npc): Promise<Variable[]> {
    try {
      if (!npc || !npc.id) {
        throw new Error('无效的NPC对象');
      }
      
      console.log(`[NpcVariableService] 同步NPC变量: ${npc.id} - ${npc.name}`);
      
      // 获取现有变量，检查名称是否需要更新
      const existingVariables = await this.variableRepo.find({
        where: {
          type: VariableType.NPC,
          entityId: npc.id
        }
      });
      
      // 检查是否需要更新名称（如果NPC名称变更）
      if (existingVariables.length > 0) {
        const nameChanged = existingVariables.some(v => v.name !== npc.name);
        
        if (nameChanged) {
          console.log(`[NpcVariableService] 检测到NPC名称变更，更新所有关联变量的name字段`);
          
          // 批量更新所有变量的name字段和source.name字段
          for (const variable of existingVariables) {
            // 更新名称和来源
            variable.name = npc.name;
            variable.source.name = npc.name;
            
            // 更新显示标识符（包含了名称）
            variable.displayIdentifier = this.identifierFormatter.formatDisplayIdentifier(
              'npc',
              npc.name,
              variable.fieldname,
              npc.id
            );
            
            // 保存更新
            await this.variableRepo.save(variable);
            
            // 发布变量更新事件
            this.eventPublisher.publish(VariableEventType.UPDATED, variable);
          }
          
          console.log(`[NpcVariableService] 已更新 ${existingVariables.length} 个变量的名称`);
        }
      }
      
      // 创建或更新各个字段的变量
      const variables: Variable[] = [];
      
      // 名称变量
      const nameVariable = await this.createOrUpdateNpcVariable(
        npc.id,
        npc.name,
        'name',
        npc.name
      );
      variables.push(nameVariable);
      
      // 知识背景变量
      if (npc.knowledgeBackground !== undefined) {
        const knowledgeVariable = await this.createOrUpdateNpcVariable(
          npc.id,
          npc.name,
          'knowledge',
          npc.knowledgeBackground
        );
        variables.push(knowledgeVariable);
      }
      
      // 行为原则变量
      if (npc.actionPrinciples !== undefined) {
        const actVariable = await this.createOrUpdateNpcVariable(
          npc.id,
          npc.name,
          'act',
          npc.actionPrinciples
        );
        variables.push(actVariable);
      }
      
  // 活跃度变量 - 使用数值
  if (npc.activityLevel !== undefined) {
    const actLevelVariable = await this.createOrUpdateNpcVariable(
      npc.id,
      npc.name,
      'actlv',
      npc.activityLevel.toString()
    );
    variables.push(actLevelVariable);
  }
  
  // 活跃度描述变量 - 使用描述文本
  if (npc.activityLevelDescription) {
    const actLevelDescVariable = await this.createOrUpdateNpcVariable(
      npc.id,
      npc.name,
      'actlvdesc',
      npc.activityLevelDescription
    );
    variables.push(actLevelDescVariable);
  }
      
      // 描述变量
      if (npc.description !== undefined) {
        const descVariable = await this.createOrUpdateNpcVariable(
          npc.id,
          npc.name,
          'description',
          npc.description
        );
        variables.push(descVariable);
      }
      
      console.log(`[NpcVariableService] NPC ${npc.name} 变量同步完成，共 ${variables.length} 个变量`);
      
      return variables;
    } catch (error) {
      console.error(`同步NPC变量失败:`, error);
      throw error;
    }
  }
  
  /**
   * 删除NPC相关的所有变量
   * @param npcId NPC ID
   */
  async deleteNpcVariables(npcId: string): Promise<void> {
    try {
      console.log(`[NpcVariableService] 删除NPC变量: NPC ID=${npcId}`);
      
      // 查找所有相关变量
      const variables = await this.variableRepo.find({
        where: {
          type: VariableType.NPC,
          entityId: npcId
        }
      });
      
      if (variables.length > 0) {
        console.log(`[NpcVariableService] 找到 ${variables.length} 个相关变量，准备删除`);
        
        // 删除变量
        await this.variableRepo.remove(variables);
        
        // 发布变量删除事件
        for (const variable of variables) {
          this.eventPublisher.publish(VariableEventType.DELETED, variable);
        }
        
        console.log(`[NpcVariableService] 成功删除 ${variables.length} 个NPC变量`);
      } else {
        console.log(`[NpcVariableService] 未找到NPC ID=${npcId} 的相关变量`);
      }
    } catch (error) {
      console.error(`删除NPC变量失败:`, error);
      throw error;
    }
  }
}

// 导出单例实例
export const npcVariableService = new NpcVariableService();
