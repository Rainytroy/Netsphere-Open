/**
 * 变量标识符迁移脚本
 * 将现有变量的标识符从旧格式（@source.field#id）迁移到新格式（@gv_UUID）
 */
import { AppDataSource } from '../database';
import { Variable } from '../models/Variable';
import { IdentifierFormatterService } from '../services/IdentifierFormatterService';

async function migrateVariablesToUuidFormat() {
  try {
    console.log('开始初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('数据库连接初始化成功');

    const variableRepo = AppDataSource.getRepository(Variable);
    const identifierFormatter = IdentifierFormatterService.getInstance();

    // 获取所有变量
    console.log('正在获取所有变量...');
    const variables = await variableRepo.find();
    console.log(`共找到 ${variables.length} 个变量`);

    // 计数器
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // 逐个处理变量
    for (const variable of variables) {
      try {
        // 检查变量是否已经是新格式
        if (variable.identifier.startsWith('@gv_')) {
          console.log(`变量 ${variable.id} 已经是新格式，跳过`);
          skipped++;
          continue;
        }

        // 记录原始标识符
        const oldIdentifier = variable.identifier;

        // 尝试解析原始标识符
        try {
          const parsed = identifierFormatter.parseIdentifier(oldIdentifier);
          
          // 确保变量有entityId，如果没有则使用源对象的id
          const entityId = variable.entityId || (variable.source && variable.source.id) || variable.id;
          
          // 生成新格式标识符
          const newIdentifier = identifierFormatter.formatIdentifier(
            variable.source?.type || 'unknown',
            variable.source?.name || variable.name,
            parsed.field || '',
            entityId
          );

          // 生成显示用标识符
          const displayIdentifier = identifierFormatter.formatDisplayIdentifier(
            variable.source?.type || 'unknown',
            variable.source?.name || variable.name,
            parsed.field || '',
            entityId
          );

          // 更新变量标识符
          variable.identifier = newIdentifier;
          (variable as any).displayIdentifier = displayIdentifier;

          // 保存更新
          await variableRepo.save(variable);
          
          console.log(`成功更新变量 ${variable.id}:`);
          console.log(`  - 旧标识符: ${oldIdentifier}`);
          console.log(`  - 新标识符: ${newIdentifier}`);
          console.log(`  - 显示标识符: ${displayIdentifier}`);
          
          updated++;
        } catch (parseError) {
          console.error(`解析标识符失败 ${oldIdentifier}:`, parseError);
          failed++;
        }
      } catch (error) {
        console.error(`处理变量 ${variable.id} 时出错:`, error);
        failed++;
      }
    }

    // 打印结果统计
    console.log('\n迁移完成，统计结果:');
    console.log(`- 总变量数: ${variables.length}`);
    console.log(`- 成功更新: ${updated}`);
    console.log(`- 已是新格式: ${skipped}`);
    console.log(`- 处理失败: ${failed}`);

  } catch (error) {
    console.error('迁移过程中出错:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行迁移脚本
migrateVariablesToUuidFormat().catch(error => {
  console.error('运行迁移脚本失败:', error);
  process.exit(1);
});
