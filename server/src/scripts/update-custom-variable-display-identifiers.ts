import { AppDataSource } from '../database';
import { Variable, VariableType } from '../models/Variable';
import { IdentifierFormatterService } from '../services/IdentifierFormatterService';

/**
 * 脚本：更新自定义变量的显示标识符
 * 用于修复自定义变量显示标识符错误的问题
 */
async function updateCustomVariableDisplayIdentifiers() {
  try {
    console.log('开始更新自定义变量的显示标识符...');
    
    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('数据库连接已初始化');
    }

    // 获取变量仓库
    const variableRepo = AppDataSource.getRepository(Variable);
    
    // 查询所有自定义类型的变量
    const customVariables = await variableRepo.find({
      where: {
        type: VariableType.CUSTOM
      }
    });
    
    console.log(`找到 ${customVariables.length} 个自定义变量`);
    
    if (customVariables.length === 0) {
      console.log('没有自定义变量需要更新');
      return;
    }
    
    // 获取标识符格式化服务
    const identifierFormatter = IdentifierFormatterService.getInstance();
    
    // 计数器
    let updatedCount = 0;
    
    // 更新每个自定义变量的显示标识符
    for (const variable of customVariables) {
      // 确保有entityId，如果没有则使用id
      const entityId = variable.entityId || variable.id;
      
      // 生成新的显示标识符
      // 关键修复: 使用变量的名称而不是固定的'自定义变量'
      const newDisplayIdentifier = identifierFormatter.formatDisplayIdentifier(
        'custom',
        variable.name, // 使用变量自身的名称
        'value',
        entityId
      );
      
      // 检查是否需要更新
      if (variable.displayIdentifier !== newDisplayIdentifier) {
        // 记录变更
        console.log(`更新变量 ${variable.id} | ${variable.name}:`);
        console.log(`  旧显示标识符: ${variable.displayIdentifier || '(无)'}`);
        console.log(`  新显示标识符: ${newDisplayIdentifier}`);
        
        // 更新显示标识符
        variable.displayIdentifier = newDisplayIdentifier;
        
        // 保存变量
        await variableRepo.save(variable);
        
        updatedCount++;
      }
    }
    
    console.log(`完成更新，共更新了 ${updatedCount} 个自定义变量的显示标识符`);
    
  } catch (error) {
    console.error('更新自定义变量显示标识符时发生错误:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行脚本
updateCustomVariableDisplayIdentifiers().catch(console.error);
