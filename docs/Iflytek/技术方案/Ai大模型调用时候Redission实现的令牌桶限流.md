刚接到这个需求的时候，说实话，我对“令牌桶”的理解还停留在八股文的层面；至于调用大模型的方式，也只知道用 `curl` 敲命令行那一套。当我打开老项目的那一刻，眼前的画风简直是“代码地狱”：HTTP 请求头、请求体乱作一团，SSE 协议像是谜语人写的，WebSocket 配置更是云里雾里，简直要了我的老命。

幸好有几位哥们在关键时刻伸出援手，总算把需求给撸顺了。但事后回头想想，这事让我彻底明白了那句老话：**“学而不思则罔，思而不学则殆。”** 如果只是为了交付而写代码，不去深究背后的原理，那开发工作也就和拧螺丝没啥本质区别 —— 差不多就是个工具人罢了。

所以，这次需求虽然一度让我抓耳挠腮，但也正是这份“痛苦”，让我意识到：**光会调用 API，不懂协议和原理，是走不远的。**
## 1、策略工厂替换原来的名称匹配

我们要接入多个模型，就要实现多个配置类，老项目中面对多种模型的选择时候使用的竟然是（"中海油-海能大模型".equals(aiModelReq.getProjectAiModelConfigRequest().getModelName()),“大哥，你就拿名字和if-else 来做匹配啊，这真是想到什么写什么啊”)，因为每个模型的名字不一样，所以面对多个模型很自然的想到策略-工厂模式,不同的AI模型实现被封装在各自的策略类（`AiModelStragety`）中，`Service`层代码不需要关心具体模型的调用细节。这使得系统扩展性极强，增加新模型对现有代码无影响。
## 2、Redission 实现令牌桶限流

目前的服务肯定是在微服务的多机器上的，你肯定不能用基于JVM的令牌桶来做。目前项目中能满足的就是Redis了，所以我们用Redis 来做令牌桶。(这个问题其实就是有人会问你为什么不自己手写一个令牌桶算法，我在下面放个表格对比下就知道了。)

| 特性           | Redisson RSemaphore / RRateLimiter (令牌桶) | 自己手写一个限流器 (如 Java 的 Semaphore) |
|----------------|---------------------------------------------|---------------------------------------------|
| 场景           | 分布式系统（多台服务器）                    | 单机环境（只有一台服务器）                 |
| 工作原理       | 所有实例共享 Redis 中的计数器，全局可见      | 每个实例各自维护内存中的计数器，彼此不知  |
| 一致性         | 强一致性，全局统一限流                      | 无一致性，需要人为拆分额度，无法精准控制  |
| 可靠性         | 高：Redisson 使用 Lua 脚本保证原子性，稳定可靠 | 低：自己实现需要处理复杂分布式问题，容易出错 |
| 实现复杂度     | 极低：封装完善，一行代码搞定                 | 极高：需设计数据结构、编写 Lua 脚本等     |
| 维护成本       | 低：由 Redisson 官方持续维护                 | 高：自己写的逻辑需自己长期维护             |

起初我采用的是**滑动窗口限流**策略，设定例如“1 分钟内最多允许 10 个请求”这样的阈值。但在实际运行中，我发现它并不适合我们当前的业务需求，尤其是在大模型调用这种**请求耗时和资源消耗高度不均**的场景下，暴露出明显问题：

1. **不能体现任务的资源消耗差异**  
    大模型的调用耗时和资源占用与任务本身紧密相关。例如，让模型生成一篇 1 万字的小说和回答一个 “1 + 1 = ?” 所需的计算量完全不同。滑动窗口只是简单统计单位时间内的**请求次数**，无法感知请求的复杂度和对系统资源的实际占用。结果就是：轻量任务也会消耗掉限流额度，重任务可能被积压，从而导致系统资源利用率低甚至**出现等待但资源空闲**的情况。
    
