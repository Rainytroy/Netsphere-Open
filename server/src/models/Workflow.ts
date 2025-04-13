import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from "typeorm";
import { WorkflowNode } from "./WorkflowNode";
import { WorkflowConnection } from "./WorkflowConnection";
import { WorkflowExecution } from "./WorkflowExecution";

/**
 * 工作流实体类
 * 定义工作流的基本信息
 */
@Entity("workflows")
export class Workflow {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column("text", { nullable: true })
  description: string;

  @Column("simple-json")
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastRunAt?: Date;
    version: number;
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => WorkflowNode, node => node.workflow)
  nodes: WorkflowNode[];

  @OneToMany(() => WorkflowConnection, connection => connection.workflow)
  connections: WorkflowConnection[];

  @OneToMany(() => WorkflowExecution, execution => execution.workflow)
  executions: WorkflowExecution[];
}
