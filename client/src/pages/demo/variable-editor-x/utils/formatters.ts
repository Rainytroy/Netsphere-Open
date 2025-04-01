import { VariableData } from '../types';
import VariableThemeService from '../../../../services/VariableThemeService';

/**
 * 变量格式转换工具 - v3.0版本
 * 专为v3.0变量系统设计，仅支持v3.0标识符格式
 * 提供在HTML格式、系统标识符格式和解析格式之间的转换
 */

// v3.0标识符格式正则表达式 - 优化以准确匹配UUID格式
const V3_IDENTIFIER_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=/g;
const V3_IDENTIFIER_EXACT_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=$/;

// 调试用 - 检查匹配结果
function debugMatch(text: string): void {
  console.log('[v3.0 Debug] 尝试匹配:', text);
  const matches = text.match(V3_IDENTIFIER_REGEX);
  console.log('[v3.0 Debug] 匹配结果:', matches);
  
  if (matches && matches.length > 0) {
    matches.forEach(match => {
      const parts = match.match(V3_IDENTIFIER_EXACT_REGEX);
      console.log('[v3.0 Debug] 解析结果:', parts);
    });
  }
}

/**
 * HTML格式转换为系统标识符格式(rawtext)
 * 将HTML中的变量标签替换为v3.0格式系统标识符
 */
export function htmlToRawText(html: string): string {
  if (!html) return '';
  
  // 创建临时DOM元素
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 查找所有变量标签
  const variableTags = tempDiv.querySelectorAll('span[data-variable]');
  
  // 替换为系统标识符
  variableTags.forEach(tag => {
    // 获取存储在标签上的完整标识符
    const identifierAttr = tag.getAttribute('data-identifier');
    
    if (identifierAttr && V3_IDENTIFIER_EXACT_REGEX.test(identifierAttr)) {
      // 如果已有有效的v3.0标识符，直接使用它
      const textNode = document.createTextNode(identifierAttr);
      tag.parentNode?.replaceChild(textNode, tag);
    } else {
      // 否则从各部分重新构建
      const type = tag.getAttribute('data-type') || 'custom';
      const id = tag.getAttribute('data-id') || 'unknown';
      const field = tag.getAttribute('data-field') || 'unknown';
      
      // 构建v3.0格式的标识符
      const identifier = `@gv_${type}_${id}_${field}-=`;
      const textNode = document.createTextNode(identifier);
      tag.parentNode?.replaceChild(textNode, tag);
    }
  });
  
  // 获取纯文本内容
  let result = tempDiv.textContent || '';
  
  // 规范化换行符
  result = result.replace(/\n+$/, '\n');
  
  return result;
}

/**
 * 系统标识符格式(rawtext)转换为HTML格式
 * 将文本中的v3.0格式系统标识符替换为变量标签
 */
