import { AppDataSource } from "../database";
import { AiService } from "../models/AiService";

/**
 * 数据库迁移脚本 - 添加useStream字段到AI服务表
 * 用于支持DeepSeek的流式输出配置
 */
async function runMigration() {
  try {
    // 确保数据库连接已初始化
    if (!AppDataSource.isInitialized) {
      console.log('初始化数据库连接...');
      await AppDataSource.initialize();
    }
    
    console.log('开始执行迁移: 添加useStream字段到AI服务表');
    
    // 检查列是否已存在
    const hasColumn = await AppDataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ai_services' AND column_name = 'useStream'
    `);
    
    if (hasColumn.length === 0) {
      console.log('添加useStream字段到ai_services表...');
      
      // 添加列
      await AppDataSource.query(`
        ALTER TABLE ai_services 
        ADD COLUMN useStream BOOLEAN NOT NULL DEFAULT false
      `);
      
      console.log('useStream字段已成功添加');
    } else {
      console.log('useStream字段已存在，跳过');
    }
    
    console.log('迁移成功完成');
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    throw error;
  } finally {
    // 确保关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// 执行迁移
runMigration()
  .then(() => {
    console.log('迁移已完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
