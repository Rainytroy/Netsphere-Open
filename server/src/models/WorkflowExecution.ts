import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from "typeorm";
import { Workflow } from "./Workflow";

/**
 * 执行状态枚举
 * 定义工作流执行的各种状态
 */
export enum ExecutionStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  WAITING = 'waiting'
}

/**
 * 工作流执行记录实体类
 * 记录工作流的执行状态和结果
 */
@Entity("workflow_executions")
export class WorkflowExecution {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow, workflow => workflow.executions)
  @JoinColumn({ name: "workflowId" })
  workflow: Workflow;

  @Column({
    type: "varchar",
    enum: ExecutionStatus,
    default: ExecutionStatus.IDLE
  })
  status: ExecutionStatus;

  @Column("simple-json", { nullable: true })
  input: any;  // 工作流输入数据

  @Column("simple-json", { nullable: true })
  output: any;  // 工作流输出数据

  @Column("simple-json")
  nodeStates: {  // 各节点执行状态
    [nodeId: string]: {
      status: ExecutionStatus;
      startTime?: Date;
      endTime?: Date;
      runCount: number;
      output?: any;
      error?: string;
    }
  };

  @Column("text", { nullable: true })
  error: string;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
