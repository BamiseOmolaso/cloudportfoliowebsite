Day 3 of building a production-grade website like a cloud engineer would: setting up the hosting layer

Every website you visit lives on a physical machine somewhere in the world. In simple terms, this machine is called the server. Someone somewhere has a computer running it. That computer is being paid for, kept cool, plugged in.

As a person trying to build and deploy a website, there are different ways to think about it. If you are trying to build a simple website and ship fast, think of a service like Vercel. In a matter of seconds to minutes, your website is live.

If you are learning to be a cloud engineer, setting up the hosting yourself is what you need to focus on. You learn the building blocks, the failure modes, roll backs, identity and access management, and incorporate Infrastructure as code (IaC).

Think of it like this, Vercel is a food court, you bring the menu (your code), they handle everything else, the building, kitchen and so on. You start serving customers immediately.

Instead, I rented an empty piece of cloud-land from Amazon (AWS) and built the kitchen myself.

What a cloud engineer actually thinks about:
- How the code gets packed into a shippable box (called a container)
- How a manager decides which box should be serving customers right now (a service)
- How the host at the front door decides which box to send to each visitor (a load balancer)
- How the system notices when a box is broken and replaces it automatically (health checks)
- How a new version of the website rolls out without customers seeing any interruptions (rolling deploys)

Docker is the tool you use to package your code and it's dependencies into a self-contained box and can run it anywhere (a laptop, a server, someone else's data centre). No more "but it works on my machine" scenario.

AWS ECS Fargate - Elastic Container Service (ECS) is the manager that decides which box is running right now. Fargate is the parking lot where the boxes live. You pay only for the time the box is open. No servers to babysit, no operating systems to manage like you would with Elastic Compute Cloud (EC2).

Application load balancer - the host at the front door. Every visitor goes through it and it directs them to where they pick their boxes. It also handles the security handshake with the browser.

What I learned: How pieces of a real cloud deployment actually fit together. Containers, orchestrators, load balancers, health checks, rolling deploys - common questions in cloud engineering job interviews.

AWS has it's easy website hosting options too like App Runner, Amplify, Beanstalk - services that hand you a URL in minutes. If you are trying to learn cloud engineering, don't pick the easy options, try to understand what is happening under the hood.

Now you know every website is sitting on a real computer somewhere. Have you ever set one up yourself, or wanted to?

Stay tuned for Day 4 where we see how to set up the access layer.
