/**
 * 实体变量同步服务
 * 监听数据库实体更改并同步到变量系统
 * 无侵入设计：不修改现有实体模型或服务代码
 */

import { AppDataSource } from '../database';
import { WorkTask } from '../models/WorkTask';
import { Npc } from '../models/Npc';
import { Workflow } from '../models/Workflow';
import { WorkflowExecution } from '../models/WorkflowExecution';
import { workTaskVariableService } from './WorkTaskVariableService';
import { npcVariableService } from './NpcVariableService';
import { workflowVariableService } from './WorkflowVariableService';
import { EntitySubscriberInterface, UpdateEvent, InsertEvent } from 'typeorm';

/**
 * 工作任务订阅器
 * 监听工作任务实体的更改并同步到变量系统
 */
class WorkTaskSubscriber implements EntitySubscriberInterface<WorkTask> {
  listenTo() {
    return WorkTask;
  }

  /**
   * 在工作任务更新后触发
   */
  async afterUpdate(event: UpdateEvent<WorkTask>): Promise<void> {
    try {
      if (!event.entity) {
        console.warn('[WorkTaskSubscriber] 更新事件中没有实体数据');
        return;
      }

      const task = event.entity;
      
      // 确保任务有ID和名称
      if (!task.id || !task.name) {
        console.warn('[WorkTaskSubscriber] 工作任务缺少ID或名称');
        return;
      }
      
      console.log(`[WorkTaskSubscriber] 检测到工作任务更新: ID=${task.id}, 名称=${task.name}`);
      
      // 检查是否更新了output字段
      if (event.updatedColumns.find(column => column.propertyName === 'output') || 
          event.updatedRelations.find(relation => relation.propertyName === 'output')) {
        
        console.log(`[WorkTaskSubscriber] 工作任务"${task.name}"的output字段已更新，同步到变量系统`);
        
        // 同步output变量
        await workTaskVariableService.createOrUpdateTaskVariable(
          task.id,
          task.name,
          'output',
          task.output || ''
        );
      }
      
      // 检查是否更新了input字段
      if (event.updatedColumns.find(column => column.propertyName === 'input') || 
          event.updatedRelations.find(relation => relation.propertyName === 'input')) {
        
        console.log(`[WorkTaskSubscriber] 工作任务"${task.name}"的input字段已更新，同步到变量系统`);
        
        // 同步input变量
        await workTaskVariableService.createOrUpdateTaskVariable(
          task.id,
          task.name,
          'input',
          task.input || ''
        );
      }
    } catch (error) {
      console.error('[WorkTaskSubscriber] 同步工作任务变量失败:', error);
    }
  }

  /**
   * 在工作任务创建后触发
   */
  async afterInsert(event: InsertEvent<WorkTask>): Promise<void> {
    try {
      if (!event.entity) {
        console.warn('[WorkTaskSubscriber] 插入事件中没有实体数据');
        return;
      }

      const task = event.entity;
      
      // 确保任务有ID和名称
      if (!task.id || !task.name) {
        console.warn('[WorkTaskSubscriber] 新工作任务缺少ID或名称');
        return;
      }
      
      console.log(`[WorkTaskSubscriber] 检测到新工作任务: ID=${task.id}, 名称=${task.name}`);
      
      // 同步所有字段
      await workTaskVariableService.syncTaskVariables(task);
      
      console.log(`[WorkTaskSubscriber] 新工作任务"${task.name}"的变量已同步`);
    } catch (error) {
      console.error('[WorkTaskSubscriber] 同步新工作任务变量失败:', error);
    }
  }
}

/**
 * NPC订阅器
 * 监听NPC实体的更改并同步到变量系统
 */
class NpcSubscriber implements EntitySubscriberInterface<Npc> {
  listenTo() {
    return Npc;
  }

  /**
   * 在NPC更新后触发
   */
  async afterUpdate(event: UpdateEvent<Npc>): Promise<void> {
    try {
      if (!event.entity) {
        console.warn('[NpcSubscriber] 更新事件中没有实体数据');
        return;
      }

      const npc = event.entity;
      
      // 确保NPC有ID和名称
      if (!npc.id || !npc.name) {
        console.warn('[NpcSubscriber] NPC缺少ID或名称');
        return;
      }
      
      console.log(`[NpcSubscriber] 检测到NPC更新: ID=${npc.id}, 名称=${npc.name}`);
      
      // 获取更新的字段名
      const updatedFields = event.updatedColumns.map(column => column.propertyName);
      
      // 对每个更新的字段同步变量
      const fieldsToSync = [
        { property: 'name', varField: 'name' },
        { property: 'knowledgeBackground', varField: 'knowledge' },
        { property: 'actionPrinciples', varField: 'act' },
        { property: 'activityLevel', varField: 'actlv' },
        { property: 'activityLevelDescription', varField: 'actlvdesc' },
        { property: 'description', varField: 'description' }
      ];
      
      for (const field of fieldsToSync) {
        if (updatedFields.includes(field.property) && npc[field.property] !== undefined) {
          console.log(`[NpcSubscriber] NPC"${npc.name}"的${field.property}字段已更新，同步到变量系统`);
          
          // 转换为字符串值
          const value = typeof npc[field.property] === 'number' ? 
            npc[field.property].toString() : npc[field.property] || '';
          
          // 同步变量
          await npcVariableService.createOrUpdateNpcVariable(
            npc.id,
            npc.name,
            field.varField,
            value
          );
        }
      }
    } catch (error) {
      console.error('[NpcSubscriber] 同步NPC变量失败:', error);
    }
  }

