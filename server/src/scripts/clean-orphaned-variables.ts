/**
 * 清理无对应源对象的变量脚本
 * 
 * 此脚本用于清理系统中存在的"孤儿"变量 - 即那些源对象已被删除但变量仍然存在的情况
 * 支持清理NPC变量、工作任务变量和工作流变量
 */

import { AppDataSource } from "../database";
import { Variable, VariableType } from "../models/Variable";
import { Npc } from "../models/Npc";
import { WorkTask } from "../models/WorkTask";
import { Workflow } from "../models/Workflow";
import { VariableEventPublisher, VariableEventType } from "../services/VariableEventPublisher";

// 确保数据库连接
async function initialize() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("数据库连接已初始化");
    }
  } catch (error) {
    console.error("数据库连接失败:", error);
    process.exit(1);
  }
}

// 获取所有NPC ID
async function getAllNpcIds() {
  try {
    const npcRepository = AppDataSource.getRepository(Npc);
    const npcs = await npcRepository.find();
    return npcs.map(npc => npc.id);
  } catch (error) {
    console.error("获取NPC列表失败:", error);
    return [];
  }
}

// 获取所有工作任务ID
async function getAllWorkTaskIds() {
  try {
    const workTaskRepository = AppDataSource.getRepository(WorkTask);
    const workTasks = await workTaskRepository.find();
    return workTasks.map(task => task.id);
  } catch (error) {
    console.error("获取工作任务列表失败:", error);
    return [];
  }
}

// 获取所有工作流ID
async function getAllWorkflowIds() {
  try {
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const workflows = await workflowRepository.find();
    return workflows.map(workflow => workflow.id);
  } catch (error) {
    console.error("获取工作流列表失败:", error);
    return [];
  }
}

// 清理NPC孤儿变量
async function cleanOrphanedNpcVariables() {
  try {
    const variableRepository = AppDataSource.getRepository(Variable);
    const eventPublisher = VariableEventPublisher.getInstance();
    
    // 获取所有NPC ID和NPC类型变量
    const allNpcIds = await getAllNpcIds();
    const npcVariables = await variableRepository.find({
      where: { type: VariableType.NPC }
    });
    
    console.log(`系统中共有 ${allNpcIds.length} 个NPC, ${npcVariables.length} 个NPC变量`);
    
    // 识别孤儿变量
    const orphanedVariables = npcVariables.filter(variable => {
      const sourceId = variable.source?.id;
      return !sourceId || !allNpcIds.includes(sourceId);
    });
    
    if (orphanedVariables.length === 0) {
      console.log("未发现NPC孤儿变量");
      return 0;
    }
    
    console.log(`发现 ${orphanedVariables.length} 个NPC孤儿变量，准备清理...`);
    
    // 打印每个将被删除的变量信息
    orphanedVariables.forEach((variable, index) => {
      console.log(`${index + 1}. ${variable.identifier} (ID: ${variable.id}, 源ID: ${variable.source?.id || '无源ID'})`);
    });
    
    // 删除孤儿变量
    let successCount = 0;
    for (const variable of orphanedVariables) {
      try {
        await variableRepository.remove(variable);
        
        // 发布变量删除事件
        eventPublisher.publish(VariableEventType.DELETED, variable);
        
        successCount++;
      } catch (error) {
        console.error(`删除变量 ${variable.identifier} 失败:`, error);
      }
    }
    
    console.log(`清理完成，成功删除 ${successCount}/${orphanedVariables.length} 个NPC孤儿变量`);
    return successCount;
  } catch (error) {
    console.error("清理NPC孤儿变量失败:", error);
    return 0;
  }
}

// 清理工作任务孤儿变量
async function cleanOrphanedTaskVariables() {
  try {
    const variableRepository = AppDataSource.getRepository(Variable);
    const eventPublisher = VariableEventPublisher.getInstance();
    
    // 获取所有工作任务ID和工作任务类型变量
    const allWorkTaskIds = await getAllWorkTaskIds();
    const taskVariables = await variableRepository.find({
      where: { type: VariableType.TASK }
    });
    
    console.log(`系统中共有 ${allWorkTaskIds.length} 个工作任务, ${taskVariables.length} 个工作任务变量`);
    
    // 识别孤儿变量
    const orphanedVariables = taskVariables.filter(variable => {
      const sourceId = variable.source?.id;
      return !sourceId || !allWorkTaskIds.includes(sourceId);
    });
    
    if (orphanedVariables.length === 0) {
      console.log("未发现工作任务孤儿变量");
      return 0;
    }
    
    console.log(`发现 ${orphanedVariables.length} 个工作任务孤儿变量，准备清理...`);
    
    // 打印每个将被删除的变量信息
    orphanedVariables.forEach((variable, index) => {
      console.log(`${index + 1}. ${variable.identifier} (ID: ${variable.id}, 源ID: ${variable.source?.id || '无源ID'})`);
    });
    
    // 删除孤儿变量
    let successCount = 0;
    for (const variable of orphanedVariables) {
      try {
        await variableRepository.remove(variable);
        
        // 发布变量删除事件
        eventPublisher.publish(VariableEventType.DELETED, variable);
        
        successCount++;
      } catch (error) {
        console.error(`删除变量 ${variable.identifier} 失败:`, error);
      }
    }
    
    console.log(`清理完成，成功删除 ${successCount}/${orphanedVariables.length} 个工作任务孤儿变量`);
    return successCount;
  } catch (error) {
    console.error("清理工作任务孤儿变量失败:", error);
    return 0;
  }
}

