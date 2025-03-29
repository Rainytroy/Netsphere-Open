import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Npc } from "./Npc";
import { AiService } from "./AiService";

// 工作任务状态枚举
export enum WorkTaskStatus {
  DRAFT = 'draft',       // 草稿
  ACTIVE = 'active',     // 激活
  ARCHIVED = 'archived'  // 归档
}

// 工作任务执行状态枚举
export enum ExecutionStatus {
  IDLE = 'idle',               // 空闲状态
  RUNNING = 'running',         // 执行中
  COMPLETED = 'completed',     // 执行完成
  FAILED = 'failed'            // 执行失败
}

// NPC提示词模板设置接口
export interface NpcPromptTemplate {
  template: string;      // 提示词模板
  isCustomized: boolean; // 是否自定义（false则使用默认模板）
  lastModified?: string; // 可选的最后修改时间
}

@Entity("work_tasks")
export class WorkTask {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column("text")
  input: string;

  @Column({ nullable: true })
  npcId: string;

  @Column({ length: 100, nullable: true })
  npcName: string;

  @Column()
  aiServiceId: string;

  @Column({ length: 100 })
  aiServiceName: string;

  @Column("simple-json")
  npcPromptTemplate: NpcPromptTemplate;
  
  @Column("simple-json", { name: "npc_templates", nullable: true })
  npcTemplates: Record<string, NpcPromptTemplate>;

  @Column("text", { default: "" })
  output: string;

  @Column({
    type: "varchar",
    enum: WorkTaskStatus,
    default: WorkTaskStatus.DRAFT
  })
  status: WorkTaskStatus;

  @Column({
    type: "varchar",
    enum: ExecutionStatus,
    default: ExecutionStatus.IDLE
  })
  executionStatus: ExecutionStatus;

  @Column({ nullable: true })
  executionMessage: string;

  @Column({ nullable: true })
  lastRunAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// 工作任务变量字段类型枚举
export enum WorkTaskVariableField {
  INPUT = 'input',
  OUTPUT = 'output'
}

// 工作任务事件类型枚举
export enum WorkTaskEventType {
  INPUT_CHANGED = 'input_changed',   // 输入内容变更
  OUTPUT_CHANGED = 'output_changed', // 输出内容变更
  EXECUTION_STARTED = 'execution_started', // 开始执行
  EXECUTION_COMPLETED = 'execution_completed', // 执行完成
  EXECUTION_FAILED = 'execution_failed' // 执行失败
}
