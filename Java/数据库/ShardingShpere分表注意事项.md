# ShardingSphere 分库分表注意事项

## 1. 分片键禁止被修改
- 分片键（如 `markJobId`、`id`）字段**严禁在 UPDATE 中被修改**，即使只是 `SET` 成原值也不允许。
- 否则会被 ShardingSphere 拦截，抛出异常，导致 SQL 执行失败。

## 2. DML 操作必须包含分片键
- 在执行 `UPDATE`、`DELETE` 等操作时，**SQL 的 `WHERE` 条件必须包含分片键**（如 `markJobId`、`id`）。
- 否则 ShardingSphere 无法将 SQL 精确路由到目标分表/分库，可能导致：
  - 全库/全表扫描
  - 广播 SQL，性能极差

## 3. 推荐用法
- 使用如下方式构造更新语句：
  ```java
  update(newEntity, wrapper)

