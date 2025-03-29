import { useCallback } from 'react';
import { useVariableData } from './useVariableData';
import {
  htmlToRawText,
  rawTextToHtml,
  rawTextToResolvedText,
  rawTextToResolvedHtml,
  htmlToJson
} from '../utils/formatters';

/**
 * 变量解析Hook - 简化版
 * 提供内容格式转换和变量解析功能
 * 不依赖API调用，使用本地变量列表
 */
export const useVariableParser = () => {
  // 获取本地变量列表
  const { variables } = useVariableData();
  
  /**
   * 解析文本中的变量标识符，替换为实际值（纯文本格式）
   */
  const parseText = useCallback(async (text: string): Promise<string> => {
    if (!text) return '';
    return rawTextToResolvedText(text, variables);
  }, [variables]);
  
  /**
   * 解析文本中的变量标识符，替换为实际值（保留HTML格式）
   */
  const parseHtml = useCallback(async (text: string): Promise<string> => {
    if (!text) return '';
    return rawTextToResolvedHtml(text, variables);
  }, [variables]);
  
  /**
   * 将系统标识符格式(rawtext)转换为HTML格式
   */
  const convertToHtml = useCallback(async (text: string): Promise<string> => {
    if (!text) return '';
    return rawTextToHtml(text, variables);
  }, [variables]);
  
  /**
   * 将HTML格式转换为系统标识符格式(rawtext)
   */
  const convertToRawText = useCallback((html: string): string => {
    if (!html) return '';
    return htmlToRawText(html);
  }, []);
  
  /**
   * 将HTML格式转换为JSON格式
   */
  const convertToJson = useCallback((html: string, editor: any): string => {
    if (!html || !editor) return '{}';
    return htmlToJson(html, editor);
  }, []);
  
  /**
   * 粘贴内容处理
   * 将粘贴内容中的系统标识符转换为变量标签
   */
  const processPastedContent = useCallback(async (content: string): Promise<string> => {
    // 检测是否为HTML内容
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    
    if (isHtml) {
      // 处理HTML粘贴内容
      // 1. 先提取纯文本并转换为系统标识符格式
      const rawText = htmlToRawText(content);
      // 2. 再将系统标识符转换为HTML格式
      return rawTextToHtml(rawText, variables);
    } else {
      // 处理纯文本粘贴内容
      // 直接将文本中的系统标识符转换为HTML格式
      return rawTextToHtml(content, variables);
    }
  }, [variables]);
  
  return {
    parseText,        // 解析为纯文本格式 (移除HTML标签)
    parseHtml,        // 解析为富文本HTML格式 (保留HTML标签)
    convertToHtml,
    convertToRawText,
    convertToJson,
    processPastedContent
  };
};