// 清理工作流孤儿变量
async function cleanOrphanedWorkflowVariables() {
  try {
    const variableRepository = AppDataSource.getRepository(Variable);
    const eventPublisher = VariableEventPublisher.getInstance();
    
    // 获取所有工作流ID和工作流类型变量
    const allWorkflowIds = await getAllWorkflowIds();
    const workflowVariables = await variableRepository.find({
      where: { type: VariableType.WORKFLOW }
    });
    
    console.log(`系统中共有 ${allWorkflowIds.length} 个工作流, ${workflowVariables.length} 个工作流变量`);
    
    // 识别孤儿变量
    const orphanedVariables = workflowVariables.filter(variable => {
      const sourceId = variable.source?.id;
      return !sourceId || !allWorkflowIds.includes(sourceId);
    });
    
    if (orphanedVariables.length === 0) {
      console.log("未发现工作流孤儿变量");
      return 0;
    }
    
    console.log(`发现 ${orphanedVariables.length} 个工作流孤儿变量，准备清理...`);
    
    // 打印每个将被删除的变量信息
    orphanedVariables.forEach((variable, index) => {
      console.log(`${index + 1}. ${variable.identifier} (ID: ${variable.id}, 源ID: ${variable.source?.id || '无源ID'})`);
    });
    
    // 删除孤儿变量
    let successCount = 0;
    for (const variable of orphanedVariables) {
      try {
        await variableRepository.remove(variable);
        
        // 发布变量删除事件
        eventPublisher.publish(VariableEventType.DELETED, variable);
        
        successCount++;
      } catch (error) {
        console.error(`删除变量 ${variable.identifier} 失败:`, error);
      }
    }
    
    console.log(`清理完成，成功删除 ${successCount}/${orphanedVariables.length} 个工作流孤儿变量`);
    return successCount;
  } catch (error) {
    console.error("清理工作流孤儿变量失败:", error);
    return 0;
  }
}

// 运行脚本
async function run() {
  try {
    await initialize();
    
    console.log("=== 开始清理孤儿变量 ===");
    
    // 清理各类型孤儿变量
    const npcDeletedCount = await cleanOrphanedNpcVariables();
    const taskDeletedCount = await cleanOrphanedTaskVariables();
    const workflowDeletedCount = await cleanOrphanedWorkflowVariables();
    
    // 打印统计信息
    console.log("\n=== 清理统计 ===");
    console.log(`NPC孤儿变量: 已删除 ${npcDeletedCount} 个`);
    console.log(`工作任务孤儿变量: 已删除 ${taskDeletedCount} 个`);
    console.log(`工作流孤儿变量: 已删除 ${workflowDeletedCount} 个`);
    console.log(`总计: 已删除 ${npcDeletedCount + taskDeletedCount + workflowDeletedCount} 个孤儿变量`);
    
    // 打印剩余变量信息
    const variableRepository = AppDataSource.getRepository(Variable);
    const remainingNpcVariables = await variableRepository.count({
      where: { type: VariableType.NPC }
    });
    const remainingTaskVariables = await variableRepository.count({
      where: { type: VariableType.TASK }
    });
    const remainingWorkflowVariables = await variableRepository.count({
      where: { type: VariableType.WORKFLOW }
    });
    
    console.log("\n=== 剩余变量统计 ===");
    console.log(`NPC变量: ${remainingNpcVariables} 个`);
    console.log(`工作任务变量: ${remainingTaskVariables} 个`);
    console.log(`工作流变量: ${remainingWorkflowVariables} 个`);
    console.log(`总计: ${remainingNpcVariables + remainingTaskVariables + remainingWorkflowVariables} 个`);
    
    console.log("\n脚本执行完成");
    process.exit(0);
  } catch (error) {
    console.error("脚本执行失败:", error);
    process.exit(1);
  }
}

// 启动脚本
run();
