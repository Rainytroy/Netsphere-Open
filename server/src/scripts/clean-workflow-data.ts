/**
 * 工作流数据清理脚本
 * 清空系统中所有工作流及相关变量
 * 注意：此脚本只删除工作流和工作流类型的变量，不会影响其他数据
 */
import { AppDataSource } from '../database';
import { Workflow } from '../models/Workflow';
import { WorkflowNode } from '../models/WorkflowNode';
import { WorkflowConnection } from '../models/WorkflowConnection'; 
import { WorkflowExecution } from '../models/WorkflowExecution';
import { Variable, VariableType } from '../models/Variable';
import { In } from 'typeorm';

/**
 * 清理工作流相关数据
 */
async function cleanWorkflowData() {
  try {
    // 等待数据库连接初始化
    await AppDataSource.initialize();
    console.log('数据库连接已建立');

    // 获取所有工作流ID，用于后续操作
    const workflowRepo = AppDataSource.getRepository(Workflow);
    const workflows = await workflowRepo.find();
    const workflowIds = workflows.map(wf => wf.id);
    
    console.log(`找到 ${workflows.length} 个工作流：`);
    workflows.forEach(wf => {
      console.log(`  - ID: ${wf.id}, 名称: ${wf.name}`);
    });
    
    // 数据统计
    let stats = {
      workflowCount: workflows.length,
      nodesDeleted: 0,
      connectionsDeleted: 0,
      executionsDeleted: 0,
      variablesDeleted: 0
    };
    
    console.log('\n开始清理工作流相关数据...');
    
    // 1. 删除工作流节点
    if (workflowIds.length > 0) {
      const nodeRepo = AppDataSource.getRepository(WorkflowNode);
      const nodes = await nodeRepo.find({
        where: { workflowId: In(workflowIds) }
      });
      stats.nodesDeleted = nodes.length;
      
      if (nodes.length > 0) {
        await nodeRepo.remove(nodes);
        console.log(`删除了 ${nodes.length} 个工作流节点`);
      } else {
        console.log('没有找到工作流节点需要删除');
      }
      
      // 2. 删除工作流连接
      const connectionRepo = AppDataSource.getRepository(WorkflowConnection);
      const connections = await connectionRepo.find({
        where: { workflowId: In(workflowIds) }
      });
      stats.connectionsDeleted = connections.length;
      
      if (connections.length > 0) {
        await connectionRepo.remove(connections);
        console.log(`删除了 ${connections.length} 个工作流连接`);
      } else {
        console.log('没有找到工作流连接需要删除');
      }
      
      // 3. 删除工作流执行记录
      const executionRepo = AppDataSource.getRepository(WorkflowExecution);
      const executions = await executionRepo.find({
        where: { workflowId: In(workflowIds) }
      });
      stats.executionsDeleted = executions.length;
      
      if (executions.length > 0) {
        await executionRepo.remove(executions);
        console.log(`删除了 ${executions.length} 个工作流执行记录`);
      } else {
        console.log('没有找到工作流执行记录需要删除');
      }
    }
    
    // 4. 删除工作流类型的变量
    const variableRepo = AppDataSource.getRepository(Variable);
    const workflowVariables = await variableRepo.find({
      where: { type: VariableType.WORKFLOW }
    });
    stats.variablesDeleted = workflowVariables.length;
    
    if (workflowVariables.length > 0) {
      await variableRepo.remove(workflowVariables);
      console.log(`删除了 ${workflowVariables.length} 个工作流类型的变量`);
    } else {
      console.log('没有找到工作流类型的变量需要删除');
    }
    
    // 5. 删除所有工作流
    if (workflows.length > 0) {
      await workflowRepo.remove(workflows);
      console.log(`删除了 ${workflows.length} 个工作流`);
    } else {
      console.log('没有找到工作流需要删除');
    }
    
    // 输出清理结果汇总
    console.log('\n清理工作流数据完成，汇总信息:');
    console.log('----------------------------------------');
    console.log(`工作流: ${stats.workflowCount} 个`);
    console.log(`节点: ${stats.nodesDeleted} 个`);
    console.log(`连接: ${stats.connectionsDeleted} 个`);
    console.log(`执行记录: ${stats.executionsDeleted} 个`);
    console.log(`变量: ${stats.variablesDeleted} 个`);
    console.log('----------------------------------------');
    
  } catch (error) {
    console.error('清理工作流数据出错:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行主函数
cleanWorkflowData()
  .then(() => {
    console.log('工作流数据清理完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('工作流数据清理失败:', error);
    process.exit(1);
  });
