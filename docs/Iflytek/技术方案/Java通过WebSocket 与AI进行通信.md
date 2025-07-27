通信的过程是什么？

- 连接到讯飞星火大模型的WebSocket服务地址。
    
- 发送一个问题（Prompt）。
    
- **流式地**接收大模型返回的答案。

“流式” 是这里的关键词。想象一下你在和ChatGPT聊天，它的回答不是一下子全部显示出来，而是一个字一个字地“打”出来。这就是流式返回。这种方式可以极大地提升用户体验，用户不必等到所有内容都生成完毕才能看到结果。

这段代码就是用Java实现了这个“打字机”一样的效果。

#### 二、 核心技术栈和关键组件

在深入代码之前，我们先了解一下它用了哪些“工具”：

1. **`org.java_websocket:Java-WebSocket`**
    
    - **作用**：这是实现WebSocket客户端的核心库。它帮你处理了底层复杂的网络握手、数据帧（Frame）的封装和解析等。你只需要关注几个关键的事件回调方法即可。
        
    - **好比**：你不需要自己造车轮和发动机，这个库已经帮你把车造好了，你只需要学会驾驶（即实现它的接口）。
        
2. **`io.projectreactor:reactor-core` (提供了 `Flux`)**
    
    - **作用**：这是一个实现了“响应式编程”范式的库。`Flux` 是它的核心类之一，代表一个包含0到N个元素的**异步序列**。
        
    - **为什么用它？** 因为AI的回答是“流式”的，是一连串的数据片段。`Flux` 非常适合用来表示这种“数据流”。当WebSocket收到一小段数据时，就把它“推”入 `Flux` 流中；当数据接收完毕，就告诉 `Flux` 流结束了。代码的调用者可以“订阅”这个 `Flux`，然后处理源源不断到来的数据。这是一种非常优雅的异步编程模型。
        
3. **`com.alibaba:fastjson`**
    
    - **作用**：一个非常流行的Java JSON处理库。因为和AI模型之间的通信数据完全是JSON格式的，所以这个库用来创建（序列化）要发送的JSON请求和解析（反序列化）收到的JSON响应。
        
4. **`org.projectlombok:lombok` (`@Slf4j`)**
    
    - **作用**：一个代码简化工具。这里的 `@Slf4j` 注解可以让你在代码中直接使用 `log` 对象来打印日志，而无需手动编写 `private static final Logger log = ...` 这样的样板代码。
        

#### 三、 代码逐行分析：`callModel` 方法是关键

`callModel` 方法是整个逻辑的入口。我们一步一步来看它做了什么。



```java
public Flux<String> callModel(AiMessageDTO aiMessageDTO, String content) {
    // ...
    return Flux.<String>create(sink -> {
        // ... 核心逻辑在这里 ...
    });
}
```

方法的返回值是 `Flux<String>`，这印证了我们之前的分析：它返回的是一个字符串“流”。`Flux.create(...)` 是创建一个自定义的 `Flux` 流的起点。你可以在 `create` 方法的Lambda表达式里，通过 `sink` 这个“发射器”来控制数据流。

- `sink.next(data)`: 发送一个数据。
    
- `sink.complete()`: 通知数据流正常结束。
    
- `sink.error(exception)`: 通知数据流因错误而结束。
    

接下来，我们看 `create` 内部的逻辑。

**第1步：准备连接信息**

```java
// 获取WebSocket连接信息
Pair<String, Map<String, String>> headerPair = ModelTools.getModelSocketConnectInfo(
        sparkDeskParams.getType(), sparkDeskParams.getEndPoint(),
        sparkDeskParams.getAppId(), sparkDeskParams.getAppKey(), sparkDeskParams.getAppSecret());
```

这里调用了一个工具类 `ModelTools`。它的作用是根据你的`AppID`、`APIKey`等身份信息，生成一个**带鉴权参数的WebSocket URL**。这很重要，因为AI服务需要验证你的身份才提供服务。这个URL通常包含了签名（Signature）、日期等信息。

