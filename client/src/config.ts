/**
 * 全局配置文件
 * 集中管理应用的配置项
 */

// API基础URL
export const API_BASE_URL = 'http://localhost:3001/api';

// 默认分页大小
export const DEFAULT_PAGE_SIZE = 10;

// 上传文件大小限制 (字节)
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB

// 工作流节点类型
export enum NodeType {
  START = 'start',
  WORK_TASK = 'work_task',
  ASSIGN = 'assign',
  LOOP = 'loop',
  DISPLAY = 'display'
}

// 工作流模块功能标记
export const ENABLE_WORKFLOW = true;

// 开发环境配置
export const isDevelopment = process.env.NODE_ENV === 'development';

// 应用版本
export const APP_VERSION = '0.2.0'; // 包含工作流模块的版本
