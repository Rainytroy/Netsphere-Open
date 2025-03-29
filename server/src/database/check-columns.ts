import { AppDataSource } from "../database";

async function checkTableStructure(): Promise<void> {
  try {
    // 确保数据库已连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log("数据库连接已初始化");
    }

    // 查询表结构
    const tableInfo = await AppDataSource.query("PRAGMA table_info('work_tasks')");
    console.log("work_tasks表结构:");
    console.table(tableInfo);
    
    // 检查特定列是否存在
    const hasNpcTemplates = tableInfo.some((col: any) => col.name === 'npcTemplates');
    const hasNpcTemplatesSnake = tableInfo.some((col: any) => col.name === 'npc_templates');
    
    console.log('npcTemplates列存在:', hasNpcTemplates);
    console.log('npc_templates列存在:', hasNpcTemplatesSnake);

    // 关闭连接
    await AppDataSource.destroy();
  } catch (error) {
    console.error("查询失败", error);
    throw error;
  }
}

// 执行查询
checkTableStructure()
  .then(() => {
    console.log("查询完成");
    process.exit(0);
  })
  .catch(error => {
    console.error("查询失败:", error);
    process.exit(1);
  });