**第2步：创建WebSocket客户端**


```Java
client = new WebSocketClient(new URI(headerPair.getKey()), new Draft_6455(), headerPair.getRight(), CONNECTION_TIMEOUT_MS) {
    // 匿名内部类，重写关键事件方法
    // ... onOpen, onMessage, onClose, onError ...
};
```

这里是整个代码的核心。它创建了一个 `WebSocketClient` 的实例。

- `new URI(headerPair.getKey())`: 传入上一步生成的带鉴权的URL。
    
- `new Draft_6455()`: 指定WebSocket的协议版本，这通常是标准版本。
    
- `headerPair.getRight()`: 传入额外的HTTP头信息，可能也用于鉴权。
    
- `{ ... }`: 这是一个**匿名内部类**。我们在这里重写了 `WebSocketClient` 的几个关键方法，来定义在不同事件发生时应该做什么。
    

**第2.1步：处理WebSocket事件（最重要的部分）**

- **`onOpen(ServerHandshake handshake)`**: 当WebSocket连接**成功建立**时被调用。
    
    ```java
  log.info("WebSocket连接已建立: {}", sid);
    connectionLatch.countDown(); // 通知主线程：连接成功了！
    startHeartbeat(this); // 启动一个心跳线程，防止连接因超时而断开
  ```
    
    
    这里的 `CountDownLatch` 是一个同步工具，我们稍后会讲它的作用。
    
- **`onMessage(String message)`**: 当从服务器**收到一条消息**时被调用。这是处理AI返回数据的核心。
    
    
```java
    // 1. 解析收到的JSON字符串
    JSONObject jsonObject = JSONObject.parseObject(message);
    
    // 2. 检查header中是否有错误码
    // ... error handling ...
    
    // 3. 提取真正的回答内容 (payload -> choices -> text -> content)
    String deltaContent = ...; // 获取那一小段文本
    
    // 4. 将内容推送到Flux流中
    sink.next(formattedResponse);
    
    // 5. 检查服务器返回的状态码 (status == 2 代表全部内容已返回)
    if (status == 2) {
        log.info("AI响应完成: {}", sid);
        sink.complete(); // 通知Flux流：数据发完了，可以结束了
    }
    ```
    
- **`onClose(int code, String reason, boolean remote)`**: 当连接**关闭**时被调用。
    
    
    
    ```Java
    log.info("WebSocket连接关闭: ...", ...);
    sink.complete(); // 连接都关了，数据流自然也结束了
    ```
    
- **`onError(Exception ex)`**: 当发生**网络或协议错误**时被调用。
    
    
    ```Java
    log.error("WebSocket连接错误: ...", ...);
    sink.error(new RuntimeException(...)); // 向Flux流报告错误
    ```
    

**第3步：发起连接并等待**


```Java
client.connect();
if (!connectionLatch.await(CONNECTION_TIMEOUT_MS, TimeUnit.MILLISECONDS)) {
    throw new RuntimeException("WebSocket连接超时");
}
```

`client.connect()` 是一个**异步**方法，它会立即返回，然后在后台尝试连接。但我们必须等到连接成功后才能发送我们的问题。怎么办呢？

这就是 `CountDownLatch` 发挥作用的时候了。

- `CountDownLatch connectionLatch = new CountDownLatch(1);`：创建一个“门闩”，计数为1。
    
- `connectionLatch.await(...)`：主线程在这里“等待”，直到门闩的计数变为0。它最多等10秒（`CONNECTION_TIMEOUT_MS`）。
    
- 在 `onOpen` 方法里，一旦连接成功，就会调用 `connectionLatch.countDown()`，把计数减为0。
    
- 这样就巧妙地实现了：**主线程发起连接后，暂停执行，等待`onOpen`事件触发后再继续往下走**。如果10秒还没连上，就抛出超时异常。
    

**第4步：发送请求**


```Java
// 等待连接成功后...
JSONObject requestPayload = buildRequestPayload(content, sid, sparkDeskParams);
client.send(requestPayload.toJSONString());
```

