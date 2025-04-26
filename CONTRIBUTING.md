# 贡献指南

感谢您考虑为Netsphere项目做出贡献！这份文档提供了参与项目开发的指南和流程。

## 参与方式

您可以通过多种方式为Netsphere项目做出贡献：

1. **报告问题**：提交Bug报告或功能请求
2. **提供修复**：修复已知问题或实现新功能
3. **改进文档**：完善或更新文档
4. **优化代码**：提高代码质量和性能
5. **添加测试**：增加测试覆盖率

## 开发流程

### 1. 准备工作

1. Fork本仓库到您的GitHub账户
2. 克隆仓库到本地：`git clone https://github.com/[your-username]/netsphere.git`
3. 设置上游远程库：`git remote add upstream https://github.com/[original-owner]/netsphere.git`
4. 创建新分支：`git checkout -b feature/your-feature-name`

### 2. 开发与测试

1. 在本地进行开发
2. 遵循现有的代码风格和命名约定
3. 添加适当的注释和文档
4. 确保通过所有测试
5. 添加新的测试来验证您的更改

### 3. 提交与推送

1. 将更改提交到您的分支：`git commit -m "Add some feature"`
2. 推送到您的远程库：`git push origin feature/your-feature-name`
3. 从GitHub界面创建Pull Request到主仓库的`main`分支

### 4. 代码审查

1. 维护者将审查您的Pull Request
2. 根据反馈进行必要的修改
3. 一旦审查通过，您的贡献将被合并

## 代码风格指南

### TypeScript/JavaScript

- 使用TypeScript类型注解
- 遵循ESLint规则
- 使用2空格缩进
- 使用有意义的变量和函数名
- 添加适当的注释，特别是对于复杂的逻辑

### React组件

- 使用函数组件和Hooks
- 为props添加适当的类型定义
- 避免过长的组件，适当拆分为子组件
- 尽量使用受控组件

## 提交信息规范

提交信息应当遵循以下格式：

```
<类型>: <简短描述>

<详细描述>
```

类型包括：
- feat: 新功能
- fix: Bug修复
- docs: 文档更新
- style: 代码风格调整（不影响代码逻辑）
- refactor: 代码重构
- perf: 性能优化
- test: 添加测试
- chore: 构建过程或工具变动

例如：
```
feat: 添加循环节点变量条件支持

实现了循环节点的变量值条件判断功能，包括：
- 变量选择器UI
- 条件判断逻辑
- 测试用例
```

## 许可证

通过提交代码，您同意您的贡献将根据项目的[GNU通用公共许可证(GPL-3.0)](LICENSE)进行许可。这意味着您的代码贡献必须以相同的开源条款提供给社区。
