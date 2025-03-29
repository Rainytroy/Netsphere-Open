/**
 * 修复重复的工作任务变量脚本
 * 
 * 此脚本用于清理系统中存在的重复变量（中文标识符 .输入/.输出 和英文标识符 .input/.output）
 * 根据变量标识符规范，系统应只保留英文字段名格式的变量（.input/.output）
 */

import { AppDataSource } from "../database";
import { Variable, VariableType } from "../models/Variable";
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

// 清理重复变量
async function cleanDuplicateVariables() {
  try {
    const variableRepository = AppDataSource.getRepository(Variable);
    const eventPublisher = VariableEventPublisher.getInstance();
    
    // 查找所有工作任务类型的变量
    const taskVariables = await variableRepository.find({
      where: { type: VariableType.TASK }
    });
    
    // 按来源ID分组
    const variablesBySource: Record<string, Variable[]> = {};
    taskVariables.forEach(variable => {
      const sourceId = variable.source?.id;
      if (sourceId) {
        if (!variablesBySource[sourceId]) {
          variablesBySource[sourceId] = [];
        }
        variablesBySource[sourceId].push(variable);
      }
    });
    
    // 处理每个工作任务的变量
    let removedCount = 0;
    for (const sourceId in variablesBySource) {
      const variables = variablesBySource[sourceId];
      
      // 如果变量数量超过2个，则需要清理
      if (variables.length > 2) {
        console.log(`为工作任务 ${sourceId} 清理重复变量，当前变量数: ${variables.length}`);
        
        // 找出并保留英文标识符的变量
        const inputVar = variables.find(v => v.identifier.endsWith('.input'));
        const outputVar = variables.find(v => v.identifier.endsWith('.output'));
        
        // 删除中文标识符的变量
        for (const variable of variables) {
          if (
            (variable.identifier.endsWith('.输入') || variable.identifier.endsWith('.输出')) ||
            (variable.identifier.endsWith('.input') && inputVar && variable.id !== inputVar.id) ||
            (variable.identifier.endsWith('.output') && outputVar && variable.id !== outputVar.id)
          ) {
            console.log(`删除重复变量: ${variable.identifier}`);
            await variableRepository.remove(variable);
            
            // 发布变量删除事件
            eventPublisher.publish(VariableEventType.DELETED, variable);
            
            removedCount++;
          }
        }
      }
    }
    
    console.log(`清理完成，共删除 ${removedCount} 个重复变量`);
  } catch (error) {
    console.error("清理重复变量失败:", error);
  }
}

// 运行脚本
async function run() {
  try {
    await initialize();
    await cleanDuplicateVariables();
    console.log("脚本执行完成");
    process.exit(0);
  } catch (error) {
    console.error("脚本执行失败:", error);
    process.exit(1);
  }
}

// 启动脚本
run();