连接成功后，调用 `buildRequestPayload` 方法构建一个符合星火大模型API规范的JSON对象，然后通过 `client.send()` 发送给服务器。

**第5步：资源清理**


```Java
sink.onCancel(() -> {
    if (finalClient != null && finalClient.isOpen()) {
        finalClient.close();
    }
});
```

`onCancel` 是 `Flux` 的一个回调。如果 `Flux` 的订阅者（消费者）中途取消了订阅（比如用户关闭了页面），这个回调就会被触发，从而主动关闭WebSocket连接，避免资源浪费。

#### 四、 辅助方法解析

1. **`buildRequestPayload(...)`**
    
    - **作用**：这是一个“JSON构建器”。它按照星火大模型的文档要求，把你的问题 `content` 和一些配置参数（如 `temperature`，`max_tokens`）组装成一个复杂的 `JSONObject`。
        
2. **`startHeartbeat(...)`**
    
    - **作用**：启动一个后台“心跳”线程。
        
    - **为什么需要？** WebSocket是长连接。如果长时间没有数据交换，中间的某些网络设备（如防火墙、NAT）可能会认为连接已“死亡”并单方面断开它。为了防止这种情况，客户端会定期（这里是10秒）向服务器发送一个特殊的小消息（Ping包），告诉服务器“我还活着”。这能保持连接的稳定。
        

#### 五、 总结与学习要点 (可以直接写入你的笔记)

1. **WebSocket通信流程**:
    
    - **核心**：WebSocket是一种**全双工、持久化**的通信协议，区别于HTTP的“请求-响应”模式。它允许服务器主动向客户端推送数据。
        
    - **Java实现**: 使用 `Java-WebSocket` 库，通过重写 `onOpen`, `onMessage`, `onClose`, `onError` 四个核心事件回调方法来处理连接生命周期。
        
2. **异步编程与响应式流 (Reactive Streams)**:
    
    - **背景**：网络IO是耗时的，不能阻塞主线程。传统方式使用回调函数（Callback Hell）或者`Future`，代码容易变得复杂。
        
    - **现代方案**: 使用Project Reactor的 `Flux` 或 `Mono`。它将异步事件源（如WebSocket消息）封装成一个数据流。
        
    - **优点**:
        
        - **声明式API**: 代码更具可读性，像流水线一样处理数据 (`map`, `filter`, `doOnNext` ...)。
            
        - **背压(Backpressure)处理**: 自带流量控制，消费者可以根据自己的处理能力向生产者请求数据量，防止内存溢出。
            
        - **统一的错误处理**: 错误（Exception）也是流中的一种信号，可以被统一捕获和处理。
            
        - **解耦**: 将“数据生产”（WebSocket `onMessage`）和“数据消费”（业务逻辑）清晰地分离开。
            
3. **线程同步 (`CountDownLatch`)**:
    
    - **场景**: 在一个线程中需要等待另一个异步任务（如此处的WebSocket连接）完成后再继续执行。
        
    - **用法**: `new CountDownLatch(1)` 初始化 -> 主线程 `await()` 等待 -> 异步任务完成时 `countDown()` -> 主线程被唤醒。这是一个轻量级且高效的线程同步工具。
        
4. **长连接维护 (心跳机制)**:
    
    - **目的**: 防止因网络空闲而被中间设备断开连接。
        
    - **实现**: 创建一个独立的、低优先级的后台线程（Daemon Thread），定期调用 `client.sendPing()` 方法。
        
5. **代码设计模式**:
    
    - **策略模式 (`AiModelStragety`)**: `SparkDeskImpl` 实现了 `AiModelStragety` 接口。这暗示了系统中可能还有其他AI模型的实现（比如`QwenImpl`, `ErnieBotImpl`），它们都遵循同一个接口规范，使得上层调用者可以方便地切换不同的AI模型，而无需关心其底层实现是HTTP还是WebSocket。
        

希望这份详尽的分析对你有帮助！理解了这个例子，你就掌握了Java进行现代化网络异步通信的一个非常典型和实用的范例。