import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from "typeorm";
import { Workflow } from "./Workflow";
import { WorkflowConnection } from "./WorkflowConnection";

/**
 * 节点类型枚举
 * 定义工作流中可用的节点类型
 */
export enum NodeType {
  START = 'start',
  WORK_TASK = 'work_task',
  DISPLAY = 'display',
  ASSIGNMENT = 'assignment',
  LOOP = 'loop',
  AI_JUDGMENT = 'ai_judgment',
  WORKFLOW = 'workflow'  // 嵌套工作流
}

/**
 * 工作流节点实体类
 * 定义工作流中的各类卡片节点
 */
@Entity("workflow_nodes")
export class WorkflowNode {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  workflowId: string;

  @ManyToOne(() => Workflow, workflow => workflow.nodes)
  @JoinColumn({ name: "workflowId" })
  workflow: Workflow;

  @Column({
    type: "varchar",
    enum: NodeType
  })
  type: NodeType;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column("simple-json")
  position: {
    x: number;
    y: number;
  };

  @Column("simple-json")
  config: any;  // 节点特定配置

  @Column("simple-json", { nullable: true })
  data: any;  // 节点运行时数据

  @OneToMany(() => WorkflowConnection, connection => connection.sourceNode)
  outgoingConnections: WorkflowConnection[];

  @OneToMany(() => WorkflowConnection, connection => connection.targetNode)
  incomingConnections: WorkflowConnection[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
