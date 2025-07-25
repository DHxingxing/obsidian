//这里需要加一个过滤的原因是，mybatis plus 分表查询出来的结果，聚合的时候可能会聚合空对象


```java
return checkResourceList.stream()  
            .filter(item -> Objects.nonNull(item.getJobId()))  
            .collect(Collectors.groupingBy(ResourceOperatedCountDTO::getJobId));  
}
```