2. **存在“突刺流量”风险，影响系统稳定性**  
    滑动窗口的另一个问题在于边界切换时的突刺效应。比如我们设置“1 分钟最多处理 5 个请求”：
    
    - 第 59 秒之前没有任何请求；
        
    - 第 60 秒瞬间来了 5 个请求，被全部放行；
        
    - 第 61 秒窗口滑动，又来了 5 个请求，同样被放行；
        
    
    结果是：在 2 秒内处理了 10 个请求，**限流规则形同虚设**，系统仍可能遭遇过载甚至被击穿。
    

综上所述，滑动窗口限流在大模型任务调度场景下显得不够灵活，既无法感知真实负载，也容易因为流量突刺造成风险。因此，我倾向于改用更适合此类场景的限流策略，比如**令牌桶算法**，它能更好地平滑请求速率，并允许一定程度的突发流量，同时也更易于与任务队列、动态信号量等资源感知型机制结合，实现更细粒度的调度控制。

我放弃了滑动窗口改使用信号量方案来实现令牌桶。
```java
// 获取分布式信号量
RSemaphore semaphore = redissonClient.getSemaphore(limiterKey);
```

- Redis数据结构：使用Redis的String类型存储信号量的许可数量
- 原子操作：基于Redis的DECR和INCR命令实现原子性的获取和释放
- 分布式一致性：通过Redis的原子操作保证多实例间的数据一致性

底层的实现可以分为初始化许可、获取许可、释放许可三步，三步是基于lua脚本操作的

想象一下，Redis 就是一个所有服务实例（你的应用部署在多个服务器上）都能访问的**中央数据中心**。Redisson 的所有操作，本质上都是在操作这个数据中心里的数据。

#### 1. 初始化许可 (`trySetPermits`)

当你第一次为某个模型（比如 `gpt-4`）设置限流时，会调用 `semaphore.trySetPermits(5)`。

- **开发者意图**：我想创建一个名为 `ai:limiter:gpt-4` 的信号量，并把它的总许可数（车位总数）设置为 `5`。这个操作只能成功一次。
    
- **Redisson 底层操作**：它不会傻傻地直接 `SET` 一个值。为了防止多个服务实例同时初始化导致冲突（竞态条件），它会向 Redis 发送一个类似 `SETNX` (SET if Not eXists) 的命令。
    
    **`SETNX "ai:limiter:gpt-4" 5`**
    
    这个 Redis 命令是**原子性**的。它表示：“只有当 `ai:limiter:gpt-4` 这个键**不存在**的时候，才将它设置为5”。
    
    - 第一个到达的实例执行 `SETNX`，成功设置了值，Redis 返回 `1`。
        
    - 后面紧跟着到达的其他实例再执行 `SETNX`，发现键已经存在了，操作失败，Redis 返回 `0`
    
    这样就完美保证了，无论多少个服务实例同时启动，这个信号量的总数只会被正确地初始化一次。
#### 2、获取许可

这是最关键的一步，也是最能体现 Lua 脚本威力的地方。

- **开发者意图**：我想从 `ai:limiter:gpt-4` 这个信号量里申请一个许可。如果当前许可数大于0，就给我一个，并把总数减一；如果等于0，就直接告诉我失败。整个过程必须是**一步完成**的，不能被打断。
    
- **为什么不能用多个 Redis 命令？** 如果你先用 `GET` 命令获取当前值，在你的应用代码里判断 `if (value > 0)`，然后再用 `DECR` 命令去减一。这个过程是**非原子**的。 在高并发下，可能发生这种情况：
    
    1. 服务A `GET` 到值为 `1`。
        
    2. 服务B 也在同时 `GET` 到值为 `1`。
        
    3. 服务A 判断 `1 > 0` 成立，执行 `DECR`，值变为 `0`。
        
    4. 服务B 也判断 `1 > 0` 成立，执行 `DECR`，值变为 `-1`。 结果，明明只有一个许可，却有两个服务同时获取成功，限流被“击穿”了。
        
