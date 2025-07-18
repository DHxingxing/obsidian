org.springframework.cloud.openfeign.FeignClientsRegistrar

AnnotationAttributes: spring中的注解为了获取注解中属性值而实现的一个基于linkedHashMap的集合


```java
default Map<String, Object> getAnnotationAttributes(String annotationName, boolean classValuesAsString) { MergedAnnotation<Annotation> annotation = getAnnotations().get(annotationName, null, MergedAnnotationSelectors.firstDirectlyDeclared()); if (!annotation.isPresent()) { return null; } return annotation.asAnnotationAttributes(Adapt.values(classValuesAsString, true)); } 返回null 为什么到 @Override @Nullable public Map<String, Object> getAnnotationAttributes(String annotationName, boolean classValuesAsString) { if (this.nestedAnnotationsAsMap) { return AnnotationMetadata.super.getAnnotationAttributes(annotationName, classValuesAsString); } return AnnotatedElementUtils.getMergedAnnotationAttributes( getIntrospectedClass(), annotationName, classValuesAsString, false); } 这里了？ 返回null 不是直接跳出方法了吗
```