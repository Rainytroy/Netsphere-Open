# 变量标识符解析问题修复报告 v2

## 问题描述

之前发现当使用解析按钮预览时，变量解析存在问题。特别是当文本中同时包含两个相似的变量标识符时（例如一个是另一个的前缀），会出现解析错误。具体表现为：

当文本中同时存在以下两个变量标识符时：
- `@gv_4016eae6-d884-4fdf-8934-d0823da680c2_actlv` 
- `@gv_4016eae6-d884-4fdf-8934-d0823da680c2_act`

显示层面的标签显示正确了，但解析预览时会出现错误，系统会错误地将前者识别为后者，导致剩余的"lv"文本残留在解析结果中。

## 根本原因分析

深入分析后发现问题存在于两个地方：

1. **HTML解析中的正则表达式**（已在v1版本修复）
   - 原有正则表达式：`/@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g`
   - 修复后：`/@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+\b/g`

2. **纯文本解析方法**（此次v2版本修复）
   - `rawTextToResolvedText`函数在转换过程中依赖于HTML中转
   - HTML中转可能导致标识符匹配不精确，造成相似标识符混淆
   - 需要改进方法直接使用文本处理，避免中间转换

## 修复方案

1. 彻底重写`rawTextToResolvedText`函数，使用直接的文本处理方式：
   ```typescript
   export function rawTextToResolvedText(text: string, localVariables: VariableData[] = []): string {
     if (!text) return '';
     
     // 匹配系统标识符，使用词边界确保匹配完整标识符
     const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+\b/g;
     
     // 创建结果文本（初始为原文本）
     let result = text;
     
     // 获取所有匹配项并去重
     const matches = Array.from(new Set(text.match(regex) || []));
     
     // 替换每个变量标识符为实际值
     for (const match of matches) {
       // 解析系统标识符，精确匹配UUID和字段
       const idFieldMatch = match.match(/@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)$/);
       if (!idFieldMatch) continue;
       
       const id = idFieldMatch[1];
       const field = idFieldMatch[2];
       
       // 在变量列表中查找
       const variable = localVariables.find(v => v.id === id && v.field === field);
       
       // 获取变量值或使用空字符串
       const value = variable?.value || '';
       
       // 替换文本中的所有标识符
       result = result.replace(new RegExp(escapeRegExp(match), 'g'), value);
     }
     
     return result;
   }
   ```

2. 主要改进点：
   - 使用词边界`\b`确保只匹配完整的标识符
   - 直接在文本中处理替换，不经过HTML中转
   - 使用精确匹配模式`$`确保标识符末尾匹配
   - 保持一致的正则表达式风格

## 修复效果

修复后，当文本中同时包含`@gv_UUID_act`和`@gv_UUID_actlv`这样的变量标识符时，系统能够正确区分它们，将每个标识符替换为对应的值，不再出现"lv"文本残留的问题。

## 测试方法

可以通过以下步骤测试：
1. 在编辑器中输入包含多个类似标识符的内容，如：`@云透.actlv#4016 @云透.act#4016`
2. 点击"解析"按钮查看预览结果
3. 确认两个变量都被正确解析，没有文本残留

## 修复时间

修复日期：2025年3月30日
