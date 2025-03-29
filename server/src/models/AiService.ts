import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate } from "typeorm";
import crypto from 'crypto';

// AI服务类型枚举
export enum AiServiceType {
  DEEPSEEK = 'deepseek',
  ANTHROPIC = 'anthropic'
}

@Entity("ai_services")
export class AiService {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({
    type: "varchar",
    length: 50,
    enum: AiServiceType
  })
  type: AiServiceType;

  @Column("text")
  apiKey: string;

  @Column({ nullable: true })
  baseUrl: string;

  @Column({ nullable: true })
  defaultModel: string;

  @Column("simple-json", { nullable: true })
  config: Record<string, any>;

  @Column({ default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  encryptApiKey() {
    // 只有当API密钥不是已加密格式时才进行加密
    if (this.apiKey && !this.apiKey.includes(':')) {
      this.apiKey = this.encrypt(this.apiKey);
    }
  }

  // 加密方法 - 使用环境变量中的密钥
  private encrypt(text: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-development';
    
    // 使用固定长度的密钥（AES-256需要32字节密钥）
    const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
    
    // 生成随机IV
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    // 加密
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 返回格式：iv:加密文本
    return `${iv.toString('hex')}:${encrypted}`;
  }

  // 解密API密钥方法
  decryptApiKey(): string {
    if (!this.apiKey || !this.apiKey.includes(':')) {
      return this.apiKey;
    }

    const encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-development';
    const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
    
    const [ivHex, encryptedText] = this.apiKey.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// 服务配置模板（针对不同服务类型的配置项定义）
export const serviceConfigTemplates: Record<AiServiceType, {
  requiresBaseUrl: boolean;
  availableModels: Array<{value: string, label: string}>;
  defaultModel: string;
  configFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'switch';
    defaultValue: any;
    options?: Array<{value: any, label: string}>;
  }>;
}> = {
  [AiServiceType.DEEPSEEK]: {
    requiresBaseUrl: true,
    availableModels: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }
    ],
    defaultModel: 'deepseek-chat',
    configFields: [
      {
        name: 'temperature',
        label: '温度',
        type: 'number',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        label: '最大Token数',
        type: 'number',
        defaultValue: 2000
      }
    ]
  },
  [AiServiceType.ANTHROPIC]: {
    requiresBaseUrl: false,
    availableModels: [
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' }
    ],
    defaultModel: 'claude-3-sonnet-20240229',
    configFields: [
      {
        name: 'temperature',
        label: '温度',
        type: 'number',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        label: '最大Token数',
        type: 'number',
        defaultValue: 4000
      }
    ]
  }
};