- **Redisson 的 Lua 脚本解决方案**： Redisson 会将“检查并减少”这个逻辑，编写成一个 Lua 脚本，然后通过 `EVAL` 命令一次性发给 Redis 去执行。Redis 会保证整个脚本的执行过程是**原子**的，不会被任何其他命令插入。
    
    这个 Lua 脚本的逻辑可以简化成这样：
```lua
-- 脚本的参数：KEYS[1] 是信号量的键名, ARGV[1] 是想获取的许可数(通常是1)
local key = KEYS[1]
local permitsToAcquire = tonumber(ARGV[1])

-- 从 Redis 中获取当前许可数
local availablePermits = tonumber(redis.call('get', key))

-- 如果还有足够的许可
if availablePermits and availablePermits >= permitsToAcquire then
    -- 减少许可数
    redis.call('decrby', key, permitsToAcquire)
    -- 返回1代表成功
    return 1
else
    -- 许可数不够，返回0代表失败
    return 0
end
```

#### 3、释放许可
释放许可相对简单。

- **开发者意图**：我用完了一个许可，现在要把它还给 `ai:limiter:gpt-4`。
    
- **Redisson 底层操作**：同样是通过 Lua 脚本（或者一个简单的 `INCR` 命令）来完成。
    
    **`INCR "ai:limiter:gpt-4"`**
    
    `INCR` 命令也是原子的，它会安全地将键的值加一。所以，释放操作同样不会有并发问题。


## 上面是Redisson 进行令牌桶的操作的部分，现在我要记录Flux的使用。

代码的核心是 `Flux.using()`，你可以把它理解成是 Java 传统 `try-with-resources` 语句的**响应式、异步版本**。它的设计哲学是“**借资源 -> 用资源 -> 还资源**”，并确保“还资源”这一步**无论如何都会被执行**，从而防止资源泄漏。

#### 1、借资源
```java
 () -> {
    boolean acquired = checkRateLimit(modelKey, aiModelStragety);
    if (!acquired) {
        throw new BusinessException(REQUEST_TIMEOUT);
    }
    log.debug("限流令牌已获取...");
    return modelKey;
}
```
- **作用**：这是整个流程的入口。当有订阅者（subscriber）订阅这个 `Flux` 时，这个函数会被**首先调用**。
    
- **具体行为**：
    
    - 它调用 `checkRateLimit()` 去 Redisson 申请一个信号量许可（令牌）。
        
    - **申请成功**：如果 `acquired` 为 `true`，它会记录一条日志，并返回 `modelKey` 作为“已成功获取的资源”的凭证。这个凭证会被传递给后续的两个函数。
        
    - **申请失败**：如果 `acquired` 为 `false`（被限流了），它会立即抛出一个 `BusinessException` 异常。这个异常会使整个 `Flux` 流直接进入 `error` 状态，后续的“用资源”（`callModel`）和“还资源”逻辑都不会执行，流程提前终止。

#### 2、用资源
```java
acquiredResource -> aiModelStragety.callModel(aiMessageDTO, fullPrompt)
```
- **作用**：只有在“借资源”成功后，这个函数才会被调用。它负责创建真正的业务数据流。
- **具体行为**：
    
    - 它接收上一步返回的资源凭证（令牌） `acquiredResource`（在这里就是`modelKey`）。
        
    - 然后调用 `aiModelStragety.callModel()`，这个方法会返回一个 `Flux<String>`，也就是从 AI 模型那里流式返回的数据。这部分是整个业务逻辑的核心。

#### 还资源

```java
releasedResource -> {  
    String limiterKey = String.format(AI_MODEL_LIMITER_KEY_SUFFIX, releasedResource);  
    RSemaphore semaphore = redissonClient.getSemaphore(limiterKey);  
    if (semaphore.isExists()) {  
        semaphore.release(1);  
        log.debug("限流器已释放: key={}", limiterKey);  
    } else {  
        log.warn("限流器不存在，无法释放: key={}", limiterKey);
        
```

- **作用**：这是 `Flux.using` 最重要的保障机制。这个函数会在第二步创建的流**终止时被调用**。
    
