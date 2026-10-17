# Kubernetes (Kustomize)

Manifests do Catalog no EKS. Aplicados pelo CD (`.github/workflows/cd.yml`), não à mão.

```
k8s/base/
├── kustomization.yaml   # namespace catalog + imagem parametrizada (catalog -> <ecr>:<sha>)
├── namespace.yaml       # namespace catalog
├── serviceaccount.yaml  # SA catalog com a role IRSA (${IRSA_ROLE_ARN})
├── deployment.yaml      # initContainer prisma-migrate + app na porta 3000
├── service.yaml         # ClusterIP 80 -> 3000
└── ingress.yaml         # ALB interno compartilhado, /api/catalog (${ALB_SG_ID})
```

Fora do Git, criados pelo CD a cada deploy:

- **ConfigMap `catalog-config`**: `NODE_ENV`, `PORT`, `AWS_REGION`, `MESSAGING_ENABLED`,
  `OTEL_SERVICE_NAME`, `INBOX_QUEUE_URL`, `EVENTS_TOPIC_ARN` (outputs do Terraform) e
  `OTEL_EXPORTER_OTLP_ENDPOINT` quando o Alloy está instalado.
- **Secret `catalog-secret`**: `DATABASE_URL` e `JWT_SECRET`, lidos do Secrets Manager.

`AWS_ENDPOINT_URL` nunca é definida no EKS: o SDK usa o endpoint padrão e as
credenciais da role IRSA.

## Validar (sem cluster)

```bash
kubectl kustomize k8s/base
```

`${IRSA_ROLE_ARN}` e `${ALB_SG_ID}` aparecem literais na saída; o CD os substitui com
`envsubst` antes do `kubectl apply`.
