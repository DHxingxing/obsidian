## 1. 需求分析

### 1.1 业务需求

- **问题**: 前端AiModelReq参数冗余，每次调用都需要传递大量重复信息
- **目标**: 通过数据库存储前端配置信息，使用jobId查询获取模型配置，实现参数化调用
- **核心流程**: 前端填写 → 数据库存储 → jobId查询 → 动态调用

### 1.2 技术需求

- 支持多种AI模型（OpenAI、Claude、文心一言等）
- SPI 机制
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
**表中可以这么传参数**

| id  | mark_job_id | model_key                | model_name  | model_enable | prompt_job | prompt_role | prompt_background | prompt_output | operate_user_id                        |
| --- | ----------- | ------------------------ | ----------- | ------------ | ---------- | ----------- | ----------------- | ------------- | -------------------------------------- |
| 1   | 123456789   | gpt_chat_completion_v1   | GPT-4 Turbo | 1            | "请总结以下文本"  | "你是摘要专家"    | "请忽略无关信息，只关注关键内容" | "输出100字以内的摘要" | "de93fd47-4d87-452e-b73c-04b092c30ff6" |
| 2   | 987654321   | claude_content_review_v1 | Claude V3   | 1            | "请审查以下内容"  | "你是内容审查员"   | "特别关注敏感词汇与不当内容"   | "输出违规内容列表"    | "de93fd47-4d87-452e-b73c-04b092c30ff6" |

## 2. 2 ModelKey设计

**推荐的ModelKey命名规则**

```
格式：{供应商}-{模型系列}-{版本}
```
**命名示例：**
- `deepseek-r1-v1` (DeepSeek-R1)
- `zhyDeepseek-r1-v1` (中海油-DeepSeek-R1)
- `zhyHaineng-v1` (中海油-海能大模型)
- `openai-gpt4-turbo`
- `baidu-ernie-bot-v1`

**然后我们可以在yml中进行这么配置**
``` yml
ai-model:
  gpt_chat_completion_v1:
	  name：
	  params：
	    api-key: 'xxxx'
	    endpoint: 'https://api.openai.com/v1/chat/completions'
	    model-name: 'gpt-4-turbo'
	    timeout: 120000
	    temperature: 0.7
	    max-tokens: 2000
	    max-requests: 5

  baichuan_summarization_v2:
    api-key: 'xxxx'
    endpoint: 'https://api.baichuan-ai.com/v1/summarize'
    model-name: 'Baichuan-53B'
    timeout: 180000
    temperature: 0.5
    max-tokens: 1500

  claude_content_review_v1:
    api-key: 'xxxx'
    endpoint: 'https://api.anthropic.com/v1/review'
    model-name: 'claude-v3'
    timeout: 90000
    max-tokens: 1000
    temperature: 0.2

```

# 前端传递参数
**从前端到后端传递的参数尽可能精简，前端不需要直接传递`modelKey`，因为它应当由后台通过`jobId`从数据库获取**。

前端仅需传递：

- `jobId`：根据此id从数据库中拿到所有 prompt 部分和对应的model配置。
    
- `cueWord`：用于决定本次调用大模型操作的数据范围或条件，比如是哪个字段、哪个数据集、哪个标注任务等。


#  SPI   VS  策略工厂

- **策略工厂模式：** 工厂类和具体策略类紧密耦合，每次扩展策略需直接修改工厂类代码。
    
- **SPI机制：** 工厂和具体实现类完全解耦，扩展时只需新增插件实现，真正实现“开闭原则”。

- **运行时动态加载能力的区别**

- **策略工厂模式：**
    
    - **静态绑定**，实现类在编译期确定；
        
    - 每次新增模型策略后，都需重新编译部署，无法动态加载。
        
- **SPI机制：**
    
    - **动态加载**，实现类在运行时发现和加载；
        
    - 新增插件不需要重新编译部署整个服务，甚至可支持**热插拔**。


```java
// 1. 定义SPI接口
public interface ModelService {
    String modelKey();
    ModelResult callModel(String prompt, Map<String, Object> modelParams);
	// 流式和非流式 如何统一ModelResult

}

// 2. 实现插件（示例）
public class GPTModelService implements ModelService {
    @Override
    public String modelKey() { return "gpt"; }
    @Override
    public ModelResult callModel(...) { ... }
}

// 3. SPI加载
ServiceLoader<ModelService> loader = ServiceLoader.load(ModelService.class);
loader.forEach(service -> map.put(service.modelKey(), service));

```

|项目|Java SPI|配置驱动 + 反射注册|
|---|---|---|
|**实现方式**|`META-INF/services/` + `ServiceLoader`|yml 配置 + Map 绑定 + 反射实例化|
|**扩展方式**|新建类 + 配置 SPI 文件|新建配置项，无需动代码|
|**耦合性**|强依赖接口与实现类绑定|解耦，运行时动态装配|
|**动态性**|静态注册，启动前确定|真正运行时动态注册、动态切换|
|**Spring 支持**|Spring Boot 不推荐使用原始 SPI|完美契合 Spring 配置体系|
|**调试复杂度**|易出错，排查麻烦（如类加载失败）|基于配置和 Spring 注入，易调试|

# 限流

10个人 调用大模型 会超过大模型的并发上限 

使用令牌桶限流 Redis的令牌桶 分布式令牌桶

### **** Redis + Lua 实现令牌桶限流

使用 Redis 的原子性 + Lua 脚本，可以实现**全局分布式令牌桶限流**0。

对于每个不同的模型实现不同的限速
```yaml
	ai-model:
	  gpt:
	    rate-limit:
	      permits-per-second: 5
	  spark:
	    rate-limit:
	      permits-per-second: 10
```



**优点：**

- 精确控制模型的 QPS 或并发；
    
- 分布式安全；
    
- 可按 `modelKey` 或 `userId+modelKey` 维度限流；
    
- 控制调用节奏，避免模型被封禁。

**关键点：**

- Redis `zset + TTL` 或 `key + 过期时间` 存储令牌；
    
- 使用 Lua 脚本保证“获取令牌+消费令牌”原子性；
    
- 每秒补充 X 个令牌（由配置项控制）；
    

