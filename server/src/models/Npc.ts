import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("npcs")
export class Npc {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true })
  avatar: string;

  @Column("text")
  knowledgeBackground: string;

  @Column("text")
  actionPrinciples: string;

  @Column("float", { default: 1 })
  activityLevel: number;

  @Column("text")
  activityLevelDescription: string;

  @Column("text", { nullable: true })
  description: string;
  
  @Column("text", { nullable: true })
  promptTemplate: string;

  @Column("simple-json", { nullable: true })
  files: {
    images: string[];
    documents: string[];
    searchResults: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
