
你在代码里没有看到 `Redisson.create(config)`，但却能通过 `@Resource` 或 `@Autowired` 注入 `RedissonClient`，这是因为你很可能使用了 **Spring Boot 的自动化配置（Auto-configuration）** 功能。

这个过程就像是你点了一份外卖，你只需要在 App 上选好菜（在配置文件里写好 Redis 地址），然后外卖就直接送到了你家门口（可以直接注入使用），你完全不需要关心厨房是怎么开火、怎么炒菜的。

下面是这个“魔法”背后的具体步骤：

### 第一步：添加依赖 (The Trigger)

这一切的起点，是你在项目的 `pom.xml` (或 `build.gradle`) 文件中添加了 Redisson 的 Spring Boot Starter 依赖：

XML

```
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson-spring-boot-starter</artifactId>
    <version>...</version>  </dependency>
```

这个 `starter` 就像一个信号，它告诉 Spring Boot：“嘿，这个项目想要使用 Redisson，请帮我自动处理好所有配置！”

### 第二步：提供配置 (The Recipe)

接下来，你会在项目的 `application.yml` 或 `application.properties` 文件中提供 Redis 的连接信息，而不是在 Java 代码里硬编码。

例如，在 `application.yml` 中：

YAML

```
spring:
  redis:
    host: 127.0.0.1
    port: 6379
    password: your-password
    database: 0
    # ... 其他配置
```

Spring Boot 会自动读取这些以 `spring.redis` 开头的配置。

### 第三步：自动化配置类 (The Magic)

这是最关键的一步。`redisson-spring-boot-starter` 包里包含一个或多个**自动化配置类**（例如 `RedissonAutoConfiguration`）。这个类是 Spring Boot 实现“约定优于配置”的核心。

这个类上通常有几个关键的注解：

1. `@Configuration`: 声明这是一个 Spring 配置类。
    
2. `@ConditionalOnClass(Redisson.class)`: **条件注解**，表示只有在项目的 classpath（依赖库）中能找到 `Redisson` 这个类时，本配置才会生效。
    
3. `@EnableConfigurationProperties(RedisProperties.class)`: 告诉 Spring Boot 将 `application.yml` 中 `spring.redis` 下的配置项，自动加载到一个名为 `RedisProperties` 的 Java 对象中。
    
4. `@Bean` 和 `@ConditionalOnMissingBean(RedissonClient.class)`: 这是**真正的实例化动作**发生的地方。
    

在这个配置类内部，会有一个类似这样的方法：

Java

```
// 这是简化的伪代码，用来说明原理
@Bean
@ConditionalOnMissingBean(RedissonClient.class) // 如果用户没有自己创建 RedissonClient，我才创建
public RedissonClient redissonClient(RedisProperties props) {
    // 1. 创建一个 Redisson 的 Config 对象
    Config config = new Config();
    
    // 2. 从 RedisProperties (也就是你application.yml里的配置) 读取信息
    //    并设置到 Config 对象中
    config.useSingleServer()
          .setAddress("redis://" + props.getHost() + ":" + props.getPort())
          .setPassword(props.getPassword())
          .setDatabase(props.getDatabase());

    // 3. 在这里，Spring Boot 在幕后替你调用了 Redisson.create！
    return Redisson.create(config); 
}
```

这个方法被 `@Bean` 注解标记，意味着它的返回值（一个 `RedissonClient` 实例）会被创建并注册到 Spring 的**容器**（IoC Container）中，成为一个可以被全局注入的组件（Bean）。

### 第四步：依赖注入 (Using the Instance)

当 Spring Boot 应用程序启动时，上面那个自动化配置类就会运行，悄无声息地创建好一个 `RedissonClient` 实例并放入容器中。

所以，当你的业务代码（比如 `AiModelServiceImpl`）需要用到它时，你只需要通过 `@Resource` 或 `@Autowired` 声明一下：

Java

```
@Resource
RedissonClient redissonClient;
```

Spring 容器看到这个注解，就会说：“哦，你需要一个 `RedissonClient`，我这里正好有一个已经配置好的实例”，然后就自动把它“注入”到你的类中。

### 总结

所以，你没有看到 `Redisson.create()` 的调用，是因为 **Spring Boot Starter 框架替你完成了这个“脏活累活”**。你只需要：

1. **引入依赖**：告诉 Spring Boot 你想用 Redisson。
    
2. **提供配置**：在 `application.yml` 中告诉它 Redis 在哪里。
    

然后就可以直接在代码中通过依赖注入来使用 `RedissonClient` 实例了。这正是 Spring Boot 框架的强大之处，它极大地简化了配置和整合第三方库的工作。