Day 5 of building a production-grade website like a cloud engineer would: where the secrets actually live

A real web application carries a handful of secrets that absolutely cannot be in the repo: database credentials, API keys for sending email, the secret that signs admin session tokens, the password for the admin login. Mine has nine of them.

The first mistake everyone makes (including me): put them in a .env file, commit "JWT_SECRET=changeme" with a comment that says "// TODO: change this," go to bed, forget about it. The second mistake: put them as plain environment variables in the deployment config, where anyone with read access to the cloud console can see them.

Back to the kitchen analogy: secrets are the recipes the head chef knows. Don't paste them on the staff bulletin board. Don't write them in the menu. Put them in a locked drawer that only specific people, with a specific key, can open — and re-issue the key on every shift.

Where mine live: AWS Secrets Manager.

There are two secrets in the account:
- omolasowebportfolio/db/credentials — username, password, URL for the RDS database
- omolasowebportfolio/app/secrets — JWT signing key, Resend API key, RECAPTCHA secret, admin email, admin password, Redis URL, contact email, and so on

The flow:
- Terraform creates the secret structure (the secret itself, but the values are operator-supplied via the AWS CLI — never in the .tf files)
- The ECS task definition references each secret by ARN, with a key path like "omolasowebportfolio/app/secrets:JWT_SECRET::" — meaning "read this secret, give me the JWT_SECRET field, no version pinned"
- When ECS starts the container, it fetches the values and injects them as environment variables, in memory, never written to disk
- The container reads them from process.env at startup, then they vanish if the process dies

The IAM piece is the one I got wrong the first time. The ECS task execution role had secretsmanager:GetSecretValue on Resource = "*". That meant if anyone ever stole that role's session credentials, they could read every secret in my AWS account. I scoped it down to just the two ARNs the app actually needs:

Resource = [
  "arn:aws:secretsmanager:us-east-1:...:secret:omolasowebportfolio/db/credentials-*",
  "arn:aws:secretsmanager:us-east-1:...:secret:omolasowebportfolio/app/secrets-*"
]

The trailing "-*" is for the random suffix Secrets Manager appends to every ARN. Without it the policy matches nothing.

What I learned: secrets aren't a checkbox, they are a chain — where they are stored, who can read them, how they get into the running process, who can see them at runtime, what happens when the role is compromised. Each link has to be tight. Most postmortems I read are one weak link in this chain.

The series continues with Day 6 — Infrastructure as Code with Terraform. The thing that turns "30 clicks in the AWS console" into "git clone, terraform apply, done."

Do you scope your secretsmanager IAM by ARN, or just leave it as "*"? Most people start with "*". Few go back.
