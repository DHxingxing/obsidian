# JsonAnySetter
JsonAnySetter 是 Jackson 提供的一种“兜底”机制。它的核心作用是：在把 JSON 反序列化成 Java 对象时，凡是 字段名在类里找不到对应属性 的那些键值对，Jackson 都会调用被 @JsonAnySetter 标注的方法，把它们保存到你指定的位置（通常是一张 Map）。这样就能让对象既保持已有的强类型字段，又能动态接收未知或私有的扩展字段，而不至于抛出 UnrecognizedPropertyException。


只能在类里 指定一个 @JsonAnySetter 方法或字段。方法签名一般是 void put(String key, Object value)，字段通常是 Map (String,Object) extra（框架会直接往这张 Map 里塞数据）。

如果同时需要把这部分动态字段序列化回 JSON，可以再给一个 @JsonAnyGetter 方法或字段，Jackson 在写出 JSON 时会把 Map 里的条目平铺为同级键值。

它与 @JsonIgnoreProperties 不同：Ignore 是完全丢弃未知字段；AnySetter 则把未知字段保留下来。

典型场景就是“Property Bag”模式：公共字段固定写在 Java Bean 里，新增字段全部进 extra。这样当你接入新模型、出现新参数时，代码不必新增成员变量，只要在 Map 中读取即可。

注意避免字段名冲突。如果 JSON 中的键与已有属性重名，Jackson 优先走普通属性的 setter，不会落到 AnySetter 上。

## 简单流程

- 反序列化时：先找常规字段 → 剩余字段全部交给 AnySetter → 存到 Map。

序列化时（若有 AnyGetter）：取 Map 内容 → 展平到同级 → 与常规字段一起输出。

借助 @JsonAnySetter，你可以把“新增模型参数”对代码的冲击面控制在最小：核心 Bean 不动，新字段自动进 extra，后续按需解析即可。