  /**
   * 在NPC创建后触发
   */
  async afterInsert(event: InsertEvent<Npc>): Promise<void> {
    try {
      if (!event.entity) {
        console.warn('[NpcSubscriber] 插入事件中没有实体数据');
        return;
      }

      const npc = event.entity;
      
      // 确保NPC有ID和名称
      if (!npc.id || !npc.name) {
        console.warn('[NpcSubscriber] 新NPC缺少ID或名称');
        return;
      }
      
      console.log(`[NpcSubscriber] 检测到新NPC: ID=${npc.id}, 名称=${npc.name}`);
      
      // 同步所有字段
      await npcVariableService.syncNpcVariables(npc);
      
      console.log(`[NpcSubscriber] 新NPC"${npc.name}"的变量已同步`);
    } catch (error) {
      console.error('[NpcSubscriber] 同步新NPC变量失败:', error);
    }
  }
}

/**
 * 工作流订阅器
 * 监听工作流实体的更改并同步到变量系统
 */
class WorkflowSubscriber implements EntitySubscriberInterface<Workflow> {
  listenTo() {
    return Workflow;
  }

  /**
   * 在工作流更新后触发
   */
  async afterUpdate(event: UpdateEvent<Workflow>): Promise<void> {
    try {
      if (!event.entity) {
        console.warn('[WorkflowSubscriber] 更新事件中没有实体数据');
        return;
      }

      const workflow = event.entity;
      
      // 确保工作流有ID和名称
      if (!workflow.id || !workflow.name) {
        console.warn('[WorkflowSubscriber] 工作流缺少ID或名称');
        return;
      }
      
      console.log(`[WorkflowSubscriber] 检测到工作流更新: ID=${workflow.id}, 名称=${workflow.name}`);
      
      // 检查工作流变量服务是否存在
      if (typeof workflowVariableService !== 'undefined') {
        // 使用获取+更新逐个字段方式同步变量（因为没有同步方法）
        console.log(`[WorkflowSubscriber] 开始同步工作流变量: ${workflow.name}`);
        
        // 同步基本字段（name、description、isActive）
        if (workflow.name) {
          await workflowVariableService.createOrUpdateWorkflowVariable(
            workflow.id,
            workflow.name,
            'name',
            workflow.name
          );
        }
        
        if (workflow.description !== undefined) {
          await workflowVariableService.createOrUpdateWorkflowVariable(
            workflow.id,
            workflow.name,
            'description',
            workflow.description || ''
          );
        }
        
        // 使用isActive属性作为状态
        await workflowVariableService.createOrUpdateWorkflowVariable(
          workflow.id,
          workflow.name,
          'status',
          workflow.isActive ? 'active' : 'inactive'
        );
        
        // 尝试获取工作流执行的最新输出
        // 注意：这里根据实际需要进行调整，因为Workflow模型没有直接的outputs属性
        try {
          if (workflow.executions && workflow.executions.length > 0) {
            // 获取最新的执行记录输出
            const latestExecution = workflow.executions.sort((a: WorkflowExecution, b: WorkflowExecution) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
            
            if (latestExecution && latestExecution.output) {
              const outputs = typeof latestExecution.output === 'string' 
                ? JSON.parse(latestExecution.output) 
                : latestExecution.output;
              
              if (Array.isArray(outputs)) {
                for (let i = 0; i < outputs.length; i++) {
                  if (outputs[i] !== undefined) {
                    await workflowVariableService.createOrUpdateOutputVariable(
                      workflow.id,
                      workflow.name,
                      i + 1, // 输出编号从1开始
                      outputs[i].toString() || ''
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[WorkflowSubscriber] 获取工作流输出失败:`, error);
        }
        
        console.log(`[WorkflowSubscriber] 工作流变量同步完成: ${workflow.name}`);
      } else {
        console.warn('[WorkflowSubscriber] 未找到workflowVariableService，跳过同步');
      }
    } catch (error) {
      console.error('[WorkflowSubscriber] 同步工作流变量失败:', error);
    }
  }

  /**
   * 在工作流创建后触发
   */
  async afterInsert(event: InsertEvent<Workflow>): Promise<void> {
    try {
      if (!event.entity) {
        console.warn('[WorkflowSubscriber] 插入事件中没有实体数据');
        return;
      }

      const workflow = event.entity;
      
      // 确保工作流有ID和名称
      if (!workflow.id || !workflow.name) {
        console.warn('[WorkflowSubscriber] 新工作流缺少ID或名称');
        return;
      }
      
      console.log(`[WorkflowSubscriber] 检测到新工作流: ID=${workflow.id}, 名称=${workflow.name}`);
      
      // 检查工作流变量服务是否存在
      if (typeof workflowVariableService !== 'undefined') {
        // 使用初始化方法初始化基本变量
        console.log(`[WorkflowSubscriber] 初始化新工作流变量: ${workflow.name}`);
        
        // 初始化工作流基本变量，使用isActive代替status
        await workflowVariableService.initWorkflowBaseVariables(
          workflow.id,
          workflow.name,
          workflow.description || '',
          workflow.isActive
        );
        
        // 尝试获取工作流执行的最新输出
        try {
          if (workflow.executions && workflow.executions.length > 0) {
            // 获取最新的执行记录输出
            const latestExecution = workflow.executions.sort((a: WorkflowExecution, b: WorkflowExecution) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )[0];
            
            if (latestExecution && latestExecution.output) {
              const outputs = typeof latestExecution.output === 'string' 
                ? JSON.parse(latestExecution.output) 
                : latestExecution.output;
              
              if (Array.isArray(outputs)) {
                for (let i = 0; i < outputs.length; i++) {
                  if (outputs[i] !== undefined) {
                    await workflowVariableService.createOrUpdateOutputVariable(
                      workflow.id,
                      workflow.name,
                      i + 1, // 输出编号从1开始
                      outputs[i].toString() || ''
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn(`[WorkflowSubscriber] 获取新工作流输出失败:`, error);
        }
        
        console.log(`[WorkflowSubscriber] 新工作流变量初始化完成: ${workflow.name}`);
      } else {
        console.warn('[WorkflowSubscriber] 未找到workflowVariableService，跳过同步');
      }
    } catch (error) {
      console.error('[WorkflowSubscriber] 同步新工作流变量失败:', error);
    }
  }
}

/**
 * 实体变量同步服务
 * 注册所有订阅器，监听数据库变更并自动同步变量
 */
class EntityVariableSyncService {
  private workTaskSubscriber: WorkTaskSubscriber;
  private npcSubscriber: NpcSubscriber;
  private workflowSubscriber: WorkflowSubscriber;
  
  constructor() {
    this.workTaskSubscriber = new WorkTaskSubscriber();
    this.npcSubscriber = new NpcSubscriber();
    this.workflowSubscriber = new WorkflowSubscriber();
    
    this.initialize();
  }
  
  /**
   * 初始化服务
   * 注册所有订阅器
   */
  private initialize(): void {
    try {
      // 注册工作任务订阅器
      AppDataSource.subscribers.push(this.workTaskSubscriber);
      
      // 注册NPC订阅器
      AppDataSource.subscribers.push(this.npcSubscriber);
      
      // 注册工作流订阅器
      AppDataSource.subscribers.push(this.workflowSubscriber);
      
      console.log('[EntityVariableSyncService] 所有实体变量同步订阅器已注册');
    } catch (error) {
      console.error('[EntityVariableSyncService] 初始化失败:', error);
    }
  }
  
  /**
   * 手动同步所有实体的变量
   * 可用于系统启动时的初始同步
   */
  public async syncAllVariables(): Promise<void> {
    try {
      console.log('[EntityVariableSyncService] 开始同步所有实体变量...');
      
      // 同步工作任务变量
      const workTaskRepo = AppDataSource.getRepository(WorkTask);
      const workTasks = await workTaskRepo.find();
      for (const task of workTasks) {
        await workTaskVariableService.syncTaskVariables(task);
      }
      
      // 同步NPC变量
      const npcRepo = AppDataSource.getRepository(Npc);
      const npcs = await npcRepo.find();
      for (const npc of npcs) {
        await npcVariableService.syncNpcVariables(npc);
      }
      
      // 同步工作流变量（如果服务存在）
      if (typeof workflowVariableService !== 'undefined') {
        const workflowRepo = AppDataSource.getRepository(Workflow);
        const workflows = await workflowRepo.find();
        
        console.log(`[EntityVariableSyncService] 开始同步 ${workflows.length} 个工作流变量...`);
        
        for (const workflow of workflows) {
          // 对每个工作流初始化基本变量，使用isActive代替status
          await workflowVariableService.initWorkflowBaseVariables(
            workflow.id,
            workflow.name,
            workflow.description || '',
            workflow.isActive
          );
          
          // 需要完整加载工作流才能访问执行记录，这里跳过输出同步
          // 如果需要同步输出，应该在此处添加额外的执行记录加载逻辑
          console.log(`[EntityVariableSyncService] 工作流 ${workflow.id} 基本变量同步完成，输出变量需要单独处理`);
        }
        
        console.log(`[EntityVariableSyncService] ${workflows.length} 个工作流变量同步完成`);
      }
      
      console.log('[EntityVariableSyncService] 所有实体变量同步完成');
    } catch (error) {
      console.error('[EntityVariableSyncService] 同步所有变量失败:', error);
    }
  }
}

// 创建并导出单例实例
export const entityVariableSyncService = new EntityVariableSyncService();
