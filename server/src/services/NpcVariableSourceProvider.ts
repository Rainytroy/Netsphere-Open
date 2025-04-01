import { AppDataSource } from '../database';
import { Npc } from '../models/Npc';
import { Variable, VariableType } from '../models/Variable';
import { VariableSourceProvider } from './VariableSourceRegistry';
import { VariableEventPublisher, VariableEventType } from './VariableEventPublisher';
import { npcVariableService } from './NpcVariableService';
import { Repository } from 'typeorm';

/**
 * NPC变量源提供者
 * 负责将NPC数据转换为变量格式，并在NPC变更时同步变量
 * 使用NpcVariableService进行实际的变量操作
 */
export class NpcVariableSourceProvider implements VariableSourceProvider {
  private eventPublisher: VariableEventPublisher;
  private variableRepo: Repository<Variable>;
  
  constructor() {
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
      
      // 为每个NPC获取变量
      for (const npc of npcs) {
        // 使用NpcVariableService创建变量对象，但不保存到数据库
        const npcVariables = await this.createNpcVariables(npc);
        variables.push(...npcVariables);
      }
      
      return variables;
    } catch (error) {
      console.error("获取NPC变量失败:", error);
      return [];
    }
  }
  
  /**
   * 为单个NPC创建变量对象（不保存到数据库）
   */
  private async createNpcVariables(npc: Npc): Promise<Variable[]> {
    // 使用内存变量保存结果
    const variables: Variable[] = [];
    
    // 名称变量
    const nameVar = {
      id: `npc_${npc.id}_name`,
      name: npc.name, // 修改为NPC的名称，而不是字段显示名称
      value: npc.name,
      type: VariableType.NPC,
      source: { id: npc.id, name: npc.name, type: 'npc' },
      identifier: `@gv_npc_${npc.id}_name-=`,
      displayIdentifier: `@${npc.name}.name#${npc.id.substring(0, 4)}`,
      entityId: npc.id,
      fieldname: 'name',
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Variable;
    variables.push(nameVar);
    
    // 描述变量 - 使用默认值避免NULL
    const descVar = {
      id: `npc_${npc.id}_description`,
      name: npc.name, // 修改为NPC的名称，而不是字段显示名称
      value: npc.description || "", // 提供默认空字符串避免null
      type: VariableType.NPC,
      source: { id: npc.id, name: npc.name, type: 'npc' },
      identifier: `@gv_npc_${npc.id}_description-=`,
      displayIdentifier: `@${npc.name}.description#${npc.id.substring(0, 4)}`,
      entityId: npc.id,
      fieldname: 'description',
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Variable;
    variables.push(descVar);
    
    // 知识背景变量
    const kbVar = {
      id: `npc_${npc.id}_knowledge`,
      name: npc.name, // 修改为NPC的名称，而不是字段显示名称
      value: npc.knowledgeBackground || "", // 提供默认值避免null
      type: VariableType.NPC,
      source: { id: npc.id, name: npc.name, type: 'npc' },
      identifier: `@gv_npc_${npc.id}_knowledge-=`,
      displayIdentifier: `@${npc.name}.knowledge#${npc.id.substring(0, 4)}`,
      entityId: npc.id,
      fieldname: 'knowledge',
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Variable;
    variables.push(kbVar);
    
    // 行为原则变量
    const apVar = {
      id: `npc_${npc.id}_act`,
      name: npc.name, // 修改为NPC的名称，而不是字段显示名称
      value: npc.actionPrinciples || "", // 提供默认值避免null
      type: VariableType.NPC,
      source: { id: npc.id, name: npc.name, type: 'npc' },
      identifier: `@gv_npc_${npc.id}_act-=`,
      displayIdentifier: `@${npc.name}.act#${npc.id.substring(0, 4)}`,
      entityId: npc.id,
      fieldname: 'act',
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Variable;
    variables.push(apVar);
    
    // 活跃度数值变量
    const alNumVar = {
      id: `npc_${npc.id}_actlv`,
      name: npc.name, // 修改为NPC的名称，而不是字段显示名称
      value: (npc.activityLevel !== undefined ? npc.activityLevel.toString() : "1"), // 使用活跃度数值，默认为"1"
      type: VariableType.NPC,
      source: { id: npc.id, name: npc.name, type: 'npc' },
      identifier: `@gv_npc_${npc.id}_actlv-=`,
      displayIdentifier: `@${npc.name}.actlv#${npc.id.substring(0, 4)}`,
      entityId: npc.id,
      fieldname: 'actlv',
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Variable;
    variables.push(alNumVar);
    
    // 活跃度描述变量
    const alDescVar = {
      id: `npc_${npc.id}_actlvdesc`,
      name: npc.name, // 修改为NPC的名称，而不是字段显示名称
      value: npc.activityLevelDescription || "", // 使用活跃度描述文本，提供默认值避免null
      type: VariableType.NPC,
      source: { id: npc.id, name: npc.name, type: 'npc' },
      identifier: `@gv_npc_${npc.id}_actlvdesc-=`,
      displayIdentifier: `@${npc.name}.actlvdesc#${npc.id.substring(0, 4)}`,
      entityId: npc.id,
      fieldname: 'actlvdesc',
      isValid: true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Variable;
    variables.push(alDescVar);
    
    return variables;
  }
  
  /**
   * 同步所有NPC变量到数据库
   * 此方法会将NPC的所有变量保存到数据库中
   */
  public async syncVariablesToDatabase(): Promise<void> {
    try {
      console.log('开始同步NPC变量到数据库...');
      
      // 获取所有NPC
      const npcRepo = AppDataSource.getRepository(Npc);
      const npcs = await npcRepo.find();
      
      // 对每个NPC进行操作，使用NpcVariableService
      let totalSyncedVariables = 0;
      
      for (const npc of npcs) {
        const variables = await npcVariableService.syncNpcVariables(npc);
        totalSyncedVariables += variables.length;
      }
      
      console.log(`成功同步 ${totalSyncedVariables} 个NPC变量到数据库`);
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
      console.log(`开始删除NPC变量操作 | NPC ID: ${npcId} | NPC名称: ${npcName}`);
      
      // 使用NpcVariableService删除变量
      await npcVariableService.deleteNpcVariables(npcId);
      
      // 返回成功，确切数量由服务处理
      return 1;
    } catch (error: any) {
      console.error(`删除NPC(ID: ${npcId})变量时发生错误:`, error);
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
}
