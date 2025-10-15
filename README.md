# Docker → Compose → Kubernetes ハンズオン

ローカルで **Docker / Docker Compose / Kubernetes(kind + kubectl)** を段階的に体験する教材。
（Windows + PowerShell 前提）


## 📂 現在のプロジェクト構成

```text
docker-k8s-handson-akira2525/
├─ app/                   ← Node.js アプリ本体（Step4）
│   ├─ index.js           ← Webサーバーのメインロジック
│   ├─ package.json       ← 依存ライブラリ設定（express / pg）
│   ├─ Dockerfile         ← コンテナ化レシピ
│   └─ .dockerignore      ← 除外リスト（軽量化）
│
├─ docker-compose.yml     ← Compose構成（Step5：app + Postgres 一括起動）
│
├─ k8s/                   ← Kubernetesマニフェスト（Step6）
│   └─ deployment.yaml    ← Deployment + Service 定義
│
├─ .gitignore             ← 除外設定（Step7）
│
└─ README.md              ← 教材の本体ドキュメント（Step1〜7統合）

---

## 学習ロードマップ（全体像）

| Step | タイトル                         | ゴール                                           | GitHub反映 |
| ---: | ---------------------------- | --------------------------------------------- | -------- |
|    1 | 事前インストール & 動作チェック            | Docker / Git / VSCode / kubectl / kind を導入・確認 | ❌        |
|    2 | Git＋GitHub 接続                | `docker-k8s-handson-akira2525` を PC と同期       | ✅        |
|    3 | Docker入門（Hello Nginx）        | `nginx` を pull/run → 停止/削除まで                  | ❌        |
|    4 | 自作アプリをDocker化                | `app/` を Docker 化して起動                         | ✅        |
|    5 | Docker Compose（app + DB）     | app + Postgres を一括起動・連携                       | ✅        |
|    6 | Kubernetes体験（kind + kubectl） | クラスタ作成 → Pod/Service → port-forward           | ✅        |
|    7 | .gitignore & Push            | 不要物を除外してきれいに公開                                | ✅        |

---

## Step1：事前インストール & 動作チェック

```powershell
winget install --id Docker.DockerDesktop -e
winget install --id Git.Git -e
winget install --id Microsoft.VisualStudioCode -e
winget install --id Kubernetes.kubectl -e
winget install --id kind.Kind -e
```

**確認コマンド**

```powershell
docker version
git --version
code --version
kubectl version --client
kind version
```

💬 **補足**
PowerShellを開き直すとPATH反映が有効になる。
`docker version` が通れば、Docker Desktopは正常稼働。

---

## Step2：Git＋GitHub 接続

### ① GitHubでリポジトリ作成

* リポジトリ名：`docker-k8s-handson-akira2525`
* Visibility：Public / Private どちらでも可
* Add a README：チェック外す（空に）
* URL例：`https://github.com/akira-2525-cloud/docker-k8s-handson-akira2525.git`

---

### ② クローン（PCへコピー）

```powershell
Set-Location "$HOME\Documents"
git clone https://github.com/akira-2525-cloud/docker-k8s-handson-akira2525.git
Set-Location .\docker-k8s-handson-akira2525
```

---

### ③ 初回コミット＆push

```powershell
" # docker-k8s-handson-akira2525" | Out-File README.md -Encoding utf8
git add .
git commit -m "chore: init"
git push -u origin main
```

---

### ④ 成功チェック

```powershell
git status
git log --oneline -n 1
git remote -v
```

> ブラウザでREADME.mdが見えればOK。

---

### ⑤ 日常ループ

```powershell
git status
git add -A
git commit -m "feat: update"
git push
```

---

## Step3：Docker入門（Hello Nginx）

目的：
Nginxのコンテナを起動→アクセス→停止→削除まで体験。

