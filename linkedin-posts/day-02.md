Day 2 of building a production-grade website like a cloud engineer would: setting up the database layer

Why I moved from Supabase to AWS RDS

Supabase had most of what i needed available on the basic plan, think of it like the modern shorcut for building a web application. It gives you a database, a login system, file storage and live updates, all bundled together.

In simple terms, think of Supabase like a fully managed restaurant franchise. You get the building, the kitchen, the recipes, the staff, and even the security all set up from the day you sign the lease. Perfect to start serving customers fast.

It's one of the best developer-experience tools out there for shipping fast. My goal wasn't to ship fast but to learn the cloud infrastructure.

Questions I wanted to be able to answer/kitchen terms:

- Where does my database actually live?/where are my ingredients stored?
- Who has network access to it?/who has the key to my back door?
- How does my app authenticate?/how does my staff prove they work for me?
- What happens to my data when something breaks?/what happens if a fridge breaks at 2am?

What I swapped in? Postgres on AWS RDS. Same database from supabase but now i am renting it directly from AWS. I can define the network boundaries, the security group rules, the backup window and connection pool, the way the website opens and reuses connections to the database.

With Prisma ORM, a translator that sits between my code and database. I write in plain language ("get all blog posts") and Prisma generates the actual database query. It's schema-first, type-safe, and keeps a migration history of every change to my database structure that lives in my repo and travels with my code through dev-staging-prod to enable roll backs if something goes wrong.

JWT-based login instead of Supabase's built-in login. Your restauratant backdoor should only allow authorized personnels, and this is exactly what this does. When an admin logs in, the server hands them a signed that the browser carries on future visits and this secret lives in AWS secrets manager.

What is cost: a weekend of setup, with trade of a single AZ deployment to keep costs low, <10-15$, and a pause bash script that drops it to <2$ when it's not in use.

What I learned: how every layer of a database actually works in production. How connection opens and close, , authorization, migration strategies to update the live database without breaking the website. Things I'd never learn if Supabase handled them.

Truly, for those who are still early in the journey, managed platforms are great when shipping speed is the goal, but can be a learning road block. Pick the one that matches what you are trying to achieve.

The series continues with Day 3 - Why I picked the harder cloud option (Moving from Vercel to ECS Fargate)

What's a managed tool you used early on that you eventually outgrew?
