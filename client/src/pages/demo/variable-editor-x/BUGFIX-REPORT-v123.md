# 错误修复报告 v1.2.3

**修复时间**: 2025-03-31  
**修复类型**: 功能优化  
**优先级**: 高

## 问题描述

在处理包含多个变量标识符的文本时，当出现一个标识符是另一个的前缀（如`act`和`actlv`）时，变量解析会产生错误的结果。这是因为现有的标识符替换逻辑依赖于替换顺序，导致解析结果不稳定。

### 具体场景

当文本包含以下两个标识符时：
```
@gv_4016eae6-d884-4fdf-8934-d0823da680c2_act
@gv_4016eae6-d884-4fdf-8934-d0823da680c2_actlv
```

如果先解析`_act`，后面的`lv`会被错误地当作普通文本，而不是`_actlv`的一部分，导致解析错误：
```
好奇心是驱使我前进的动力，我关注一切美好的、有趣的事物，并且想要创造新东西，不在乎世俗的意义，只想要做成一些事情——是被心血和巧思构成的、完美主义的成果。lv
```

而不是正确的结果：
```
好奇心是驱使我前进的动力，我关注一切美好的、有趣的事物，并且想要创造新东西，不在乎世俗的意义，只想要做成一些事情——是被心血和巧思构成的、完美主义的成果。有趣的事情就可以驱动我
```

## 根本原因分析

问题出在`formatters.ts`中的`rawTextToResolvedText`函数，主要有以下几点设计缺陷：

1. **替换顺序依赖**：使用`String.replace`方法逐个替换标识符，前一个替换会影响后续替换
2. **边界判断不够精确**：虽然使用了词边界`\b`，但无法正确处理前缀重叠的情况
3. **位置偏移问题**：替换过程中字符串长度会发生变化，导致位置计算错误

## 解决方案

实现了全新的"全文标记-位置记录替换法"，主要特点：

1. **精确定位**：使用正则表达式的`exec`方法获取每个匹配项的精确位置
2. **从后向前替换**：按位置降序排序，从文本末尾向前进行替换，避免位置偏移
3. **更精确的边界判断**：使用`(?=\s|$|[^\w])`前瞻断言，确保只匹配完整的标识符

### 具体修改

1. 在`formatters.ts`中添加新函数`enhancedRawTextToResolvedText`
2. 更新原有`rawTextToResolvedText`函数，添加参数开关支持选择解析方法
3. 修改`useVariableParser`钩子，传递解析方法选择参数

### 核心算法

```typescript
// 从后向前替换
replacements.sort((a, b) => b.start - a.start);

// 执行替换
let result = text;
for (const { start, end, value } of replacements) {
  result = result.substring(0, start) + value + result.substring(end);
}
```

## 测试结果

对两种情况进行了测试：

1. **前缀重叠**：`@gv_xxx_act` 和 `@gv_xxx_actlv`连续出现
2. **不同顺序**：调换前缀重叠标识符的出现顺序

使用增强解析方法后，无论标识符顺序如何，解析结果始终正确且一致。

## 文档参考

详细的设计文档请参考 [变量标识符解析增强方案](../../docs/variable-system/variable-identifier-resolution-enhancement.md)。

## 向后兼容性

为保证向后兼容，保留了原有解析方法，可通过参数选择使用哪种解析方法：

```typescript
rawTextToResolvedText(text, variables, useEnhancedMethod = true)
```

默认使用增强方法。
