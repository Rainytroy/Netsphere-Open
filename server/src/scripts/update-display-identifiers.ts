import { AppDataSource } from '../database';
import { Variable } from '../models/Variable';
import { IdentifierFormatterService } from '../services/IdentifierFormatterService';

/**
 * 更新变量显示标识符的脚本
 * 此脚本为所有没有displayIdentifier字段的变量添加此字段
 */
async function updateDisplayIdentifiers() {
  console.log('开始更新变量显示标识符...');
  
  try {
    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('数据库连接初始化成功');
    }
    
    const variableRepo = AppDataSource.getRepository(Variable);
    const identifierFormatter = IdentifierFormatterService.getInstance();
    
    console.log('正在获取所有变量...');
    const variables = await variableRepo.find();
    console.log(`找到 ${variables.length} 个变量`);
    
    // 收集需要更新的变量
    const variablesToUpdate: Variable[] = [];
    
    for (const variable of variables) {
      // 如果变量没有displayIdentifier字段或displayIdentifier为空
      if (!variable.displayIdentifier) {
        console.log(`变量 ${variable.id} (${variable.identifier}) 需要更新显示标识符`);
        
        try {
          // 尝试提取标识符信息
          const match = variable.identifier.match(/@([^.]+)\.([^@#]+)(?:#(.+))?$/);
          if (match) {
            const sourceName = match[1];
            const field = match[2];
            const id = match[3] || variable.entityId || 'unknown';
            
            // 确定源类型
            let sourceType = 'unknown';
            switch (variable.type) {
              case 'npc': sourceType = 'npc'; break;
              case 'task': sourceType = 'task'; break;
              case 'workflow': sourceType = 'workflow_card'; break;
              case 'custom': sourceType = 'custom'; break;
              default: sourceType = variable.type; break;
            }
            
            // 创建显示标识符
            variable.displayIdentifier = identifierFormatter.formatDisplayIdentifier(
              sourceType,
              sourceName,
              field,
              id
            );
            
            console.log(`  → 新显示标识符: ${variable.displayIdentifier}`);
            variablesToUpdate.push(variable);
          } else {
            console.warn(`  → 无法解析标识符: ${variable.identifier}`);
          }
        } catch (error) {
          console.error(`处理变量 ${variable.id} 时出错:`, error);
        }
      }
    }
    
    // 更新数据库
    if (variablesToUpdate.length > 0) {
      console.log(`准备更新 ${variablesToUpdate.length} 个变量的显示标识符...`);
      await variableRepo.save(variablesToUpdate);
      console.log('变量更新成功');
    } else {
      console.log('没有需要更新的变量');
    }
    
    console.log('显示标识符更新完成');
    
  } catch (error) {
    console.error('更新显示标识符时发生错误:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行脚本
updateDisplayIdentifiers()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
