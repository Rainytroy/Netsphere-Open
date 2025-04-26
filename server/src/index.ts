import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { initializeDatabase } from "./database";
import path from "path";

// 导入服务
import { VariableSourceRegistry } from "./services/VariableSourceRegistry";
import { NpcVariableSourceProvider } from "./services/NpcVariableSourceProvider";
import { WorkTaskVariableSourceProvider } from "./services/WorkTaskVariableSourceProvider";
import { WorkflowVariableSourceProvider } from "./services/WorkflowVariableSourceProvider";
import { entityVariableSyncService } from "./services/EntityVariableSyncService";

// 导入路由
import npcRoutes from "./routes/npc";
import workTaskRoutes from "./routes/work-task";
import variableRoutes from "./routes/variable";
import workflowRoutes from "./routes/workflow";
import aiServiceRoutes from "./routes/ai-service";
import variableEventsRoutes from "./routes/variable-events";
// 以下路由可能路径有问题，暂时注释
// import variableDiagnosticRoutes from "./routes/variable-diagnostic";
// import workflowVariableRoutes from "./routes/workflow-variable";

// 导入变量同步通知控制器、SSE中间件、SSE测试控制器和SSE客户端管理器
import { variableSyncNotificationController } from "./controllers/VariableSyncNotificationController";
import { sseMiddleware } from "./middlewares/sseMiddleware";
import { sseTestController } from "./controllers/SseTestController";
import { sseClientManager } from "./services/SseClientManager";

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "服务器内部错误",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 初始化数据库连接
    await initializeDatabase();
    console.log("数据库初始化完成，开始注册路由...");
    
    // 注册路由 - 移动到数据库初始化之后
    app.use("/api/npc", npcRoutes);
    app.use("/api/work-tasks", workTaskRoutes);
    app.use("/api/variables", variableRoutes);
    app.use("/api/workflows", workflowRoutes);
    app.use("/api/ai-services", aiServiceRoutes);
    app.use("/api/variable-events", variableEventsRoutes);
    
    // 注册可能有问题的路由（暂时注释）
    // app.use("/api/variable-diagnostic", variableDiagnosticRoutes);
    // app.use("/api/workflow-variables", workflowVariableRoutes);
    
    // 注册变量同步通知控制器路由
    variableSyncNotificationController.registerRoutes(app);
    console.log("已注册变量同步通知控制器路由");
    
    // 注册SSE测试控制器路由
    sseTestController.registerRoutes(app);
    console.log("已注册SSE测试控制器路由");
    
    // 注册变量源
    const variableRegistry = VariableSourceRegistry.getInstance();
    
    // 注册NPC变量源
    const npcVariableProvider = new NpcVariableSourceProvider();
    variableRegistry.registerSource(npcVariableProvider);
    console.log("已注册NPC变量源");
    
    // 同步NPC变量到数据库
    try {
      await npcVariableProvider.syncVariablesToDatabase();
      console.log("已同步NPC变量到数据库");
    } catch (error) {
      console.error("同步NPC变量失败:", error);
    }
    
    // 注册工作任务变量源
    const workTaskVariableProvider = new WorkTaskVariableSourceProvider();
    variableRegistry.registerSource(workTaskVariableProvider);
    console.log("已注册工作任务变量源");
    
    // 同步工作任务变量到数据库
    try {
      await workTaskVariableProvider.syncVariablesToDatabase();
      console.log("已同步工作任务变量到数据库");
    } catch (error) {
      console.error("同步工作任务变量失败:", error);
    }
    
    // 注册工作流变量源
    const workflowVariableProvider = new WorkflowVariableSourceProvider();
    variableRegistry.registerSource(workflowVariableProvider);
    console.log("已注册工作流变量源");
    
    // 同步工作流变量到数据库
    try {
      await workflowVariableProvider.syncVariablesToDatabase();
      console.log("已同步工作流变量到数据库");
    } catch (error) {
      console.error("同步工作流变量失败:", error);
    }
    
    // 初始化实体变量同步服务（新增）
    console.log("正在初始化实体变量同步服务...");
    // entityVariableSyncService会在构造函数中自动注册所有订阅器
    // 手动进行一次所有实体的变量同步
    try {
      await entityVariableSyncService.syncAllVariables();
      console.log("已完成所有实体变量的同步");
    } catch (error) {
      console.error("同步所有实体变量失败:", error);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在 http://localhost:${PORT} (可通过任何网络接口访问)`);
    });
  } catch (error) {
    console.error("服务器启动失败:", error);
    process.exit(1);
  }
};

startServer();

// 注册进程退出前的清理任务
process.on('SIGINT', () => {
  console.log('服务器关闭中，正在清理资源...');
  
  // 清理SSE客户端连接
  sseClientManager.cleanup();
  
  // 清理变量同步通知控制器
  variableSyncNotificationController.cleanup();
  
  console.log('资源清理完成，进程即将退出');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('服务器被终止，正在清理资源...');
  
  // 清理SSE客户端连接
  sseClientManager.cleanup();
  
  // 清理变量同步通知控制器
  variableSyncNotificationController.cleanup();
  
  console.log('资源清理完成，进程即将退出');
  process.exit(0);
});
