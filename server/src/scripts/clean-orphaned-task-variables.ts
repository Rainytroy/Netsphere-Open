/**
 * 清理无对应工作任务的变量脚本
 * 
 * 此脚本用于清理系统中存在的"孤儿"工作任务变量 - 即那些源工作任务已被删除但变量仍然存在的情况
 * 根据变量设计规范，任务变量应与工作任务生命周期保持一致
 */

import { AppDataSource } from "../database";
import { Variable, VariableType } from "../models/Variable";
import { WorkTask } from "../models/WorkTask";
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

// 获取所有任务类型变量
async function getAllTaskVariables() {
  try {
    const variableRepository = AppDataSource.getRepository(Variable);
    return await variableRepository.find({
      where: { type: VariableType.TASK }
    });
  } catch (error) {
    console.error("获取任务变量列表失败:", error);
    return [];
  }
}

// 标识并清理孤儿变量
async function cleanOrphanedTaskVariables() {
  try {
    const variableRepository = AppDataSource.getRepository(Variable);
    const eventPublisher = VariableEventPublisher.getInstance();
    
    // 获取所有实际工作任务ID和任务类型变量
    const allWorkTaskIds = await getAllWorkTaskIds();
    const allTaskVariables = await getAllTaskVariables();
    
    console.log(`系统中共有 ${allWorkTaskIds.length} 个工作任务, ${allTaskVariables.length} 个任务变量`);
    
    // 识别孤儿变量
    const orphanedVariables = allTaskVariables.filter(variable => {
      const sourceId = variable.source?.id;
      return !sourceId || !allWorkTaskIds.includes(sourceId);
    });
    
    if (orphanedVariables.length === 0) {
      console.log("未发现孤儿变量，系统状态良好");
      return;
    }
    
    console.log(`发现 ${orphanedVariables.length} 个孤儿变量，准备清理...`);
    
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
    
    console.log(`清理完成，成功删除 ${successCount}/${orphanedVariables.length} 个孤儿变量`);
  } catch (error) {
    console.error("清理孤儿变量失败:", error);
  }
}

// 运行脚本
async function run() {
  try {
    await initialize();
    await cleanOrphanedTaskVariables();
    console.log("脚本执行完成");
    
    // 打印数据库统计信息
    const variableRepository = AppDataSource.getRepository(Variable);
    const remainingTaskVariables = await variableRepository.count({
      where: { type: VariableType.TASK }
    });
    
    console.log(`系统中现有任务类型变量: ${remainingTaskVariables} 个`);
    
    process.exit(0);
  } catch (error) {
    console.error("脚本执行失败:", error);
    process.exit(1);
  }
}

// 启动脚本
run();
