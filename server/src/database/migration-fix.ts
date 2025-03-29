import { AppDataSource } from "../database";
import * as path from "path";
import * as fs from "fs";

/**
 * 这个脚本用于修复数据库结构问题
 * 特别是处理npcTemplates字段的默认值问题
 */
export async function runDatabaseFix(): Promise<void> {
  try {
    // 确保数据库已连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("数据库连接已初始化");
    }

    // 使用原始SQL查询修复表结构
    const query = `
      -- 检查npcTemplates列是否存在
      PRAGMA table_info('work_tasks');
      
      -- 如果npcTemplates不存在，添加它（没有默认值）
      ALTER TABLE work_tasks ADD COLUMN npcTemplates TEXT NULL;
      
      -- 如果它已经存在但有问题，我们无法直接修改列
      -- SQLite不支持ALTER COLUMN，所以需要使用临时表和数据迁移
    `;

    await AppDataSource.query(query);
    console.log("数据库修复查询已执行");

    // 关闭连接
    await AppDataSource.destroy();
    console.log("数据库连接已关闭");
  } catch (error) {
    console.error("数据库修复失败", error);
    throw error;
  }
}

// 当直接运行此文件时执行修复
if (require.main === module) {
  runDatabaseFix()
    .then(() => {
      console.log("数据库修复完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("数据库修复失败", error);
      process.exit(1);
    });
}