- **触发时机**：无论流是正常结束、发生错误还是被取消，它**必定会执行**。
    
    - **正常完成 (`onComplete`)**：AI 模型成功返回了所有数据。
        
    - **发生错误 (`onError`)**：在调用 `callModel` 的过程中发生了任何异常。
        
    - **被取消 (`onCancel`)**：下游的调用者取消了数据订阅。
        
- **具体行为**：它接收到凭证，然后调用 `semaphore.release(1)`，将之前申请的那个许可**归还**给 Redisson 的信号量池。这就确保了限流的许可能够被可靠地回收，不会发生“只借不还”的资源泄漏问题。

#### .doOnError
```java
doOnError(throwable -> {  
    // 只有当 callModel 内部发生错误时才会记录，限流错误在 using 内部处理  
    if (!(throwable instanceof BusinessException && ((BusinessException) throwable).getErrorCode().equals(REQUEST_TIMEOUT))) {  
        log.error("AI模型调用失败: modelKey={}, error={}", modelKey, throwable.getMessage());  
    }  
});
```

这是一个“副作用”操作符，它允许你在不改变流的情况下，对流中的错误信号进行一些处理。

- **作用**：它在这里的作用是记录日志。
    
- **精妙之处**：它加了一个判断 `if (!(throwable instanceof BusinessException && ...))`，意思是**只记录那些不是因为限流（REQUEST_TIMEOUT）而发生的未知错误**。因为限流是一个预期的、正常的业务逻辑，已经在第一步中记录过了，没必要再当作一个意外错误来重复记录，这样可以保持日志的整洁和有效性。

## 为什么必须用 `Flux.using`？

AI模型调用是**异步流式**的，即 `callModel(...)` 方法返回的是 `Flux<String>`。这是一个关键点。

`Flux` 代表的是一个“未来的数据序列”，调用 `callModel` 方法会**立即返回**，而数据（AI的回答）会在之后的某个时间点，以数据流的形式陆续到达。

- **如果不用 `Flux.using`**（比如尝试手动管理许可）：
    
    - 你会遇到一个棘手的问题：**应该在什么时候调用 `semaphore.release()` 来释放许可？**
        
    - **错误做法1：在 `callModel` 调用后立即释放。**
        ```java
        // 绝对错误！
        semaphore.acquire();
        Flux<String> resultStream = aiModelStragety.callModel(...);
        semaphore.release(); // 大BUG！此时AI调用刚开始，许可就被释放了！
        return resultStream;
        ```
这会导致许可被瞬间释放，下一个请求马上就能获得许可，并发控制形同虚设。

    - **错误做法2：尝试使用回调。**
```java
semaphore.acquire();
return aiModelStragety.callModel(...)
        .doOnTerminate(() -> { // 当流终止时（完成或错误）
            semaphore.release();
        })
        .doOnCancel(() -> { // 当流被取消时
            semaphore.release();
        });

```

        这种方式虽然可行，但非常笨拙。你需要手动处理所有可能的终止情况（`onComplete`, `onError`, `onCancel`），代码可读性差，容易遗漏，这就是所谓的“回调地狱”，不是一种健壮的设计。
        
- **`Flux.using` 的作用**：
    - 它就是为了解决这个**“异步资源生命周期管理”**问题而生的。
    - 它将**“获取资源”**（`acquire`）、**“使用资源创建流”**（`callModel`）、**“释放资源”**（`release`）这三个步骤优雅地绑定在了一起。
    - 它向你保证：**无论中间的异步流是正常完成、发生错误、还是被中途取消，那个“释放资源”的逻辑都一定会被执行。**

**所以，`Flux.using` 回答了这个问题：对于一个异步数据流，我如何能100%确保我之前获取的资源，在流程结束后一定被释放？**


## 补充知识：


#### Flux 的底层是什么？

`Flux` 是 Project Reactor 库中的核心类之一，而 Project Reactor 是实现**响应式编程规范（Reactive Streams Specification）** 的一个主流框架。

Flux 的底层核心思想可以概括为以下几点：

