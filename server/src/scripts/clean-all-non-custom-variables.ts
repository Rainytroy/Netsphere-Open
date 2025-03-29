/**
 * 清理所有非自定义变量的脚本
 * 
 * 此脚本用于清理系统中所有非CUSTOM类型的变量，
 * 包括NPC、TASK、WORKFLOW和FILE类型的变量
 * 仅保留CUSTOM类型的变量
 */

import { AppDataSource } from "../database";
import { Variable, VariableType } from "../models/Variable";
import { VariableEventPublisher, VariableEventType } from "../services/VariableEventPublisher";
import { Not, In } from "typeorm";

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

// 清理所有非自定义变量
async function cleanAllNonCustomVariables() {
  try {
    const variableRepository = AppDataSource.getRepository(Variable);
    const eventPublisher = VariableEventPublisher.getInstance();
    
    // 获取所有非CUSTOM类型的变量
    const variables = await variableRepository.find({
      where: {
        type: Not(VariableType.CUSTOM)
      }
    });
    
    console.log(`系统中共有 ${variables.length} 个非自定义变量，准备清理...`);
    
    // 按类型统计变量数量
    const npcVariables = variables.filter(v => v.type === VariableType.NPC);
    const taskVariables = variables.filter(v => v.type === VariableType.TASK);
    const workflowVariables = variables.filter(v => v.type === VariableType.WORKFLOW);
    const fileVariables = variables.filter(v => v.type === VariableType.FILE);
    const otherVariables = variables.filter(v => 
      v.type !== VariableType.NPC && 
      v.type !== VariableType.TASK && 
      v.type !== VariableType.WORKFLOW && 
      v.type !== VariableType.FILE
    );
    
    console.log("变量类型统计:");
    console.log(`- NPC变量: ${npcVariables.length} 个`);
    console.log(`- 工作任务变量: ${taskVariables.length} 个`);
    console.log(`- 工作流变量: ${workflowVariables.length} 个`);
    console.log(`- 文件变量: ${fileVariables.length} 个`);
    console.log(`- 其他类型变量: ${otherVariables.length} 个`);
    
    // 打印每个将被删除的变量信息
    console.log("\n要删除的变量列表:");
    variables.forEach((variable, index) => {
      console.log(`${index + 1}. ${variable.identifier} (ID: ${variable.id}, 类型: ${variable.type}, 源ID: ${variable.source?.id || '无源ID'})`);
    });
    
    // 删除所有变量
    let successCount = 0;
    for (const variable of variables) {
      try {
        await variableRepository.remove(variable);
        
        // 发布变量删除事件
        eventPublisher.publish(VariableEventType.DELETED, variable);
        
        successCount++;
      } catch (error) {
        console.error(`删除变量 ${variable.identifier} 失败:`, error);
      }
    }
    
    console.log(`\n清理完成，成功删除 ${successCount}/${variables.length} 个非自定义变量`);
    
    // 打印剩余变量统计
    const remainingVariables = await variableRepository.count();
    const remainingCustomVariables = await variableRepository.count({
      where: { type: VariableType.CUSTOM }
    });
    
    console.log("\n剩余变量统计:");
    console.log(`- 自定义(CUSTOM)变量: ${remainingCustomVariables} 个`);
    console.log(`- 总变量: ${remainingVariables} 个`);
    
    return successCount;
  } catch (error) {
    console.error("清理非自定义变量失败:", error);
    return 0;
  }
}

// 运行脚本
async function run() {
  try {
    await initialize();
    
    console.log("=== 开始清理所有非自定义变量 ===");
    
    const deletedCount = await cleanAllNonCustomVariables();
    
    console.log("\n=== 清理统计 ===");
    console.log(`总计: 已删除 ${deletedCount} 个非自定义变量`);
    console.log("\n脚本执行完成");
    process.exit(0);
  } catch (error) {
    console.error("脚本执行失败:", error);
    process.exit(1);
  }
}

// 启动脚本
run();
