/**
 * VariableEditorXWrapper工具函数
 * 主要用于内容格式转换和变量处理
 */
import { rawTextToHtml, htmlToRawText, rawTextToResolvedText } from '../../../pages/demo/variable-editor-x/utils/formatters';
import { VariableData } from '../types';

/**
 * 格式转换工具
 * 封装自原始formatters.ts，提供更简洁的API
 */
const formatUtils = {
  /**
   * 将rawText格式转换为HTML格式（供编辑器展示）
   * @param rawText rawText格式内容
   * @param variables 变量数据
   */
  rawTextToHtml: (rawText: string, variables: VariableData[] = []): string => {
    if (!rawText) return '';
    return rawTextToHtml(rawText, variables);
  },
  
  /**
   * 将HTML格式转换为rawText格式（用于保存）
   * @param html HTML格式内容
   */
  htmlToRawText: (html: string): string => {
    if (!html) return '';
    return htmlToRawText(html);
  },
  
  /**
   * 将rawText格式解析为纯文本（变量替换为对应值）
   * @param rawText rawText格式内容
   * @param variables 变量数据
   */
  resolveText: (rawText: string, variables: VariableData[] = []): string => {
    if (!rawText) return '';
    return rawTextToResolvedText(rawText, variables);
  },
  
  /**
   * 从rawText中提取使用的变量标识符
   * @param rawText rawText格式内容
   */
  extractVariableIds: (rawText: string): Array<{id: string, field: string}> => {
    if (!rawText) return [];
    
    const regex = /@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(rawText)) !== null) {
      if (match.length >= 3) {
        matches.push({
          id: match[1],
          field: match[2]
        });
      }
    }
    
    // 去重
    const uniqueMatches = matches.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id && t.field === item.field)
    );
    
    return uniqueMatches;
  },
  
  /**
   * 根据提取的ID和field从变量列表中查找完整变量数据
   * @param extractedIds 提取的ID和field数组
   * @param variables 变量数据列表
   */
  findVariablesByIds: (
    extractedIds: Array<{id: string, field: string}>, 
    variables: VariableData[]
  ): VariableData[] => {
    if (!extractedIds.length || !variables.length) return [];
    
    const result: VariableData[] = [];
    
    extractedIds.forEach(({id, field}) => {
      const variable = variables.find(v => v.id === id && v.field === field);
      if (variable) {
        result.push(variable);
      }
    });
    
    return result;
  }
};

export default formatUtils;
