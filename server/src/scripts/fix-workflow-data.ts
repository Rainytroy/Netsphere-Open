/**
 * 工作流数据修复脚本
 * 
 * 此脚本用于：
 * 1. 确保所有工作流都有标准的变量（start, name, description, status）
 * 2. 清理数据库中的"孤儿"工作流变量（无对应工作流的变量）
 * 3. 处理特定的问题工作流（如"测试工作流-cc9013a4"）
 */
import { AppDataSource } from '../database';
import { Workflow } from '../models/Workflow';
import { WorkflowNode } from '../models/WorkflowNode';
import { WorkflowConnection } from '../models/WorkflowConnection'; 
import { WorkflowExecution } from '../models/WorkflowExecution';
import { Variable, VariableType } from '../models/Variable';
import { IdentifierFormatterService } from '../services/IdentifierFormatterService';
import { In, Not } from 'typeorm';

// 统计信息结构
interface StatisticsInfo {
  totalWorkflows: number;
  updatedWorkflows: number;
  totalVariablesCreated: number;
  orphanVariablesRemoved: number;
  problematicWorkflowsFixed: number;
}

/**
 * 主函数
 */
async function main() {
  const stats: StatisticsInfo = {
    totalWorkflows: 0,
    updatedWorkflows: 0,
    totalVariablesCreated: 0,
    orphanVariablesRemoved: 0,
    problematicWorkflowsFixed: 0
  };

  try {
    // 等待数据库连接初始化
    await AppDataSource.initialize();
    console.log('数据库连接已建立');

    // 获取标识符格式化服务
    const identifierFormatter = IdentifierFormatterService.getInstance();

    // 获取所有仓库
    const workflowRepo = AppDataSource.getRepository(Workflow);
    const variableRepo = AppDataSource.getRepository(Variable);
    const nodeRepo = AppDataSource.getRepository(WorkflowNode);
    const connectionRepo = AppDataSource.getRepository(WorkflowConnection);
    const executionRepo = AppDataSource.getRepository(WorkflowExecution);

    // 获取所有工作流
    const workflows = await workflowRepo.find();
    stats.totalWorkflows = workflows.length;
    console.log(`找到 ${workflows.length} 个工作流`);

    // 处理特定问题的工作流
    await fixProblematicWorkflow(
      workflowRepo, variableRepo, nodeRepo, connectionRepo, executionRepo, stats
    );

    // 确保所有工作流都有标准变量
    await ensureWorkflowVariables(
      workflows, variableRepo, identifierFormatter, stats
    );

    // 清理孤儿变量
    await cleanOrphanVariables(
      workflowRepo, variableRepo, stats
    );

    // 输出汇总信息
    console.log('\n========== 工作流数据修复完成 ==========');
    console.log(`总工作流数: ${stats.totalWorkflows}`);
    console.log(`更新的工作流数: ${stats.updatedWorkflows}`);
    console.log(`新创建的变量数: ${stats.totalVariablesCreated}`);
    console.log(`删除的孤儿变量数: ${stats.orphanVariablesRemoved}`);
    console.log(`修复的问题工作流数: ${stats.problematicWorkflowsFixed}`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('数据修复过程中出错:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

/**
 * 修复特定问题的工作流
 */
async function fixProblematicWorkflow(
  workflowRepo: any,
  variableRepo: any,
  nodeRepo: any,
  connectionRepo: any,
  executionRepo: any,
  stats: StatisticsInfo
) {
  console.log('\n处理特定问题工作流...');

  try {
    // 查找测试工作流-cc9013a4
    const problematicWorkflow = await workflowRepo
      .createQueryBuilder('workflow')
      .where('workflow.name LIKE :name', { name: '%测试工作流-cc9013a4%' })
      .getOne();

    if (!problematicWorkflow) {
      console.log('未找到目标问题工作流，跳过此步骤');
      return;
    }

    const workflowId = problematicWorkflow.id;
    console.log(`找到问题工作流: 名称=${problematicWorkflow.name}, ID=${workflowId}`);

    // 1. 删除与此工作流相关的所有变量
    const variables = await variableRepo.find({
      where: {
        source: {
          id: workflowId
        }
      }
    });
    
    if (variables.length > 0) {
      console.log(`删除 ${variables.length} 个相关变量...`);
      await variableRepo.remove(variables);
    } else {
      console.log('未找到相关变量');
    }

    // 2. 删除与此工作流相关的所有执行记录
    const executions = await executionRepo.find({
      where: { workflowId }
    });
    
    if (executions.length > 0) {
      console.log(`删除 ${executions.length} 个执行记录...`);
      await executionRepo.remove(executions);
    } else {
      console.log('未找到相关执行记录');
    }

    // 3. 删除与此工作流相关的所有连接
    const connections = await connectionRepo.find({
      where: { workflowId }
    });
    
    if (connections.length > 0) {
      console.log(`删除 ${connections.length} 个连接...`);
      await connectionRepo.remove(connections);
    } else {
      console.log('未找到相关连接');
    }

    // 4. 删除与此工作流相关的所有节点
    const nodes = await nodeRepo.find({
      where: { workflowId }
    });
    
    if (nodes.length > 0) {
      console.log(`删除 ${nodes.length} 个节点...`);
      await nodeRepo.remove(nodes);
    } else {
      console.log('未找到相关节点');
    }

    // 5. 尝试删除工作流本身
    try {
      console.log(`尝试删除工作流 ${workflowId}...`);
      await workflowRepo.remove(problematicWorkflow);
      console.log('工作流成功删除');
      stats.problematicWorkflowsFixed++;
    } catch (error) {
      console.error('常规删除工作流失败，尝试直接执行SQL删除...');
      
      // 使用直接SQL语句删除
      try {
        await AppDataSource.query(
          `DELETE FROM workflows WHERE id = '${workflowId}'`
        );
        console.log('工作流通过SQL删除成功');
        stats.problematicWorkflowsFixed++;
      } catch (sqlError) {
        console.error('SQL删除也失败:', sqlError);
      }
    }

  } catch (error) {
    console.error('处理问题工作流失败:', error);
  }
}

/**
 * 确保所有工作流都有标准变量
 */
async function ensureWorkflowVariables(
  workflows: Workflow[],
  variableRepo: any,
  identifierFormatter: IdentifierFormatterService,
  stats: StatisticsInfo
) {
  console.log('\n确保所有工作流都有标准变量...');

  // 对每个工作流处理
  for (const workflow of workflows) {
    console.log(`\n处理工作流: ${workflow.name} (${workflow.id})`);

    // 获取该工作流现有的变量
    const existingVariables = await variableRepo.find({
      where: {
        source: {
          id: workflow.id
        }
      }
    });

    // 检查每个标准变量是否存在
    const variableMap = new Map();
    for (const variable of existingVariables) {
      variableMap.set(variable.name, variable);
    }

    // 需要创建的变量列表
    const variablesToCreate = [];

    // 检查start变量
    if (!variableMap.has('start')) {
      variablesToCreate.push({
        name: 'start',
        value: '',
        type: VariableType.WORKFLOW,
        source: {
          id: workflow.id,
          type: 'workflow',
          name: workflow.name
        },
        identifier: identifierFormatter.formatIdentifier('workflow', workflow.name, 'start')
      });
    }

    // 检查name变量
    if (!variableMap.has('name')) {
      variablesToCreate.push({
        name: 'name',
        value: workflow.name,
        type: VariableType.WORKFLOW,
        source: {
          id: workflow.id,
          type: 'workflow',
          name: workflow.name
        },
        identifier: identifierFormatter.formatIdentifier('workflow', workflow.name, 'name')
      });
    }

    // 检查description变量
    if (!variableMap.has('description')) {
      variablesToCreate.push({
        name: 'description',
        value: workflow.description || '',
        type: VariableType.WORKFLOW,
        source: {
          id: workflow.id,
          type: 'workflow',
          name: workflow.name
        },
        identifier: identifierFormatter.formatIdentifier('workflow', workflow.name, 'description')
      });
    }

    // 检查status变量
    if (!variableMap.has('status')) {
      variablesToCreate.push({
        name: 'status',
        value: workflow.isActive ? 'active' : 'inactive',
        type: VariableType.WORKFLOW,
        source: {
          id: workflow.id,
          type: 'workflow',
          name: workflow.name
        },
        identifier: identifierFormatter.formatIdentifier('workflow', workflow.name, 'status')
      });
    }

    // 创建缺失的变量
    if (variablesToCreate.length > 0) {
      for (const varData of variablesToCreate) {
        try {
          const newVariable = variableRepo.create(varData);
          await variableRepo.save(newVariable);
          console.log(`为工作流 ${workflow.name} 创建了变量: ${varData.name}`);
          stats.totalVariablesCreated++;
        } catch (error) {
          console.error(`为工作流 ${workflow.name} 创建变量 ${varData.name} 失败:`, error);
        }
      }
      
      stats.updatedWorkflows++;
    } else {
      console.log(`工作流 ${workflow.name} 已有所有标准变量`);
    }
  }
}

/**
 * 清理孤儿变量（没有对应工作流的工作流变量）
 */
async function cleanOrphanVariables(
  workflowRepo: any,
  variableRepo: any,
  stats: StatisticsInfo
) {
  console.log('\n清理孤儿工作流变量...');

  try {
    // 获取所有工作流ID
    const workflows = await workflowRepo.find();
    const workflowIds = workflows.map((wf: Workflow) => wf.id);

    // 查找所有工作流类型的变量，但source.id不在当前工作流列表中
    const orphanVariables = await variableRepo.find({
      where: {
        type: VariableType.WORKFLOW,
        source: {
          id: Not(In(workflowIds))
        }
      }
    });

    console.log(`找到 ${orphanVariables.length} 个孤儿工作流变量`);

    if (orphanVariables.length > 0) {
      // 删除这些孤儿变量
      await variableRepo.remove(orphanVariables);
      stats.orphanVariablesRemoved = orphanVariables.length;
      console.log('孤儿变量已清理完毕');
    }
  } catch (error) {
    console.error('清理孤儿变量失败:', error);
  }
}

// 执行主函数
main()
  .then(() => {
    console.log('数据修复脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('数据修复脚本执行失败:', error);
    process.exit(1);
  });
