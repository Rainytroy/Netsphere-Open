import { DataSource } from "typeorm";
import path from "path";
import dotenv from "dotenv";
import * as fs from "fs";

// 加载环境变量
dotenv.config();

// 确保数据库目录存在
const dbDir = path.join(__dirname, "../database");
if (!fs.existsSync(dbDir)) {
  console.log("创建数据库目录", dbDir);
  fs.mkdirSync(dbDir, { recursive: true });
}

const AppDataSource = new DataSource({
  type: "sqlite",
  database: path.join(__dirname, "../database/netsphere.db"),
  entities: [path.join(__dirname, "./models/**/*.{js,ts}")], // 同时支持js和ts文件
  synchronize: true, // 开发环境使用，生产环境请关闭
  logging: process.env.NODE_ENV === "development"
});

export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("数据库连接成功");
    }
    return AppDataSource;
  } catch (error) {
    console.error("数据库连接失败", error);
    throw error;
  }
};

export { AppDataSource };
