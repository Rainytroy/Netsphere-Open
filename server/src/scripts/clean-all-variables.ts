import { AppDataSource } from '../database';
import { Variable } from '../models/Variable';

/**
 * 清理脚本：删除所有变量
 * 用于全局变量体系重构前清理数据库
 */
async function cleanAllVariables() {
  try {
    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('数据库连接已初始化');
    }

    // 获取变量仓库
    const variableRepo = AppDataSource.getRepository(Variable);
    
    // 查询所有变量
    const variables = await variableRepo.find();
    console.log(`共找到 ${variables.length} 个变量`);
    
    if (variables.length === 0) {
      console.log('没有变量需要清理');
      return;
    }
    
    // 删除所有变量
    const result = await variableRepo.delete({});
    console.log(`已成功删除 ${result.affected} 个变量`);
    
    console.log('变量清理完成，系统已准备好进行全局变量重构');
  } catch (error) {
    console.error('清理变量时发生错误:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行清理
cleanAllVariables().catch(console.error);
