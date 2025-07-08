`@PostConstruct` 注解的方法会在 Spring 容器完成 Bean 的依赖注入之后自动执行一次，用于执行初始化逻辑。
```java
@Component
public class MyService {

    @PostConstruct
    public void init() {
        // 初始化代码，如加载缓存、启动任务等
        System.out.println("MyService 初始化完成");
    }
}

```
