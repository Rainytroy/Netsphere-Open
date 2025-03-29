/**
 * 修改WorkTaskService服务以确保只使用规范的变量名
 * 
 * 此脚本用于确保在工作任务相关的变量生成中，仅使用标准的英文字段名 (input/output)
 * 而不会生成中文字段名 (输入/输出)
 */

import * as fs from 'fs';
import * as path from 'path';

// 要修改的文件路径
const targetFilePath = path.resolve(__dirname, '../services/WorkTaskService.ts');

// 备份原文件
const backupFilePath = path.resolve(__dirname, '../services/WorkTaskService.backup.ts');
fs.copyFileSync(targetFilePath, backupFilePath);
console.log(`已创建备份: ${backupFilePath}`);

// 读取文件内容
const fileContent = fs.readFileSync(targetFilePath, 'utf8');

// 查找并修改可能导致生成中文变量标识符的代码
// 我们要确保所有变量标识符使用英文字段名
const modifiedContent = fileContent
  // 确保变量名称在所有地方都是一致的
  .replace(/name: `\${task\.name}\.输入`/g, 'name: `${task.name}.input`')
  .replace(/name: `\${task\.name}\.输出`/g, 'name: `${task.name}.output`')
  .replace(/identifier: `@\${task\.name}\.输入`/g, 'identifier: `@${task.name}.input`')
  .replace(/identifier: `@\${task\.name}\.输出`/g, 'identifier: `@${task.name}.output`');

// 写入修改后的内容
fs.writeFileSync(targetFilePath, modifiedContent);
console.log('已修改WorkTaskService以防止生成中文变量标识符');

// 添加文档注释说明标准变量标识符规范
const standardDocComment = `
  /**
   * 工作任务变量标识符规范：
   * 
   * 根据全局变量标识符规范，工作任务变量应遵循以下标准：
   * 1. 仅使用英文字段名: input/output (不使用中文字段名)
   * 2. 标识符格式: @任务名称.字段名 (如 @需求分析.input)
   * 3. 变量名格式: 任务名称.字段名 (如 需求分析.input)
   */
`;

// 在registerTaskVariables方法之前添加变量标识符规范文档
const updatedContent = modifiedContent.replace(
  /\/\*\*\n   \* 注册工作任务相关的全局变量/,
  standardDocComment + '\n  /**\n   * 注册工作任务相关的全局变量'
);

// 写入更新后的内容
fs.writeFileSync(targetFilePath, updatedContent);
console.log('已添加变量标识符规范说明');

console.log('修改完成, 请重新构建并重启应用');
