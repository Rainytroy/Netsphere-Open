# 工作流起点卡存储格式调整

## 问题描述

在分析工作流起点卡编辑器和工作任务编辑器的代码时，发现两者在保存变量标识符内容时使用了不同的格式:

1. 工作流起点卡（StartNodeConfig）：使用HTML格式存储，包含完整DOM结构
2. 工作任务表单：使用rawText格式存储，仅包含变量标识符

这种不一致性可能导致以下问题：
- 代码维护困难，需要记住不同位置使用不同的格式
- 潜在的兼容性问题，特别是当需要将工作流描述在不同组件间传递时
- 解析逻辑复杂化，需要处理不同的格式

## 解决方案

为保持一致性，我们将工作流起点卡的存储格式修改为与工作任务表单相同的rawText格式:

```diff
- // 构建最终配置 - 使用HTML内容保存到promptText，保留变量标签的完整格式
- const config = {
-   ...initialConfig,
-   promptText: richContent.html // 保存HTML内容包含完整的变量标签结构
- };

+ // 构建最终配置 - 使用rawText内容保存到promptText，与工作任务表单保持一致
+ const config = {
+   ...initialConfig,
+   promptText: richContent.rawText // 保存rawText内容，包含变量标识符
+ };
```

## 结构保留

即使使用rawText格式存储，工作流的两个description目标仍然保持原样：

1. 工作流变量description - 使用解析后的parsedContent（变量标识符已替换为实际值）
2. 工作流对象中的description属性 - 同样使用parsedContent

这样，工作流卡片和使用界面仍然显示解析后的内容。

## 格式说明

| 存储位置 | 存储格式 | 内容说明 |
|----------|----------|----------|
| NodeConfig.promptText | rawText | 包含变量标识符如`@变量名称` |
| 工作流变量description | parsedContent | 变量标识符已替换为实际值 |
| 工作流对象description | parsedContent | 变量标识符已替换为实际值 |

## 优势

1. **代码一致性** - 所有编辑器组件现在使用相同的存储格式
2. **维护简化** - 开发人员只需要记住一种格式
3. **调试友好** - 减少了格式转换的复杂性

## 后续影响

已经保存的工作流可能使用旧的HTML格式，但VEX编辑器会在加载内容时尝试转换格式，所以对最终用户应该没有明显影响。
