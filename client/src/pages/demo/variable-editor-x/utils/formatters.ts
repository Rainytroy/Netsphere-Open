import { VariableData } from '../types';
import VariableThemeService from '../../../../services/VariableThemeService';

/**
 * 格式转换工具 - 简化版
 * 提供在HTML格式、系统标识符格式和解析格式之间转换的工具函数
 * 全部使用DOM操作，不依赖API调用
 */

/**
 * HTML格式转换为系统标识符格式(rawtext)
 * 将HTML中的变量标签替换为系统标识符
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
    // 提取系统标识符 - 优先使用已存在的，或者生成新的
    const identifier = tag.getAttribute('data-identifier') || 
                      `@gv_${tag.getAttribute('data-id') || 'unknown'}_${tag.getAttribute('data-field') || 'unknown'}`;

    // 创建文本节点替换变量标签
    const textNode = document.createTextNode(identifier);
    tag.parentNode?.replaceChild(textNode, tag);
  });
  
  // 获取纯文本内容
  let result = tempDiv.textContent || '';
  
  // 在返回结果前规范化换行符，确保最多只有一个尾部换行符
  result = result.replace(/\n+$/, '\n');
  
  return result;
}

/**
 * 系统标识符格式(rawtext)转换为HTML格式
 * 将文本中的系统标识符替换为变量标签
 * 不依赖API，使用本地变量列表
 */
export function rawTextToHtml(text: string, localVariables: VariableData[] = []): string {
  if (!text) return '';
  
  // 处理文本前移除尾部多余换行符，只保留一个
  text = text.replace(/\n+$/, '\n');
  
  // 匹配系统标识符 @gv_UUID_field
  const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g;
  
  // 将纯文本包装在段落标签中
  let result = text.split('\n')
    .map(line => line.trim() ? `<p>${line}</p>` : '<p><br></p>')
    .join('');
  
  // 获取所有匹配项
  const matches = text.match(regex) || [];
  
  // 去重
  const uniqueMatches = Array.from(new Set(matches));
  
  for (const match of uniqueMatches) {
    try {
      // 解析系统标识符
      const idFieldMatch = match.match(/@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)/);
      if (!idFieldMatch) continue;
      
      const id = idFieldMatch[1];
      const field = idFieldMatch[2];
      
      // 在本地变量列表中查找匹配项
      const variable = localVariables.find(v => v.id === id && v.field === field);
      
      // 获取变量信息 - 如果在本地列表中找不到，使用简单默认值
      const sourceType = variable?.sourceType || 'unknown';
      const sourceName = variable?.sourceName || 'Unknown';
      const displayId = variable?.displayIdentifier || `@${sourceName}.${field}#${id.substring(0, 4)}`;
      const value = variable?.value || '';
      
      // 获取主题颜色
      const colors = VariableThemeService.getTypeColor(sourceType);
      
      // 构建变量标签HTML
      const tagHtml = `<span 
        data-variable="" 
        data-id="${id}" 
        data-field="${field}" 
        data-source-name="${sourceName}" 
        data-identifier="${match}" 
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
      console.error(`处理变量标识符 ${match} 时出错:`, error);
    }
  }
  
  return result;
}

/**
 * 系统标识符格式(rawtext)转换为纯文本解析格式
 * 将文本中的系统标识符替换为实际变量值，移除HTML标签
 * 完全基于HTML DOM操作，不依赖API
 */
export function rawTextToResolvedText(text: string, localVariables: VariableData[] = []): string {
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
    // 直接从标签获取值
    const value = tag.getAttribute('data-value') || '';
    
    // 创建文本节点替换变量标签
    const textNode = document.createTextNode(value);
    tag.parentNode?.replaceChild(textNode, tag);
  }
  
  // 返回纯文本内容，移除所有HTML标签
  return tempDiv.textContent || '';
}

/**
 * 系统标识符格式(rawtext)转换为富文本HTML解析格式
 * 将文本中的系统标识符替换为实际变量值，保留HTML格式
 * 完全基于HTML DOM操作，不依赖API
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
 * HTML格式转换为JSON格式
 * 使用编辑器的getJSON方法获取编辑器内容的JSON表示
 */
export function htmlToJson(html: string, editor: any): string {
  if (!editor) return JSON.stringify({}, null, 2);
  
  try {
    // 使用编辑器的getJSON方法
    return JSON.stringify(editor.getJSON(), null, 2);
  } catch (error) {
    console.error('转换HTML为JSON时出错:', error);
    return JSON.stringify({ error: '转换失败' }, null, 2);
  }
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
