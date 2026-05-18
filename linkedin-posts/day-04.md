Day 4 of building a production-grade website like a cloud engineer would: setting up the access layer

Somewhere between writing code and that code running in AWS, a question has to be answered: how does GitHub prove to AWS that it is allowed to deploy your code? How does the running container prove that it is allowed to read your database password?

The lazy answer is to create an AWS user, generate a 40-character access key, paste it into GitHub Secrets, and never look at it again. That key never expires. Anyone who gets it can wear your AWS account like a costume. Rotating it means going around to every place that stores it and changing it everywhere at once. Most people start there. I did.

The better answer is to not have the key at all.

Think of it like a hotel. The old way is the master key — one key that opens every room, forever. If a guest loses it, you have to re-key the whole building. The new way is a keycard issued at the front desk every time you check in. It expires when you check out. If someone finds an old card in the parking lot, it does not open any door.

That is what GitHub OIDC does with AWS.

Here is the conversation, in plain english:
- A GitHub Action starts a job
- It tells AWS: "Hi, I am the workflow named deploy-app, running on branch main, in repo BamiseOmolaso/cloudportfoliowebsite, run number 123. Here is a signed token from GitHub proving it."
- AWS verifies the token against GitHub's public keys (which AWS pre-trusts via an Identity Provider you configure once)
- AWS checks: "Does any of my roles trust this identity?" If yes, it hands back a temporary AWS credential that expires in one hour
- The deploy runs with that credential, then it disappears

Three things this gives you:
- No secret to rotate — there is not one
- No secret to leak — there is not one
- The trust policy can be scoped tightly: "only trust the main branch of this repo," not "trust anyone who has a key"

What I scoped mine to:
- Pushes to main, staging, or develop branches
- Pull requests targeting main (so the PR can run terraform plan as a preview)
- Workflows running inside the named GitHub Environments (production, staging, development)

A fork-push cannot satisfy any of those conditions. The "sub" claim it would carry is "repo:somefork/cloudportfoliowebsite:..." not "repo:BamiseOmolaso/cloudportfoliowebsite:...". The literal string is the security boundary.

What I learned: IAM trust policies sound abstract until you read one as a series of conditions. The sub claim is just a string, and you can match it with wildcards or exact values. Once you see that, OIDC stops feeling like magic and starts feeling like a contract you wrote down.

The series continues with Day 5 — where the actual secrets (DB credentials, API keys, JWT signing key) live and how the running container gets to them without ever seeing them on disk.

Do you still have long-lived AWS keys sitting in any of your repo secrets? When was the last time you rotated them?