export function rawTextToHtml(text: string, localVariables: VariableData[] = []): string {
  if (!text) return '';
  
  // 规范化文本
  text = text.replace(/\n+$/, '\n');
  
  // 将纯文本包装在段落标签中
  let result = text.split('\n')
    .map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>')
    .join('');
  
  // 获取所有v3.0格式标识符并去重
  const matches = Array.from(new Set(text.match(V3_IDENTIFIER_REGEX) || []));
  
  // 处理每个标识符
  for (const match of matches) {
    try {
      // 解析v3.0系统标识符
      const idMatch = match.match(V3_IDENTIFIER_EXACT_REGEX);
      if (!idMatch) continue;
      
      const [_, type, id, field] = idMatch;
      
      // 在本地变量列表中查找匹配项
      const variable = localVariables.find(v => 
        v.type === type && v.id === id && v.field === field
      );
      
      // 获取变量信息
      const sourceType = variable?.sourceType || type;
      const sourceName = variable?.sourceName || 'Unknown';
      const displayId = variable?.displayIdentifier || `@${sourceName}.${field}#${id.substring(0, 4)}`;
      const value = variable?.value || '';
      
      // 获取主题颜色
      const colors = VariableThemeService.getTypeColor(sourceType);
      
      // 构建符合v3.0标准的ID
      const v3Id = `${sourceType}_${id}_${field}`;
      
      // 确保完整标识符格式正确
      // 格式: @gv_{type}_{entityId}_{fieldname}-=
      const fullIdentifier = `@gv_${sourceType}_${id}_${field}-=`;
      
      // 构建变量标签HTML - 使用符合v3.0标准的ID和标识符
      const tagHtml = `<span 
        data-variable="" 
        data-id="${v3Id}" 
        data-field="${field}" 
        data-source-name="${sourceName}" 
        data-identifier="${fullIdentifier}" 
        data-display-identifier="${displayId}"
        data-type="${sourceType}"
        data-value="${escapeHtml(value)}"
        class="variable-tag variable-type-${sourceType}" 
        contenteditable="false"
        style="
          background-color: ${colors.bgColor};
          border: 1px solid ${colors.borderColor};
          border-radius: 4px;
          padding: 2px 8px;
          color: ${colors.textColor};
          cursor: default;
          position: relative;
          display: inline-flex;
          align-items: center;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.5;
          white-space: nowrap;
          margin: 0 4px 0 0;
          transition: all 0.3s;
        "
      >${displayId}</span>`;
      
      // 替换所有出现的标识符
      result = result.replace(new RegExp(escapeRegExp(match), 'g'), tagHtml);
    } catch (error) {
      console.error(`[v3.0] 处理变量标识符 ${match} 时出错:`, error);
    }
  }
  
  return result;
}

/**
 * 系统标识符格式(rawtext)转换为纯文本解析格式
 * 将文本中的v3.0格式系统标识符替换为实际变量值
 */
