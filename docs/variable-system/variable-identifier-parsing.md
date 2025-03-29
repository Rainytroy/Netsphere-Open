# 变量标识符解析规范

**版本号**: v1.1.0  
**创建时间**: 2025年3月23日  
**最后更新**: 2025年3月23日 13:35  
**文档状态**: 已定稿  
**关键词**: 变量标识符, 解析, 系统标识符, 显示标识符

## 概述

本文档定义了Netsphere平台中变量标识符的解析规范，确保系统各个组件在处理变量标识符时保持一致的行为，以提高系统的可靠性和用户体验。

## 标识符格式定义

Netsphere平台中的变量标识符有两种格式：

### 1. 系统标识符（内部使用）

```
@gv_{UUID}_{field}
```

- `@` - 统一前缀，标记这是一个变量引用
- `gv_` - 全局变量前缀（global variable）
- `{UUID}` - 变量的唯一标识符，通常是源对象的ID
- `_{field}` - 下划线加字段名，指定变量的具体字段

**例如**：`@gv_f9c17d21-a0a0-476f-973e-433e08f7be38_name`

### 2. 显示标识符（UI展示）

```
@{sourceName}.{field}#{shortId}
```

- `@` - 统一前缀
- `{sourceName}` - 变量来源对象的名称
- `.` - 固定分隔符
- `{field}` - 字段名称
- `#` - ID分隔符
- `{shortId}` - ID的短版本（通常是UUID的前4位）

**例如**：`@云透.name#f9c1`

## 标识符解析算法

### 字段名称规范

**NPC类型变量字段**：
- `name` - 名称
- `description` - 描述
- `knowledge` - 知识背景
- `act` - 行动原则
- `actlv` - 活跃度

**已废弃的NPC变量字段**（不再使用）：
- `kb` - 知识背景（简化自knowledge_background）
- `ap` - 行动原则（简化自action_principles）
- `al` - 活跃度（简化自activity_level）

**工作任务类型字段**：
- `input` - 输入
- `output` - 输出
- `status` - 状态

**工作流类型字段**：
- `name` - 名称
- `description` - 描述
- `status` - 状态
- 对节点的引用使用 `node_{nodeId}_{field}` 格式

**自定义变量字段**：
- `value` - 值

### 正则表达式模式

1. **系统标识符模式**：
   ```regex
   /@gv_([a-zA-Z0-9\-]+)_([a-zA-Z0-9_]+)/g
   ```
   
2. **显示标识符模式**：
   ```regex
   /@([^.]+)\.([^#]+)#([a-zA-Z0-9]+)/g
   ```
   
3. **旧格式标识符模式**（向后兼容）：
   ```regex
   /@([^.]+)\.([a-zA-Z0-9_]+)/g
   ```

### 解析步骤

1. **解析系统标识符**：
   - 匹配 `@gv_{UUID}_{field}` 格式
   - 提取UUID和字段名
   - 根据UUID查找变量

2. **解析显示标识符**：
   - 匹配 `@{sourceName}.{field}#{shortId}` 格式
   - 提取源名称、字段名和短ID
   - 先尝试根据短ID精确查找
   - 如果找不到，尝试根据源名称和字段名查找

3. **解析旧格式标识符**（向后兼容）：
   - 匹配 `@{sourceName}.{field}` 格式
   - 提取源名称和字段名
   - 根据源名称和字段名查找变量

### 解析优先级

1. 系统标识符（最高优先级）
2. 显示标识符（次高优先级）
3. 旧格式标识符（最低优先级，向后兼容）

## 错误处理策略

### 未找到变量

解析器应该提供可配置的错误处理策略：

1. **保留原始文本**：保留原始标识符文本，不做替换
2. **显示错误提示**：将标识符替换为错误提示，例如：`[未找到变量: {identifier}]`
3. **使用默认值**：使用预定义的默认值替换找不到的变量

### 格式不匹配

对于不符合任何标识符格式的文本，解析器应该忽略处理，保留原始文本。

## 标识符映射与缓存

为了提高性能和减少重复请求，解析器应该实现标识符映射和缓存机制：

1. **标识符映射**：维护系统标识符与显示标识符之间的对应关系
2. **变量值缓存**：缓存已解析的变量值，避免重复查询
3. **缓存过期策略**：定义缓存的过期策略，确保数据的及时更新

## 特殊情况处理

### 字符转义

对于文本中的特殊字符，如需转义处理：

1. **@符号转义**：如果文本中需要保留@符号而不被解析为变量，可以使用`\@`
2. **其他特殊字符**：根据具体情况处理其他特殊字符

### 嵌套变量

系统目前不支持嵌套变量（变量值中包含其他变量引用）。如果遇到嵌套变量，只会解析一层。

## 实现指南

### 客户端实现

对于客户端变量解析器（前端）：

1. 使用正则表达式识别文本中的变量标识符
2. 向服务器请求变量数据或从本地缓存中获取
3. 替换文本中的变量标识符为实际值
4. 处理错误情况和特殊字符

### 服务器端实现

对于服务器端变量解析器：

1. 在API响应处理中集成变量解析逻辑
2. 维护变量数据的缓存和更新机制
3. 提供标准化的变量查询接口
4. 处理错误和异常情况

## 代码示例

### TypeScript解析示例

```typescript
/**
 * 解析文本中的变量标识符
 * @param text 含有变量标识符的文本
 * @returns 解析后的文本
 */
async function parseVariables(text: string): Promise<string> {
  // 缓存变量值，避免重复请求
  const cache: Record<string, string> = {};
  
  // 处理系统标识符
  let result = await parseSystemIdentifiers(text, cache);
  
  // 处理显示标识符
  result = await parseDisplayIdentifiers(result, cache);
  
  // 处理旧格式标识符（向后兼容）
  result = await parseLegacyIdentifiers(result, cache);
  
  return result;
}

/**
 * 解析系统标识符
 * @param text 文本
 * @param cache 变量缓存
 */
async function parseSystemIdentifiers(text: string, cache: Record<string, string>): Promise<string> {
  const systemIdPattern = /@gv_([a-zA-Z0-9\-]+)_([a-zA-Z0-9_]+)/g;
  
  return text.replace(systemIdPattern, async (match, uuid, field) => {
    // 检查缓存
    if (cache[match]) {
      return cache[match];
    }
    
    // 查询变量
    try {
      const variable = await variableService.getVariableByIdentifier(match);
      if (variable) {
        cache[match] = variable.value || '';
        return variable.value || '';
      }
    } catch (error) {
      console.error(`解析变量失败: ${match}`, error);
    }
    
    // 未找到变量，返回原始文本
    return match;
  });
}

// 其他解析函数类似...
```

## 兼容性考虑

### 旧系统迁移

对于从旧系统迁移的数据和代码：

1. 保留对旧格式标识符的支持，确保向后兼容
2. 提供自动升级工具，将旧格式标识符转换为新格式
3. 在日志中记录旧格式标识符的使用，以便后续优化

### 用户体验一致性

为了保持用户体验的一致性：

1. 在UI中统一使用显示标识符，便于用户理解和使用
2. 在API和内部处理中使用系统标识符，确保稳定性
3. 确保变量选择器和编辑器组件使用统一的标识符格式

## 相关文档

- [全局变量系统概述](./variable-system-overview.md)
- [系统架构设计](./variable-system-architecture.md)
- [全局变量标签组件](../components/README.md)
- [变量编辑器设计](../variable-editor-X/variable-editor-X-architecture.md)
