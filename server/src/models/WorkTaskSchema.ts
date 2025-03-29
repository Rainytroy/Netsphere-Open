import { EntitySchema } from "typeorm";
import { WorkTask } from "./WorkTask";
import { WorkTaskStatus, ExecutionStatus } from "./WorkTask";

/**
 * TypeORM模式定义 - 工作任务
 * 修复npcTemplates字段默认值问题
 */
export const WorkTaskSchema = new EntitySchema<WorkTask>({
  name: "WorkTask",
  tableName: "work_tasks",
  target: WorkTask,
  columns: {
    id: {
      type: String,
      primary: true,
      generated: "uuid",
    },
    name: {
      type: String,
      length: 100,
      nullable: false,
    },
    input: {
      type: String,
      nullable: false,
    },
    npcId: {
      type: String,
      nullable: true,
    },
    npcName: {
      type: String,
      length: 100,
      nullable: true,
    },
    aiServiceId: {
      type: String,
      nullable: false,
    },
    aiServiceName: {
      type: String,
      length: 100,
      nullable: false,
    },
    npcPromptTemplate: {
      type: "simple-json",
      nullable: false,
    },
    // 修复的字段：指定正确的数据库列名，并设置为可为null
    npcTemplates: {
      name: "npc_templates", // 明确指定数据库列名为snake_case
      type: "simple-json",
      nullable: true, // 不指定默认值，而是设为可为null
    },
    output: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: WorkTaskStatus,
      default: WorkTaskStatus.DRAFT,
    },
    executionStatus: {
      type: String,
      enum: ExecutionStatus,
      default: ExecutionStatus.IDLE,
    },
    executionMessage: {
      type: String,
      nullable: true,
    },
    lastRunAt: {
      type: Date,
      nullable: true,
    },
    createdAt: {
      type: Date,
      createDate: true,
    },
    updatedAt: {
      type: Date,
      updateDate: true,
    },
  },
  // 其他关系定义可以在这里添加
});
