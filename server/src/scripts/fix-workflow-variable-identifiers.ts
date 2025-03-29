import { AppDataSource } from "../database";
import { Variable, VariableType } from "../models/Variable";
import { IdentifierFormatterService } from "../services/IdentifierFormatterService";

/**
 * 这个脚本用于修复工作流变量的标识符格式
 * 问题：一些工作流变量的标识符包含了节点ID，例如 @工作流名称.node_[uuid]_start
 * 正确格式应该是：@工作流名称.start
 */
async function fixWorkflowVariableIdentifiers() {
  try {
    console.log("开始修复工作流变量标识符...");
    
    // 初始化数据库连接
    await AppDataSource.initialize();
    console.log("数据库连接已初始化");
    
    // 获取标识符格式化服务
    const identifierFormatter = IdentifierFormatterService.getInstance();
    
    // 获取所有工作流类型的变量
    const variableRepo = AppDataSource.getRepository(Variable);
    const variables = await variableRepo.find({
      where: { type: VariableType.WORKFLOW }
    });
    
    console.log(`找到 ${variables.length} 个工作流相关变量`);
    
    // 用于检测错误格式的正则表达式
    const invalidFormatRegex = /@([^.]+)\.node_[^_]+_([^.]+)$/;
    const problemVariables: Variable[] = [];
    
    // 查找需要修复的变量
    for (const variable of variables) {
      const match = variable.identifier.match(invalidFormatRegex);
      if (match) {
        problemVariables.push(variable);
      }
    }
    
    console.log(`发现 ${problemVariables.length} 个格式错误的变量标识符需要修复`);
    
    // 修复标识符格式
    const fixedVariables: Variable[] = [];
    
    for (const variable of problemVariables) {
      console.log(`处理变量: ${variable.identifier}`);
      
      // 解析标识符
      const match = variable.identifier.match(invalidFormatRegex);
      if (match) {
        const [_, workflowName, fieldName] = match;
        
        // 创建正确格式的标识符
        const correctIdentifier = identifierFormatter.formatIdentifier(
          'workflow_card',
          workflowName,
          fieldName
        );
        
        console.log(`修正标识符: ${variable.identifier} -> ${correctIdentifier}`);
        
        // 检查是否已存在相同的正确标识符
        const existingVariable = await variableRepo.findOne({
          where: { identifier: correctIdentifier }
        });
        
        if (existingVariable) {
          console.log(`发现冲突: 已存在标识符为 ${correctIdentifier} 的变量，将删除错误格式的变量`);
          await variableRepo.remove(variable);
        } else {
          // 更新标识符
          variable.identifier = correctIdentifier;
          fixedVariables.push(variable);
        }
      }
    }
    
    // 批量保存修改
    if (fixedVariables.length > 0) {
      await variableRepo.save(fixedVariables);
      console.log(`成功修复 ${fixedVariables.length} 个变量标识符`);
    }
    
    console.log("工作流变量标识符修复完成");
    
  } catch (error) {
    console.error("修复工作流变量标识符时出错:", error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log("数据库连接已关闭");
    }
  }
}

// 执行修复脚本
fixWorkflowVariableIdentifiers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("执行脚本失败:", error);
    process.exit(1);
  });
