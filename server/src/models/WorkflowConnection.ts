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
import { WorkflowNode } from "./WorkflowNode";

/**
 * 工作流连接实体类
 * 定义工作流节点之间的连接关系
 */
@Entity("workflow_connections")
export class WorkflowConnection {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow, workflow => workflow.connections)
  @JoinColumn({ name: "workflowId" })
  workflow: Workflow;

  @Column()
  sourceNodeId: string;

  @ManyToOne(() => WorkflowNode, node => node.outgoingConnections)
  @JoinColumn({ name: "sourceNodeId" })
  sourceNode: WorkflowNode;

  @Column()
  targetNodeId: string;

  @ManyToOne(() => WorkflowNode, node => node.incomingConnections)
  @JoinColumn({ name: "targetNodeId" })
  targetNode: WorkflowNode;

  @Column({ nullable: true })
  label: string;  // 例如"Yes"/"No"

  @Column("simple-json", { nullable: true })
  config: any;  // 连接特定配置

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
