#!/usr/bin/env node
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 数据库修复命令行工具
 * 提供一个简单的命令行界面来执行数据库修复和重建
 */

// 获取命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'help';

// 命令选项
const COMMANDS = {
  HELP: 'help',
  FIX: 'fix',
  REBUILD: 'rebuild',
};

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
  数据库修复工具

  用法:
    npx ts-node src/database/run-fix.ts [命令]

  命令:
    help                显示帮助信息
    fix                 尝试修复数据库问题
    rebuild             重建数据库（会备份并删除现有数据库）
  `);
}

/**
 * 执行数据库修复
 */
function runFix() {
  console.log('开始执行数据库修复...');
  try {
    const fixPath = path.join(__dirname, 'migration-fix.ts');
    execSync(`npx ts-node "${fixPath}"`, { stdio: 'inherit' });
    console.log('数据库修复完成');
  } catch (error) {
    console.error('数据库修复失败', error);
    process.exit(1);
  }
}

/**
 * 执行数据库重建
 */
function runRebuild() {
  console.log('开始执行数据库重建...');
  
  // 警告提示
  console.log('\x1b[31m%s\x1b[0m', '警告: 此操作将删除并重建数据库，所有数据将丢失（但会有备份）');
  console.log('按Ctrl+C取消，或等待5秒继续...');
  
  // 等待5秒
  setTimeout(() => {
    try {
      const rebuildPath = path.join(__dirname, 'rebuild-database.ts');
      execSync(`npx ts-node "${rebuildPath}"`, { stdio: 'inherit' });
      console.log('数据库重建完成');
    } catch (error) {
      console.error('数据库重建失败', error);
      process.exit(1);
    }
  }, 5000);
}

// 执行命令
switch (command) {
  case COMMANDS.HELP:
    showHelp();
    break;
  case COMMANDS.FIX:
    runFix();
    break;
  case COMMANDS.REBUILD:
    runRebuild();
    break;
  default:
    console.error(`未知命令: ${command}`);
    showHelp();
    process.exit(1);
}