export function rawTextToResolvedText(text: string, localVariables: VariableData[] = []): string {
  const timestamp = new Date().toISOString().substring(11, 19);
  if (!text) return '';
  
  // 详细日志：记录输入文本和变量列表
  console.log(`[v3.0 解析 ${timestamp}] 输入:`, {
    textLength: text.length,
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    variablesCount: localVariables.length
  });
  
  // 记录变量列表前5个
  if (localVariables.length > 0) {
    console.log(`[v3.0 解析 ${timestamp}] 可用变量 (前5个):`, 
      localVariables.slice(0, 5).map(v => ({
        type: v.type,
        id: v.id.substring(0, 8) + '...',
        field: v.field,
        value: v.value ? (v.value.substring(0, 30) + (v.value.length > 30 ? '...' : '')) : '(空值)',
        identifier: v.identifier
      }))
    );
  } else {
    console.warn(`[v3.0 解析 ${timestamp}] 警告: 变量列表为空`);
    return text; // 没有变量数据，直接返回原文本
  }
  
  // 创建结果文本
  let result = text;
  
  // 获取所有v3.0格式标识符并去重
  const matches = Array.from(new Set(text.match(V3_IDENTIFIER_REGEX) || []));
  
  console.log(`[v3.0 解析 ${timestamp}] 找到的标识符:`, matches);
  
  if (matches.length === 0) {
    console.warn(`[v3.0 解析 ${timestamp}] 警告: 未找到有效的v3.0标识符`);
    return text;
  }
  
  // 记录原始标识符和变量ID的对照
  console.log(`[v3.0 解析 ${timestamp}] 变量标识符解析:`);
  for (const match of matches) {
    const idMatch = match.match(V3_IDENTIFIER_EXACT_REGEX);
    if (idMatch) {
      console.log(`  标识符: ${match}`);
      console.log(`    - 类型: ${idMatch[1]}`);
      console.log(`    - ID: ${idMatch[2]}`);
      console.log(`    - 字段: ${idMatch[3]}`);
    }
  }
  
  // 记录所有变量ID，帮助调试
  console.log(`[v3.0 解析 ${timestamp}] 所有可用变量ID:`);
  localVariables.forEach(v => {
    console.log(`  - ${v.id} (${v.type})`);
  });
  
  // 替换每个变量标识符为实际值
  for (const match of matches) {
    // 解析v3.0系统标识符
    const idMatch = match.match(V3_IDENTIFIER_EXACT_REGEX);
    if (!idMatch) {
      console.warn(`[v3.0 解析 ${timestamp}] 警告: 标识符格式不匹配:`, match);
      continue;
    }
    
    const [_, type, id, field] = idMatch;
    console.log(`[v3.0 解析 ${timestamp}] 解析标识符: type=${type}, id=${id}, field=${field}`);
    
    // 尝试宽松匹配: 1) 完全匹配 2) 忽略大小写 3) 部分属性匹配
    let variable = localVariables.find(v => 
      (v.type === type && v.id === id && v.field === field)
    );
    
    if (!variable) {
      // 尝试更宽松的匹配
      variable = localVariables.find(v => 
        (v.type.toLowerCase() === type.toLowerCase() && 
         v.id === id && 
         v.field.toLowerCase() === field.toLowerCase())
      );
      
      if (variable) {
        console.log(`[v3.0 解析 ${timestamp}] 使用宽松匹配找到变量`);
      }
    }
    
    if (!variable) {
      // 尝试仅通过ID匹配
      variable = localVariables.find(v => v.id === id);
      if (variable) {
        console.log(`[v3.0 解析 ${timestamp}] 警告: 仅通过ID匹配到变量: type=${variable.type}, field=${variable.field}`);
      }
    }
    
    if (variable) {
      console.log(`[v3.0 解析 ${timestamp}] 找到匹配变量:`, {
        id: variable.id.substring(0, 8) + '...',
        type: variable.type,
        field: variable.field,
        value: variable.value ? (variable.value.substring(0, 30) + (variable.value.length > 30 ? '...' : '')) : '(空值)'
      });
      
      // 获取变量值，如果不存在则使用空字符串
      const value = variable.value || '';
      
      // 替换文本中的所有标识符
      result = result.replace(new RegExp(escapeRegExp(match), 'g'), value);
      console.log(`[v3.0 解析 ${timestamp}] 替换 "${match}" => "${value}"`);
    } else {
      console.error(`[v3.0 解析 ${timestamp}] 错误: 找不到匹配的变量`, {type, id, field});
      // 保持原样，不替换
    }
  }
  
  console.log(`[v3.0 解析 ${timestamp}] 最终结果:`, {
    resultLength: result.length,
    result: result.substring(0, 100) + (result.length > 100 ? '...' : '')
  });
  
  return result;
}

/**
 * 系统标识符格式(rawtext)转换为富文本HTML解析格式
 * 将文本中的v3.0格式系统标识符替换为实际变量值，保留HTML格式
 */
export function rawTextToResolvedHtml(text: string, localVariables: VariableData[] = []): string {
  if (!text) return '';
  
  // 先转换为HTML，保留变量标签
  const html = rawTextToHtml(text, localVariables);
  
  // 创建临时DOM元素
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 查找所有变量标签
  const variableTags = tempDiv.querySelectorAll('span[data-variable]');
  
  // 替换变量标签为变量值
  for (const tag of Array.from(variableTags)) {
    // 从标签获取值
    const value = tag.getAttribute('data-value') || '';
    
    // 检查值是否包含HTML
    if (/<[a-z][\s\S]*>/i.test(value)) {
      // 如果包含HTML，将其作为HTML插入
      const tempWrapper = document.createElement('div');
      tempWrapper.innerHTML = value;
      
      // 将所有子节点复制到父节点
      while (tempWrapper.firstChild) {
        tag.parentNode?.insertBefore(tempWrapper.firstChild, tag);
      }
      
      // 移除原变量标签
      tag.parentNode?.removeChild(tag);
    } else {
      // 纯文本直接替换
      const textNode = document.createTextNode(value);
      tag.parentNode?.replaceChild(textNode, tag);
    }
  }
  
  // 返回HTML内容
  return tempDiv.innerHTML;
}

/**
 * 提取文本中的v3.0变量标识符
 * 返回解析后的标识符数组
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

/**
 * 辅助函数：转义HTML特殊字符
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
