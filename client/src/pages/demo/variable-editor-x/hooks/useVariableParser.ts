import { useCallback } from 'react';
import { useVariableData } from './useVariableData';
import {
  htmlToRawText,
  rawTextToHtml,
  rawTextToResolvedText,
  rawTextToResolvedHtml,
  extractV3Identifiers
} from '../utils/formatters';

/**
 * 变量解析Hook - v3.0版本
 * 专为v3.0变量系统设计，仅支持v3.0标识符格式
 * 提供内容格式转换和变量解析功能
 */
export const useVariableParser = () => {
  // 获取本地变量列表
  const { variables } = useVariableData();
  
  /**
   * 解析文本中的v3.0变量标识符，替换为实际值（纯文本格式）
   * @param text 要解析的文本
   */
  const parseText = useCallback(async (text: string): Promise<string> => {
    if (!text) return '';
    
    console.log('[v3.0 Debug] useVariableParser.parseText - 开始解析...');
    console.log(`[v3.0 Debug] parseText - 变量数量: ${variables.length}`);
    
    // 如果包含v3.0标识符但变量列表为空，发出警告
    if (text.includes('@gv_') && variables.length === 0) {
      console.warn('[v3.0 Debug] 警告: 文本包含标识符但变量列表为空');
      return text; // 返回原始文本，避免空白解析结果
    }
    
    // 调试：输出一些变量样本
    if (variables.length > 0) {
      console.log('[v3.0 Debug] 可用变量示例:', 
        variables.slice(0, 3).map(v => ({
          id: v.id.substring(0, 8) + '...',
          type: v.type,
          field: v.field,
          value: v.value?.substring(0, 20) || '(空值)'
        }))
      );
    }
    
    try {
      const result = rawTextToResolvedText(text, variables);
      return result;
    } catch (error) {
      console.error('[v3.0 Debug] 解析文本时出错:', error);
      // 出错时返回原文本，避免UI崩溃
      return text;
    }
  }, [variables]);
  
  /**
   * 解析文本中的v3.0变量标识符，替换为实际值（保留HTML格式）
   */
  const parseHtml = useCallback(async (text: string): Promise<string> => {
    if (!text) return '';
    return rawTextToResolvedHtml(text, variables);
  }, [variables]);
  
  /**
   * 将v3.0系统标识符格式(rawtext)转换为HTML格式
   */
  const convertToHtml = useCallback(async (text: string): Promise<string> => {
    if (!text) return '';
    return rawTextToHtml(text, variables);
  }, [variables]);
  
  /**
   * 将HTML格式转换为v3.0系统标识符格式(rawtext)
   */
  const convertToRawText = useCallback((html: string): string => {
    if (!html) return '';
    return htmlToRawText(html);
  }, []);
  
  /**
   * 提取文本中的v3.0变量标识符
   */
  const extractIdentifiers = useCallback((text: string) => {
    if (!text) return [];
    return extractV3Identifiers(text);
  }, []);
  
  /**
   * 粘贴内容处理
   * 将粘贴内容中的v3.0系统标识符转换为变量标签
   */
  const processPastedContent = useCallback(async (content: string): Promise<string> => {
    // 检测是否为HTML内容
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    
    if (isHtml) {
      // 处理HTML粘贴内容
      // 1. 先提取纯文本并转换为v3.0系统标识符格式
      const rawText = htmlToRawText(content);
      // 2. 再将v3.0系统标识符转换为HTML格式
      return rawTextToHtml(rawText, variables);
    } else {
      // 处理纯文本粘贴内容
      // 直接将文本中的v3.0系统标识符转换为HTML格式
      return rawTextToHtml(content, variables);
    }
  }, [variables]);
  
  return {
    parseText,          // 解析为纯文本格式 (移除HTML标签)
    parseHtml,          // 解析为富文本HTML格式 (保留HTML标签)
    convertToHtml,      // v3.0系统标识符转HTML
    convertToRawText,   // HTML转v3.0系统标识符
    extractIdentifiers, // 提取v3.0标识符
    processPastedContent // 处理粘贴内容
  };
};
