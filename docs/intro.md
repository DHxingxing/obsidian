## 示例流程图（Mermaid）

```mermaid
graph TD
    A[开始] --> B{是否正常运行?}
    B -- 是 --> C[继续使用]
    B -- 否 --> D[调试]
    D --> B
```
