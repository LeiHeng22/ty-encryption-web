# 太原授权 · 贯标加密 SQL（网页版）

与桌面项目 `zlchs.TYEncryption` 相同的自定义 Base64 加解密算法，支持：

- 多行贯标编码批量加密（每行一个）
- 功能选项：事前 / 事中 / 电子处方 / 终端刷脸 / 中医适宜技术
- 自动合并生成 PostgreSQL `UPDATE insur.his_config` SQL

## 本地使用

直接用浏览器打开 `index.html`，或任意静态服务器：

```bash
npx --yes serve .
```

## GitHub Pages

仓库启用 Pages（分支 `main` / 根目录）后即可在线访问。

## SQL 模板

```sql
UPDATE insur.his_config hc
SET his_parametervalue = '加密串'
FROM qw_base.b_org bo
WHERE bo.id = hc.org_id
  AND bo.healthcare_code = '贯标编码'
  AND hc.his_parametername = '启用功能'
RETURNING hc.id, hc.org_id, hc.his_parametervalue;
```
