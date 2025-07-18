### 查看所有命名空间
kubectl  get namespaces

查看所有命名空间中的pod
kubectl get pod --all-namespaces

在所有命名空间中进行模糊匹配：
kubectl get pod --all-namespaces | grep mark

查看日志
```k8s
kubectl logs \                             # 查看 Pod 的日志
  --tail=200 \                             # 仅显示最近的 200 行日志
  -n obu-ai-cloud-staging \                # 指定命名空间（例如 obu-ai-cloud-staging）
  -f sdmarkserver-1.0.0-alpha.46-xxx       # 指定 Pod 名，并持续输出后续日志（类似 tail -f）
```