##### 1、响应式编程是基于经典的**发布者-订阅者**设计模式的。

- **`Flux` (或 `Mono`) 是发布者 (Publisher)**：它代表一个包含 0 到 N 个元素的**异步数据序列**。你可以把它想象成一个“数据管道”，它只用来传输经过他的数据（这些数据可以来自数据库，定时任务的生产，取决于你怎么生产这些数据），本身不产生数据。
- 
**我们的代码中是发布者呢**？

**发布者**就是你通过 `Flux.using(...)`精心构建并从 `invokeAiModel` 方法**返回**的那个 `Flux<String>` 对象。

它不仅仅是一个简单的数据源，而是一个**复合的、智能的数据管道**。这个管道的蓝图（定义）包含了：

1. **前置操作逻辑**：在数据开始流动前，必须先从 Redisson 获取一个限流许可。
    
2. **核心数据源**：真正的数据来自于 `aiModelStragety.callModel(...)` 返回的另一个 `Flux`。
    
3. **后置清理逻辑**：无论数据流是正常结束、出错还是被取消，都必须归还 Redisson 的许可。
    

所以，这个由 `Flux.using(...)` 创造的 `Flux<String>` 就是一个功能完备的**发布者**。它已经准备好，一旦有人订阅，它就知道该如何一步步地执行上述所有操作。

---
    
- **调用 `.subscribe(...)` 的是你写的逻辑，它代表你定义的订阅者（Subscriber）角色，负责对数据流进行消费。**在响应式编程模型中，`subscribe()` 是触发整个数据流的关键操作。只有在订阅发生时，Flux 或 Mono 才会开始执行你预先定义的数据生成、转换与传递逻辑（即“惰性求值”特性）。这个订阅者可以是你自己实现的回调函数，也可以是框架中预定义的消费者，例如用于响应式 Web 请求、数据库响应等场景。
    
- **“没有订阅，就没有事件”**：这是响应式编程的黄金法则。你定义了一长串的 `Flux` 操作（如 `map`, `filter`, `using`），但只要没有最终的 `.subscribe()` 调用，整个数据流就不会启动。

 **谁是订阅者** (Subscriber)？

可能会疑惑，在`invokeAiModel` 方法里，并没有看到任何 `.subscribe()` 的调用。这是因为在现代响应式框架（比如正在使用的 **Spring WebFlux**）中，最终的订阅操作通常是由**框架本身**来完成的。

我把调用的接口放在这里：

```java
@GetMapping(value = "invoke", produces = MediaType.TEXT_PLAIN_VALUE)  
public ResponseEntity<Flux<String>> invokeAiModel(@RequestParam Long jobId, @RequestParam String prompt) {  
    Flux<String> result = aiModelService.invokeAiModel(jobId, prompt);  
    return ResponseEntity.ok()  
            .contentType(MediaType.TEXT_PLAIN)  
            .body(result);  
}
```

**订阅的“魔法”就发生在这里：**

1. 一个外部客户端（比如网页）向 `/ai/stream-invoke` 发起了一个 HTTP 请求。
    
2. Spring WebFlux 框架接收到请求，并调用你的 `streamInvoke` 控制器方法。
    
3. 你的方法返回了一个 `Flux<String>` 对象（那个**发布者**）。
    
4. **关键时刻**：Spring WebFlux 框架接管了这个返回的 `Flux`。它看到返回值是一个响应式类型，于是**框架自己扮演了订阅者的角色，并在内部对你的 `Flux` 调用了 `.subscribe()`**。
    

这个由 **Spring WebFlux 框架**创建的**订阅者**，它的任务是专门**处理 HTTP 响应**。它的逻辑大致如下：

- 当接收到 `onNext(String data)` 信号时（即AI模型传来一小块数据）：它会将这块数据写入到 HTTP 的响应体中，实时地发送给客户端。这就是流式响应（Server-Sent Events）的实现方式。
    
