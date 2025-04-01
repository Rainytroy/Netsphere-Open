/**
 * VariableEditorXWrapper工具函数 - v3.0版本
 * 专为v3.0变量系统设计，仅支持v3.0标识符格式
 * 主要用于内容格式转换和变量处理
 */
import { 
  rawTextToHtml, 
  htmlToRawText, 
  rawTextToResolvedText, 
  extractV3Identifiers 
} from '../../../pages/demo/variable-editor-x/utils/formatters';
import { VariableData } from '../types';

/**
 * v3.0格式转换工具
 * 提供专门针对v3.0标识符格式的格式转换和处理
 */
const formatUtils = {
  /**
   * 将v3.0 rawText格式转换为HTML格式（供编辑器展示）
   * @param rawText rawText格式内容
   * @param variables 变量数据
   */
  rawTextToHtml: (rawText: string, variables: VariableData[] = []): string => {
    if (!rawText) return '';
    return rawTextToHtml(rawText, variables);
  },
  
  /**
   * 将HTML格式转换为v3.0 rawText格式（用于保存）
   * @param html HTML格式内容
   */
  htmlToRawText: (html: string): string => {
    if (!html) return '';
    return htmlToRawText(html);
  },
  
  /**
   * 将v3.0 rawText格式解析为纯文本（变量替换为对应值）
   * @param rawText rawText格式内容
   * @param variables 变量数据
   */
  resolveText: (rawText: string, variables: VariableData[] = []): string => {
    if (!rawText) return '';
    return rawTextToResolvedText(rawText, variables);
  },
  
  /**
   * 从rawText中提取使用的v3.0格式系统标识符
   * @param rawText rawText格式内容
   */
  extractVariableIds: (rawText: string): Array<{type: string, id: string, field: string, raw: string}> => {
    if (!rawText) return [];
    return extractV3Identifiers(rawText);
  },
  
  /**
   * 根据提取的v3.0标识符从变量列表中查找完整变量数据
   * @param extractedIds 提取的标识符信息
   * @param variables 变量数据列表
   */
  findVariablesByIds: (
    extractedIds: Array<{type: string, id: string, field: string, raw: string}>, 
    variables: VariableData[]
  ): VariableData[] => {
    if (!extractedIds.length || !variables.length) return [];
    
    const result: VariableData[] = [];
    
    extractedIds.forEach(({type, id, field}) => {
      // 使用type+id+field精确匹配v3.0标识符
      const variable = variables.find(v => 
        v.type === type && v.id === id && v.field === field
      );
      
      if (variable) {
        result.push(variable);
      }
    });
    
    return result;
  }
};

export default formatUtils;
