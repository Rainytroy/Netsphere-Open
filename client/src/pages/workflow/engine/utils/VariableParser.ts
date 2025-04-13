/**
 * 变量解析器 - 负责在文本中识别和替换变量引用
 * V3.0版本 - 仅支持V3.0标识符格式
 */

// v3.0标识符格式正则表达式 - 优化以准确匹配
const V3_IDENTIFIER_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=/g;
const V3_IDENTIFIER_EXACT_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=$/;

// 变量信息接口
export interface VariableInfo {
  id: string;           // 变量ID
  type: string;         // 变量类型
  field: string;        // 字段名
  value: string;        // 变量值 
  sourceType: string;   // 来源类型
  sourceName: string;   // 来源名称
  displayIdentifier: string;  // 显示用的标识符（如 @workflow.startinput）
  identifier: string;   // 系统内部标识符（V3格式：@gv_type_source_field-=）
}

/**
 * 将变量对象转换为VariableInfo数组
 * @param variables 变量对象
 * @returns 变量信息数组
 */
export function collectVariables(variables: Record<string, any>): VariableInfo[] {
  // 基本变量收集
  const varInfoArray = Object.entries(variables).map(([key, value]) => {
    // 尝试解析变量标识符 @source.field
    const match = key.match(/^([^.]+)\.([^.]+)$/);
    if (match) {
      return {
        id: match[1],         // 来源名作为ID
        type: 'custom',       // 默认类型
        field: match[2],      // 字段名
        value: String(value), // 确保是字符串
        sourceType: 'custom', 
        sourceName: match[1],
        displayIdentifier: `@${match[1]}.${match[2]}`,
        identifier: `@gv_custom_${match[1]}_${match[2]}-=` // 构造V3格式识别符
      };
    }
    return null;
  }).filter((v): v is VariableInfo => v !== null);

  // 处理特殊变量: workflow.startinput
  if (variables.startinput) {
    varInfoArray.push({
      id: 'workflow',
      type: 'workflow',
      field: 'startinput',
      value: String(variables.startinput),
      sourceType: 'workflow',
      sourceName: 'workflow',
      displayIdentifier: '@workflow.startinput',
      identifier: '@gv_workflow_workflow_startinput-='
    });
  }

  return varInfoArray;
}

/**
 * 解析原始文本中的变量（仅支持V3格式标识符）
 * @param rawText 原始文本
 * @param variables 变量对象
 * @returns 处理后的文本
 */
export function parseRawText(
  rawText: string,
  variables: Record<string, any>
): string {
  const timestamp = new Date().toISOString().substring(11, 19);
  if (!rawText) return '';
  
  // 收集变量
  const availableVariables = collectVariables(variables);
  
  // 详细日志：记录输入文本和变量列表
  console.log(`[VariableParser ${timestamp}] 输入:`, {
    textLength: rawText.length,
    variablesCount: availableVariables.length
  });
  
  // 创建结果文本
  let result = rawText;
  
  // 获取所有v3.0格式标识符并去重
  const matches = Array.from(new Set(rawText.match(V3_IDENTIFIER_REGEX) || []));
  
  if (matches.length === 0) {
    console.log(`[VariableParser ${timestamp}] 未找到V3标识符，原样返回文本`);
    return rawText;
  }
  
  console.log(`[VariableParser ${timestamp}] 找到${matches.length}个V3标识符`);
  
  // 替换每个变量标识符为实际值
  for (const match of matches) {
    // 解析v3.0系统标识符
    const idMatch = match.match(V3_IDENTIFIER_EXACT_REGEX);
    if (!idMatch) {
      console.warn(`[VariableParser] 标识符格式不匹配:`, match);
      continue;
    }
    
    const [_, type, id, field] = idMatch;
    
    // 尝试多种匹配策略找到变量
    let variable = availableVariables.find(v => 
      (v.type === type && v.id === id && v.field === field)
    );
    
    if (!variable) {
      variable = availableVariables.find(v => 
        (v.type.toLowerCase() === type.toLowerCase() && 
         v.id === id && 
         v.field.toLowerCase() === field.toLowerCase())
      );
    }
    
    if (!variable) {
      variable = availableVariables.find(v => v.id === id);
    }
    
    if (variable) {
      // 获取变量值，如果不存在则使用空字符串
      const value = variable.value || '';
      
      // 替换文本中的所有标识符
      result = result.replace(new RegExp(escapeRegExp(match), 'g'), value);
      console.log(`[VariableParser] 替换 "${match}" => "${value}"`);
    } else {
      console.warn(`[VariableParser] 找不到匹配的变量: type=${type}, id=${id}, field=${field}`);
      // 保持原样，不替换
    }
  }
  
  return result;
}

/**
 * 解析模板文本中的变量
 * @param template 模板文本
 * @param variables 变量对象
 * @returns 处理后的文本
 */
export function parseTemplate(
  template: string | undefined,
  variables: Record<string, any>
): string {
  // 如果模板为空则返回空字符串
  if (!template) return '';
  
  // 调用parseRawText处理V3格式变量
  return parseRawText(template, variables);
}

/**
 * 提取文本中的v3.0变量标识符
 * @param text 要提取的文本
 * @returns 解析后的标识符数组
 */
export function extractV3Identifiers(text: string): Array<{type: string, id: string, field: string, raw: string}> {
  if (!text) return [];
  
  const results: Array<{type: string, id: string, field: string, raw: string}> = [];
  const matches = text.match(V3_IDENTIFIER_REGEX) || [];
  
  // 去重
  const uniqueMatches = Array.from(new Set(matches));
  
  for (const match of uniqueMatches) {
    const idMatch = match.match(V3_IDENTIFIER_EXACT_REGEX);
    if (idMatch && idMatch.length >= 4) {
      results.push({
        type: idMatch[1],
        id: idMatch[2],
        field: idMatch[3],
        raw: match
      });
    }
  }
  
  return results;
}

/**
 * 辅助函数：转义正则表达式特殊字符
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