```powershell
Set-Location "$HOME\Documents\docker-k8s-handson-akira2525"
docker rm -f web 2>$null
docker pull nginx
docker run -d --name web -p 8080:80 nginx
docker ps
curl.exe http://localhost:8080/
docker logs web -n 20
docker stop web
docker rm web
docker ps
```

💬 **出れば成功**
「Welcome to nginx!」が返ればOK。

---

## 🧱 Step4：自作アプリをDocker化

### ブロック①：アプリ作成

```powershell
New-Item -ItemType Directory -Path ".\app" -Force | Out-Null

@'
{
  "name": "demo",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": { "start": "node index.js" },
  "dependencies": {
    "express": "^4.19.2",
    "pg": "^8.11.3"
  }
}
'@ | Out-File .\app\package.json -Encoding utf8

@'
const express = require("express");
const { Client } = require("pg");
const app = express();

app.get("/", async (_, res) => {
  try {
    const client = new Client({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "postgres"
    });
    await client.connect();
    const r = await client.query("SELECT 1 as ok");
    await client.end();
    res.send(`OK: ${r.rows[0].ok}`);
  } catch {
    res.status(200).send("Hello from Docker container! (DB未接続でも表示)");
  }
});
app.listen(3000, "0.0.0.0", () => console.log("Server on :3000"));
'@ | Out-File .\app\index.js -Encoding utf8
```

---

### ブロック②：Dockerfile作成

```powershell
@'
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --production
COPY . .
EXPOSE 3000
CMD ["npm","start"]
'@ | Out-File .\app\Dockerfile -Encoding utf8

@'
node_modules
.git
npm-cache
'@ | Out-File .\app\.dockerignore -Encoding utf8
```

---

### ブロック③：ビルド＆起動

```powershell
Set-Location .\app
docker rm -f demo 2>$null
docker build -t demo-app:latest .
docker run -d --name demo -p 3000:3000 demo-app:latest
Start-Sleep -Seconds 2
curl.exe http://localhost:3000/
docker logs demo -n 20
```

💬 **出力例**

```
Server on :3000
Hello from Docker container! (DB未接続でも表示)
```

---

###  ブロック④：Gitへ保存

```powershell
docker rm -f demo
Set-Location ..
git add .
git commit -m "feat(step4): Dockerized Node.js app confirmed working"
git push
```

---

## Step5：Docker Compose（app + Postgres）

```powershell
Set-Location "$HOME\Documents\docker-k8s-handson-akira2525"
docker compose up -d --build
docker compose ps
Start-Sleep -Seconds 8
curl.exe http://localhost:3000/
docker compose logs app -n 80
docker compose exec db pg_isready -U postgres
```

 出力例

* Hello from Docker container!
* accepting connections

**片付け**

```powershell
docker compose down -v
```

---

##  Step6：Kubernetes体験（kind + kubectl）

```powershell
kind create cluster --name demo
kubectl get nodes
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/web
kubectl get pods,svc -o wide
kubectl port-forward svc/web 8080:80
# ← このまま開いておき、別ターミナルで:
curl.exe http://localhost:8080/
```

**片付け**

```powershell
kubectl delete -f k8s/deployment.yaml 2>$null
kind delete cluster --name demo
```

---

##  Step7：.gitignore & Push

```powershell
@'
node_modules/
.env
.DS_Store
'@ | Out-File .gitignore -Encoding UTF8

git add .
git commit -m "feat: dockerfile, compose, k8s demo"
git push
```

---

##  トラブル早見表

| 症状                               | 対処                                            |
| -------------------------------- | --------------------------------------------- |
| `kind` が見つからない                   | PATH未反映。PowerShell再起動 or `scoop install kind` |
| `kubectl get nodes` が `NotReady` | 起動中。30〜90秒待つ                                  |
| `curl` 応答なし                      | port-forwardが閉じている。再実行                        |
| `ImagePullBackOff`               | ネットワーク不安定。再試行                                 |
| `kubectl` エラー                    | クラスタ削除後は正常。`kind get clusters`確認              |

---