- 当接收到 `onError(Throwable error)` 信号时（比如你的限流异常或者模型调用失败）：它会将这个异常转换成一个合适的 HTTP 错误状态码（比如 429 Too Many Requests 或 500 Internal Server Error）并返回给客户端。
    
- 当接收到 `onComplete()` 信号时（AI数据流正常结束）：它会正常地关闭 HTTP 响应连接。
---

##### 2 基于“推”的异步模型 (Push-based Asynchronous Model)

- **传统模型（Pull 拉模式）**：像 `Iterator` 或 `List`，是消费者主动去拉取数据 (`iterator.next()`)，如果数据还没准备好，线程就会**阻塞**等待。
    
- **响应式模型（Push 推模式）**：是生产者（Publisher）在数据准备好后，**主动推送**给消费者（Subscriber）。整个过程是**异步非阻塞**的，线程不需要空闲等待，可以去处理其他任务，大大提高了系统资源的利用率。

##### 3. 事件信号 (Event Signals)

`Flux` 数据流中传递的不仅仅是数据，而是一系列**标准化的事件信号**：

- `onNext(T data)`: 推送一个正常的数据项。
    
- `onComplete()`: 通知订阅者数据流已成功结束，不会再有 `onNext` 事件。
    
- `onError(Throwable error)`: 通知订阅者流中发生了错误，数据流异常终止。
    

`Flux.using` 的三个函数，本质上就是在响应这三种信号（`onNext` 由 `callModel` 的 `Flux` 产生，`onComplete`/`onError` 会触发资源清理）。

##### 4. 背压 (Backpressure)

这是响应式流最关键、最复杂的概念之一。它解决了“快生产者 vs 慢消费者”的问题。

- **问题**：如果数据生产者（如一个快速的数据库）推送数据的速度远远快于消费者处理的速度，会导致消费者内存溢出而崩溃。
    
- **解决方案**：订阅者在订阅时，会通过一个 `Subscription` 对象告诉发布者：“我准备好了，请先给我 N 个元素”（`subscription.request(N)`）。发布者只会推送 N 个元素，然后等待订阅者下一次的 `request` 请求。这给予了消费者反向控制流量的能力，防止自己被冲垮。







#### **Semaphore 信号量在Java中的作用:**
 
 在Java中，`Semaphore`（信号量）是 `java.util.concurrent` 并发包提供的一个非常重要的工具类。它的核心作用是**控制对特定资源或代码块的同时访问的线程数量**。
##### 主要方法和特性总结

1. **构造函数**：
    
    - `Semaphore(int permits)`：创建一个具有指定许可数量的信号量。
        
    - `Semaphore(int permits, boolean fair)`：可以指定是否为“公平模式”。公平模式下，等待的线程会按照 FIFO（先进先出）的顺序获得许可。非公平模式则允许“插队”，性能通常更高。
        
2. **核心方法**：
    
    - `void acquire()`: 获取一个许可，如果没有可用许可，则**阻塞**等待。
        
    - `void release()`: 释放一个许可，使其返回信号量。
        
    - `boolean tryAcquire()`: **非阻塞**地尝试获取一个许可。如果成功，返回 `true`；如果失败（没有可用许可），立即返回 `false`，线程不会等待。
        
    - `int availablePermits()`: 返回当前可用的许可数量。
        
3. **关键特性**：
    
    - **作用范围：单个 JVM**。Java 的 `Semaphore` 只能控制**同一个Java进程内部**的线程。它无法像 Redisson 的 `RSemaphore` 那样跨越多个服务器进行分布式协调。
        
    - **用途：它主要有两种工作模式：
	    - **作为互斥锁 (`new Semaphore(1)`)**：当许可数设置为1时，信号量的作用等同于一个锁，可以确保代码块在任何时刻最多只有一个线程执行，从而保护共享数据，保证线程安全。
		- **作为流量控制器 (`new Semaphore(N)`)**：当许可数设置为N（N > 1）时，它允许多达N个线程并发访问。这通常不用于保护共享变量，而是用于管理有限的资源池，如数据库连接、或限制对某个API的并发调用次数。
