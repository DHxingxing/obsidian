## 1. 需求分析

### 1.1 业务需求

- **问题**: 前端AiModelReq参数冗余，每次调用都需要传递大量重复信息
- **目标**: 通过数据库存储前端配置信息，使用jobId查询获取模型配置，实现参数化调用
- **核心流程**: 前端填写 → 数据库存储 → jobId查询 → 动态调用

### 1.2 技术需求

- 支持多种AI模型（OpenAI、Claude、文心一言等）
- 使用工厂模式 + 策略模式实现动态调用
- YML配置文件管理模型参数
- model_key作为配置映射键
- 支持参数传递和Prompt拼接

# 2 整体架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     前端页面     │    │     后端API     │    │    AI模型服务    │
│                │    │                │    │                │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 模型配置表单 │ │───▶│ │ 配置管理API │ │    │ │ OpenAI API  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                │    │                │    │                │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 任务执行页面 │ │───▶│ │ 模型调用API │ │───▶│ │ Claude API  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │   配置数据库     │
                       │                │
                       │ ┌─────────────┐ │
                       │ │ai_model_cfg │ │
                       │ └─────────────┘ │
                       │                │
                       │ ┌─────────────┐ │
                       │ │ YML配置文件  │ │
                       │ └─────────────┘ │
                       └─────────────────┘
```

## 2. 1 数据库表设计

```sql
DROP TABLE IF EXISTS ai_model;
CREATE TABLE ai_model(
    `id` INT AUTO_INCREMENT COMMENT '主键' ,
    `mark_job_id` BIGINT NOT NULL  COMMENT '任务id;关联mark_job的 id 字段' ,
    `model_key` VARCHAR(64) NOT NULL  COMMENT '模型配置键;用于从yml文件中拿到配置信息' ,
    `model_name` VARCHAR(255) NOT NULL  COMMENT '模型名称;模型名称' ,
    `model_enable` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否启用大模型;是否启用模型' ,
    `prompt_job` TEXT NOT NULL  COMMENT '任务配置;任务配置（prompt中的任务描述部份）' ,
    `prompt_role` TEXT   COMMENT '角色配置;角色配置（prompt中的角色定义部分)' ,
    `prompt_background` TEXT   COMMENT '背景配置;背景配置（prompt中的背景信息部分）' ,
    `prompt_output` TEXT   COMMENT '输出格式配置;prompt中的输出格式要求部分' ,
    `create_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间' ,
    `update_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间' ,
    `operate_user_id` CHAR(36) NOT NULL  COMMENT '操作人员id;操作者id' ,
    PRIMARY KEY (id)
)  COMMENT = '大模型配置表';

```

## 2. 2 ModelKey设计

**推荐的ModelKey命名规则**

```
格式：{供应商}-{模型系列}-{版本}
```
**命名示例：**
- `deepseek-r1-v1` (DeepSeek-R1)
- `zhy-deepseek-r1-v1` (中海油-DeepSeek-R1)
- `zhy-haineng-v1` (中海油-海能大模型)
- `openai-gpt4-turbo`
- `baidu-ernie-bot-v1`