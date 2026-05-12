<!--
This file is a draft of my GitHub *profile* README. To deploy:

  1. Create a new public repo named EXACTLY `BamiseOmolaso` (matching your GitHub username).
  2. Copy the content below (everything after this comment block) into that repo's README.md.
  3. Commit + push. GitHub auto-renders it on your profile page at https://github.com/BamiseOmolaso

  Quick gh CLI version:
    gh repo create BamiseOmolaso --public --description "Profile README" --add-readme
    cd BamiseOmolaso
    # paste content below into README.md
    git add README.md && git commit -m "Initial profile" && git push
-->

<h1 align="center">Hi, I'm Dr. Bamise Omolaso 👋</h1>

<p align="center">
  <strong>Medical doctor → cloud & DevSecOps engineer.</strong><br>
  Building production systems the right way — in public.
</p>

<p align="center">
  <a href="https://portfolio.oluwabamiseomolaso.com.ng"><img src="https://img.shields.io/badge/Portfolio-Live-A855F7?style=for-the-badge" alt="Portfolio"/></a>
  <a href="https://www.linkedin.com/in/dr-bamise-omolaso/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a>
  <a href="https://x.com/devsecops_dr"><img src="https://img.shields.io/badge/X-000000?style=for-the-badge&logo=x&logoColor=white" alt="X"/></a>
  <a href="https://www.youtube.com/@bamiseteachescloud/videos"><img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube"/></a>
  <a href="mailto:davidbams3@gmail.com"><img src="https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white" alt="Email"/></a>
</p>

---

## About

I'm a medical doctor by training, building toward cloud and DevSecOps engineering. My background in healthcare data science taught me to take state, security, and reproducibility seriously — and that's exactly what shows up in the architecture work I focus on now.

I'm currently shipping a production-grade portfolio site **entirely in public** — every commit, every PR, every gotcha — so the work can speak for itself.

## What I'm working on right now

🛠️ **[cloudportfoliowebsite](https://github.com/BamiseOmolaso/cloudportfoliowebsite)** — Next.js + PostgreSQL + Redis on AWS ECS Fargate, fully Terraform-managed across dev/staging/prod, with GitHub Actions OIDC into AWS (no long-lived keys), and a pause/resume mechanism that drops infrastructure cost from ~$250/month to ~$1/month when idle. [Read the architecture →](https://github.com/BamiseOmolaso/cloudportfoliowebsite/blob/main/ARCHITECTURE_GUIDE.md)

📝 **Build-in-public series on [LinkedIn](https://www.linkedin.com/in/dr-bamise-omolaso/)** — one post per day walking through every layer of the stack, including the bugs and 12-commit debugging spirals I shipped along the way.

## How I think about systems

> *If you can't point at a service in your architecture and say which tier it belongs to and why, you don't understand it yet — you just know its name.*

Every web app comes down to three layers — **frontend**, **app**, **database** — wrapped by version control, CI/CD, and infrastructure-as-code. The pattern is older than I am. The tools change. The fundamentals don't.

## Tech I work with

### Languages
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![SQL](https://img.shields.io/badge/SQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Bash](https://img.shields.io/badge/Bash-4EAA25?style=for-the-badge&logo=gnubash&logoColor=white)
![HCL](https://img.shields.io/badge/HCL-7B42BC?style=for-the-badge&logo=terraform&logoColor=white)

### Frontend
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)

### Backend & data
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![REST APIs](https://img.shields.io/badge/REST_APIs-005571?style=for-the-badge)

### Cloud & infrastructure
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazonaws&logoColor=FF9900)
![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

**AWS services I've shipped with:** ECS Fargate · RDS · ALB · ECR · ACM · Secrets Manager · IAM · VPC · CloudWatch · Route 53 · OIDC (GitHub federation)

### Security & quality
- OIDC federation — no long-lived AWS keys in CI/CD
- IAM scoped to specific ARNs — no `Resource = "*"`
- Secrets in AWS Secrets Manager — never in source control
- JWT auth, rate limiting, input sanitization, reCAPTCHA
- DKIM / SPF / DMARC for transactional email deliverability

![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-F7B93E?style=for-the-badge&logo=prettier&logoColor=black)

## GitHub stats

<p align="center">
  <img height="170" src="https://github-readme-stats.vercel.app/api?username=BamiseOmolaso&show_icons=true&theme=tokyonight&hide_border=true&include_all_commits=true" alt="GitHub Stats"/>
  <img height="170" src="https://github-readme-stats.vercel.app/api/top-langs/?username=BamiseOmolaso&layout=compact&theme=tokyonight&hide_border=true&langs_count=8" alt="Top Languages"/>
</p>

## Let's talk

Best for: **cloud engineering / DevSecOps work**, security-conscious systems design, healthcare data science, or trading notes on building in public.

📧 **[davidbams3@gmail.com](mailto:davidbams3@gmail.com)**  ·  💬 **[LinkedIn DMs are open](https://www.linkedin.com/in/dr-bamise-omolaso/)**
