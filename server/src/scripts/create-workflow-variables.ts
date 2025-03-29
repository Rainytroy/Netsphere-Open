/**
 * 工作流变量迁移脚本
 * 
 * 此脚本用于确保所有工作流都有标准的变量：
 * - start: 工作流的起点输入变量
 * - name: 工作流的名称
 * - description: 工作流的描述
 * - status: 工作流的状态
 */
import { AppDataSource } from '../database';
import { Workflow } from '../models/Workflow';
import { Variable, VariableType } from '../models/Variable';
import { IdentifierFormatterService } from '../services/IdentifierFormatterService';

/**
 * 主函数
 */
async function main() {
  try {
    // 等待数据库连接初始化
    await AppDataSource.initialize();
    console.log('数据库连接已建立');

    // 获取标识符格式化服务
    const identifierFormatter = IdentifierFormatterService.getInstance();

    // 获取工作流仓库和变量仓库
    const workflowRepo = AppDataSource.getRepository(Workflow);
    const variableRepo = AppDataSource.getRepository(Variable);

    // 获取所有工作流
    const workflows = await workflowRepo.find();
    console.log(`找到 ${workflows.length} 个工作流`);

    // 统计数据
    let totalCreated = 0;
    let workflowsUpdated = 0;

    // 对每个工作流处理
    for (const workflow of workflows) {
      console.log(`处理工作流: ${workflow.name} (${workflow.id})`);

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
          const newVariable = variableRepo.create(varData);
          await variableRepo.save(newVariable);
          console.log(`为工作流 ${workflow.name} 创建了变量: ${varData.name}`);
        }
        
        totalCreated += variablesToCreate.length;
        workflowsUpdated++;
      } else {
        console.log(`工作流 ${workflow.name} 已有所有标准变量`);
      }
    }

    // 输出汇总信息
    console.log('\n--- 变量迁移完成 ---');
    console.log(`共处理了 ${workflows.length} 个工作流`);
    console.log(`共更新了 ${workflowsUpdated} 个工作流的变量`);
    console.log(`共创建了 ${totalCreated} 个变量\n`);

  } catch (error) {
    console.error('迁移过程中出错:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行主函数
main()
  .then(() => {
    console.log('迁移脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  });
