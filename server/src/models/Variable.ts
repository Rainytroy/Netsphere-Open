import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

/**
 * 变量类型枚举
 */
export enum VariableType {
  NPC = 'npc',
  TASK = 'task',
  CUSTOM = 'custom',
  FILE = 'file',
  WORKFLOW = 'workflow'
}

/**
 * 变量来源信息
 */
export interface VariableSource {
  id: string;      // 来源ID
  name: string;    // 来源名称
  type: string;    // 来源类型
}

/**
 * 全局变量实体
 */
@Entity('variables')
export class Variable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'varchar',
    enum: VariableType,
    default: VariableType.CUSTOM
  })
  type: VariableType;

  @Column({ type: 'json' })
  source: VariableSource;

@Column({ type: 'varchar', length: 200, unique: true })
  identifier: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  displayIdentifier: string;

  @Column({ type: 'text' })
  value: string;

  /**
   * 关联的实体ID
   * 用于快速查找特定实体相关的所有变量
   */
@Column({ type: 'varchar', length: 50, nullable: true })
  entityId: string | null;

  /**
   * 变量字段名称
   * 如name, knowledge, input, output, value等
   */
  @Column({ type: 'varchar', length: 50 })
  fieldname: string;

  /**
   * 变量是否有效标记
   * true: 变量有效
   * false: 变量已失效（软删除）
   */
  @Column({ type: 'boolean', default: true })
  isValid: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * NPC变量字段类型
 */
export enum NpcVariableField {
  KNOWLEDGE_BACKGROUND = 'knowledgeBackground',
  ACTION_PRINCIPLES = 'actionPrinciples',
  ACTIVITY_LEVEL = 'activityLevel',
  ACTIVITY_LEVEL_DESCRIPTION = 'activityLevelDescription',
  DESCRIPTION = 'description'
}

/**
 * 任务变量字段类型
 */
export enum TaskVariableField {
  INPUT = 'input',
  OUTPUT = 'output'
}

/**
 * 创建变量的请求参数类型
 */
export interface CreateVariableDto {
  name: string;
  type?: VariableType;
  source?: VariableSource;
  identifier?: string;
  displayIdentifier?: string;
  value: string;
  entityId?: string | null;
  fieldname: string;
  isValid?: boolean;
}

/**
 * 更新变量的请求参数类型
 */
export type UpdateVariableDto = Pick<Variable, 'name' | 'value' | 'displayIdentifier' | 'fieldname'>;
