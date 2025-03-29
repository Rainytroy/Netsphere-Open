import { AppDataSource } from "../database";
import * as path from "path";
import * as fs from "fs";

/**
 * 这个脚本用于完全重建数据库
 * 应对SQLite不支持非常量默认值的问题
 */
async function rebuildDatabase(): Promise<void> {
  try {
    console.log("开始数据库重建流程...");
    
    // 数据库文件路径
    const dbPath = path.join(__dirname, "../../database/netsphere.db");
    const backupPath = path.join(__dirname, "../../database/netsphere.db.backup");
    
    // 1. 如果数据库连接已初始化，先关闭它
    if (AppDataSource.isInitialized) {
      console.log("关闭现有数据库连接...");
      await AppDataSource.destroy();
    }
    
    // 2. 备份当前数据库文件
    if (fs.existsSync(dbPath)) {
      console.log(`备份当前数据库到 ${backupPath}`);
      fs.copyFileSync(dbPath, backupPath);
      
      // 删除原数据库文件
      console.log("删除原数据库文件...");
      fs.unlinkSync(dbPath);
    } else {
      console.log(`数据库文件不存在: ${dbPath}`);
    }
    
    // 3. 初始化数据库连接
    console.log("初始化新的数据库连接...");
    await AppDataSource.initialize();
    
    console.log("数据库重建成功！");
    
    // 4. 关闭连接
    await AppDataSource.destroy();
  } catch (error) {
    console.error("数据库重建失败:", error);
    throw error;
  }
}

// 当直接运行此文件时执行重建
if (require.main === module) {
  rebuildDatabase()
    .then(() => {
      console.log("数据库重建完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("数据库重建失败", error);
      process.exit(1);
    });
}
